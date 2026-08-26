/** Turns a simulation result into a compact markdown balance report meant to be pasted into a chat for analysis. */
import { ACHIEVEMENTS } from '$data/achievements';
import { BUILDINGS, BUILDING_TYPES } from '$data/buildings';
import { ALL_PHOTON_UPGRADES } from '$data/photonUpgrades';
import { SKILL_UPGRADES } from '$data/skillTree';
import { UPGRADES } from '$data/upgrades';
import { formatDuration, formatNumber } from '$lib/utils';
import { MILESTONES, type SimulationAction, type SimulationResult, type SimulationSnapshot } from './types';

const CURVE_ROWS = 16;
const STALL_GROWTH = 1.05;
const MAX_STALLS = 6;
const MAX_SPIKES = 8;
const ACHIEVEMENT_TOTAL = Object.keys(ACHIEVEMENTS).length;

function simTime(ms: number): string {
	const h = Math.floor(ms / 3_600_000);
	const m = Math.floor((ms % 3_600_000) / 60_000);
	return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}m`;
}

function mult(value: number): string {
	if (!Number.isFinite(value)) return '∞';
	if (value >= 1000) return `${formatNumber(value)}×`;
	return `${value.toFixed(value < 10 ? 2 : 0)}×`;
}

function pct(value: number): string {
	return `${(value * 100).toFixed(1)}%`;
}

function table(headers: string[], rows: string[][]): string {
	return [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n');
}

/** Family key of an upgrade id: `global_boost_12` -> `global_boost`. */
function familyOf(id: string): string {
	const match = id.match(/^(.*)_(\d+)$/);
	return match ? match[1] : id;
}

function indexOf(id: string): number {
	const match = id.match(/_(\d+)$/);
	return match ? Number(match[1]) : 0;
}

interface FamilyStats {
	bought: Set<string>;
	family: string;
	firstTime: number;
	lastTime: number;
	maxIndex: number;
	total: number;
}

function collectActions(snapshots: SimulationSnapshot[]): SimulationAction[] {
	return snapshots.flatMap(s => s.actions);
}

function buildFamilies(actions: SimulationAction[], catalog: Record<string, unknown>, type: SimulationAction['type']): FamilyStats[] {
	const families = new Map<string, FamilyStats>();
	for (const id of Object.keys(catalog)) {
		const key = familyOf(id);
		const entry = families.get(key) ?? { bought: new Set<string>(), family: key, firstTime: Infinity, lastTime: 0, maxIndex: 0, total: 0 };
		entry.total++;
		families.set(key, entry);
	}

	for (const action of actions) {
		if (action.type !== type || !action.details) continue;
		const entry = families.get(familyOf(action.details));
		if (!entry) continue;
		entry.bought.add(action.details);
		entry.firstTime = Math.min(entry.firstTime, action.timestamp);
		entry.lastTime = Math.max(entry.lastTime, action.timestamp);
		entry.maxIndex = Math.max(entry.maxIndex, indexOf(action.details));
	}

	return [...families.values()]
		.sort((a, b) => a.bought.size / a.total - b.bought.size / b.total || a.family.localeCompare(b.family));
}

/** Families with several entries get a table; one-off upgrades are folded into two inline lists to keep the report short. */
function familySection(families: FamilyStats[]): string {
	const multi = families.filter(f => f.total > 1);
	const singleNever = families.filter(f => f.total === 1 && f.bought.size === 0);
	const singleBought = families.filter(f => f.total === 1 && f.bought.size === 1);

	const parts: string[] = [];
	if (multi.length > 0) {
		parts.push(
			table(
				['family', 'bought', 'highest', 'first', 'last'],
				multi.map(f => [
					`\`${f.family}\``,
					`${f.bought.size}/${f.total}`,
					f.maxIndex > 0 ? `#${f.maxIndex}` : '-',
					Number.isFinite(f.firstTime) ? simTime(f.firstTime) : 'never',
					f.bought.size > 0 ? simTime(f.lastTime) : '-',
				]),
			),
		);
	}
	if (singleNever.length > 0) {
		parts.push(`Never bought (${singleNever.length}): ${singleNever.map(f => `\`${f.family}\``).join(', ')}`);
	}
	if (singleBought.length > 0) {
		parts.push(`Bought (${singleBought.length}): ${singleBought.map(f => `\`${f.family}\` ${simTime(f.firstTime)}`).join(', ')}`);
	}
	return parts.join('\n\n');
}

/** Longest stretches where APS barely moved: the clearest signal of a progression wall. */
function findStalls(snapshots: SimulationSnapshot[]): { end: number; growth: number; start: number }[] {
	const stalls: { end: number; growth: number; start: number }[] = [];
	let anchor = 0;
	for (let i = 1; i < snapshots.length; i++) {
		const growth = snapshots[anchor].atomsPerSecond > 0 ? snapshots[i].atomsPerSecond / snapshots[anchor].atomsPerSecond : Infinity;
		if (growth >= STALL_GROWTH) {
			if (i - anchor > 1) {
				stalls.push({
					end: snapshots[i - 1].timestamp,
					growth: snapshots[anchor].atomsPerSecond > 0 ? snapshots[i - 1].atomsPerSecond / snapshots[anchor].atomsPerSecond : 1,
					start: snapshots[anchor].timestamp,
				});
			}
			anchor = i;
		}
	}
	if (snapshots.length - anchor > 2) {
		const last = snapshots[snapshots.length - 1];
		stalls.push({
			end: last.timestamp,
			growth: snapshots[anchor].atomsPerSecond > 0 ? last.atomsPerSecond / snapshots[anchor].atomsPerSecond : 1,
			start: snapshots[anchor].timestamp,
		});
	}
	return stalls.sort((a, b) => b.end - b.start - (a.end - a.start)).slice(0, MAX_STALLS);
}

function multiplierBreakdown(s: SimulationSnapshot): string {
	const parts: { label: string; value: number }[] = [
		{ label: 'Skills', value: s.globalSkillsMultiplier },
		{ label: 'Flat upgrades (global_boost)', value: s.globalFlatMultiplier },
		{ label: 'Level upgrades (level_boost)', value: s.globalLevelMultiplier },
		{ label: 'Achievement upgrades', value: s.globalAchievementMultiplier },
		{ label: 'Proton boosts', value: s.globalProtonBoostMultiplier },
		{ label: 'Protonise boosts', value: s.globalProtoniseMultiplier },
		{ label: 'Radiation', value: s.radiationMultiplier },
		{ label: 'Stability', value: s.stabilityMultiplier },
		{ label: 'Power-up bonus', value: s.bonusMultiplier },
		{ label: 'Atoms currency boost', value: s.atomsCurrencyBoost },
	];
	const totalLog = parts.reduce((sum, p) => sum + (p.value > 1 ? Math.log(p.value) : 0), 0);
	return table(
		['source', 'value', 'log share'],
		parts
			.sort((a, b) => b.value - a.value)
			.map(p => [p.label, mult(p.value), totalLog > 0 && p.value > 1 ? pct(Math.log(p.value) / totalLog) : '-']),
	);
}

function buildingTable(s: SimulationSnapshot): string {
	const totalProduction = BUILDING_TYPES.reduce((sum, t) => sum + (s.buildingProductions[t] ?? 0), 0);
	return table(
		['building', 'count', 'APS', 'share', 'upgrade ×', 'level ×'],
		BUILDING_TYPES.map(type => {
			const production = s.buildingProductions[type] ?? 0;
			return [
				BUILDINGS[type].name,
				`${s.buildings[type] ?? 0}`,
				formatNumber(production),
				totalProduction > 0 ? pct(production / totalProduction) : '-',
				mult(s.buildingUpgradeFactors[type] ?? 1),
				mult(s.buildingLevelFactors[type] ?? 1),
			];
		}),
	);
}

function curveTable(snapshots: SimulationSnapshot[]): string {
	const step = Math.max(1, Math.ceil(snapshots.length / CURVE_ROWS));
	const sampled = snapshots.filter((_, i) => i % step === 0 || i === snapshots.length - 1);
	return table(
		['t', 'atoms', 'APS', 'APC', 'global ×', 'bldgs', 'upg', 'ach', 'lvl', 'protons', 'electrons'],
		sampled.map(s => [
			simTime(s.timestamp),
			formatNumber(s.atoms),
			formatNumber(s.atomsPerSecond),
			formatNumber(s.atomsPerClick),
			mult(s.globalMultiplier),
			`${s.totalBuildings}`,
			`${s.upgrades}`,
			`${s.achievements}`,
			`${s.playerLevel}`,
			formatNumber(s.protons),
			formatNumber(s.electrons),
		]),
	);
}

export function buildMarkdownReport(result: SimulationResult): string {
	const { config, snapshots } = result;
	const final = snapshots.at(-1);
	if (!final) return '# Atom Clicker Benchmark\n\nNo snapshot recorded.';

	const actions = collectActions(snapshots);
	const reachedIds = new Set(result.milestones.map(m => m.milestone.id));
	const missing = MILESTONES.filter(m => !reachedIds.has(m.id));
	const stalls = findStalls(snapshots);
	const totalActions = actions.length;
	const actionsByType = new Map<string, number>();
	for (const action of actions) actionsByType.set(action.type, (actionsByType.get(action.type) ?? 0) + 1);

	const lines: string[] = [];

	lines.push('# Atom Clicker Benchmark');
	lines.push('');
	lines.push(`Run: **${config.name}** · ${config.targetHours}h simulated${result.cancelled ? ' (cancelled early)' : ''}`);
	lines.push('');
	lines.push(
		table(
			['setting', 'value'],
			[
				['tick rate', `${config.tickRate} ms`],
				['snapshot interval', `${config.snapshotInterval} s`],
				['clicks/s', `${config.botBehavior.clicksPerSecond}`],
				['buy strategy', config.botBehavior.buyStrategy],
				['game knowledge', `${config.botBehavior.gameKnowledge}`],
				['activity', config.botBehavior.activityPattern
					? `${config.botBehavior.activityPattern.activeMinutes}m on / ${config.botBehavior.activityPattern.inactiveMinutes}m off`
					: 'always active'],
				['max actions/tick', `${config.botBehavior.maxActionsPerTick ?? 'unlimited'}`],
				['max prestiges/window', `${config.botBehavior.maxPrestigesPerActiveWindow ?? 'unlimited'}`],
				['quests', config.botBehavior.questBehavior],
				['protonise threshold', `${config.prestigeStrategy.protoniseThreshold}`],
				['electronize threshold', `${config.prestigeStrategy.electronizeThreshold}`],
				['wall clock', formatDuration(result.durationMs)],
			],
		),
	);

	lines.push('');
	lines.push('## Final state');
	lines.push('');
	lines.push(
		table(
			['stat', 'value', 'stat', 'value'],
			[
				['atoms', formatNumber(final.atoms), 'APS', `${formatNumber(final.atomsPerSecond)}/s`],
				['APC', formatNumber(final.atomsPerClick), 'global ×', mult(final.globalMultiplier)],
				['protons', formatNumber(final.protons), 'electrons', formatNumber(final.electrons)],
				['photons', formatNumber(final.photons), 'quarks', formatNumber(final.quarks ?? 0)],
				['protonises', `${final.protonises}`, 'electronizes', `${final.electronizes}`],
				['player level', `${final.playerLevel}`, 'total XP', formatNumber(final.totalXP)],
				['buildings', `${final.totalBuildings}`, 'building levels', `${final.buildingLevels}`],
				['upgrades owned', `${final.upgrades}`, 'upgrades all-time', `${final.totalUpgrades}`],
				['skills', `${final.skills}`, 'boost points spent', `${final.skillPointsUsed}`],
				['achievements', `${final.achievements}/${ACHIEVEMENT_TOTAL}`, 'photon upgrade levels', `${final.photonUpgradeLevels}`],
				['clicks', formatNumber(final.clicks), 'actions', `${totalActions}`],
			],
		),
	);

	lines.push('');
	lines.push('## Growth curve');
	lines.push('');
	lines.push(curveTable(snapshots));

	lines.push('');
	lines.push('## Milestones');
	lines.push('');
	lines.push(
		`Reached ${result.milestones.length}/${MILESTONES.length}: ` +
			(result.milestones.length > 0
				? result.milestones.map(m => `${m.milestone.name} \`${simTime(m.timeReached)}\``).join(', ')
				: 'none'),
	);
	lines.push('');
	lines.push(`Never reached (${missing.length}): ${missing.length > 0 ? missing.map(m => m.name).join(', ') : 'none'}`);

	if (stalls.length > 0) {
		lines.push('');
		lines.push('## APS stalls & regressions');
		lines.push('');
		lines.push(`Stretches where APS grew less than ${mult(STALL_GROWTH)}. Growth below 1× means a prestige reset the run and it never caught back up.`);
		lines.push('');
		lines.push(
			table(
				['from', 'to', 'duration', 'APS growth'],
				stalls.map(s => [simTime(s.start), simTime(s.end), simTime(s.end - s.start), mult(s.growth)]),
			),
		);
	}

	lines.push('');
	lines.push('## Multiplier sources (final)');
	lines.push('');
	lines.push(multiplierBreakdown(final));

	lines.push('');
	lines.push('## Upgrade families');
	lines.push('');
	lines.push('Sorted by completion, least bought first. A family at 0 is content the run never touched.');
	lines.push('');
	lines.push('### Atom upgrades');
	lines.push('');
	lines.push(familySection(buildFamilies(actions, UPGRADES, 'upgrade')));
	lines.push('');
	lines.push('### Skills');
	lines.push('');
	lines.push(familySection(buildFamilies(actions, SKILL_UPGRADES, 'skill')));
	lines.push('');
	lines.push('### Photon upgrades');
	lines.push('');
	lines.push(familySection(buildFamilies(actions, ALL_PHOTON_UPGRADES, 'photon_upgrade')));

	lines.push('');
	lines.push('## Upgrade group contributions (final)');
	lines.push('');
	lines.push(
		table(
			['group', 'per-entry values'],
			[
				['global_boost tiers (10 each)', final.groupContributions.globalBoostTiers.map(mult).join(' ')],
				['level_boost_1..10', final.groupContributions.levelBoost.map(mult).join(' ')],
				['achievement_mul_1..11', final.groupContributions.achievementMul.map(mult).join(' ')],
				['proton_boost_1..10', final.groupContributions.protonBoost.map(mult).join(' ')],
				['protonise_boost_1..5', final.groupContributions.protoniseBoost.map(mult).join(' ')],
			],
		),
	);

	lines.push('');
	lines.push('## Buildings (final)');
	lines.push('');
	lines.push(buildingTable(final));

	lines.push('');
	lines.push('## Actions');
	lines.push('');
	lines.push(
		[...actionsByType.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([type, count]) => `${type}: ${count}`)
			.join(' · '),
	);

	if (result.spikes.length > 0) {
		lines.push('');
		lines.push('## Action spikes');
		lines.push('');
		lines.push(
			table(
				['t', 'peak/min', 'avg/min', 'APS jump', 'top actions'],
				result.spikes.slice(0, MAX_SPIKES).map(spike => {
					const counts = new Map<string, number>();
					for (const action of spike.actions) {
						const key = `${action.type}:${action.details?.split(' ')[0] ?? ''}`;
						counts.set(key, (counts.get(key) ?? 0) + 1);
					}
					const top = [...counts.entries()]
						.sort((a, b) => b[1] - a[1])
						.slice(0, 5)
						.map(([key, count]) => `${key}×${count}`)
						.join(', ');
					return [
						simTime(spike.timestamp),
						spike.peakRatePerMin.toFixed(0),
						spike.avgRatePerMin.toFixed(1),
						`${formatNumber(spike.apsStart)} → ${formatNumber(spike.apsEnd)}`,
						top,
					];
				}),
			),
		);
	}

	lines.push('');
	lines.push('## Quests & quarks');
	lines.push('');
	lines.push(
		table(
			['stat', 'value'],
			[
				['quests offered', `${final.questsOfferedTotal ?? 0}`],
				['quests completed', `${final.questsCompletedTotal ?? 0}`],
				['completion rate', (final.questsOfferedTotal ?? 0) > 0 ? pct((final.questsCompletedTotal ?? 0) / (final.questsOfferedTotal ?? 1)) : '-'],
				['quarks from quests', formatNumber(final.quarksFromQuests ?? 0)],
				['quarks from achievements', formatNumber(final.quarksFromAchievements ?? 0)],
			],
		),
	);

	lines.push('');
	return lines.join('\n');
}
