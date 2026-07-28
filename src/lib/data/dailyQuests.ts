import { simpleHash } from '$lib/utils/signing';

export type DailyStatMetric = 'atomsEarned' | 'buildingsPurchased' | 'clicks' | 'powerUpsCollected' | 'protonises' | 'upgradesPurchased';

export interface DailyStats {
	atomsEarned: number;
	buildingsPurchased: number;
	clicks: number;
	dayKey: string;
	powerUpsCollected: number;
	protonises: number;
	/** Frozen at rollover, keyed by quest id. Never recomputed live, see dailyQuests.ts. */
	questTargets: Record<string, number>;
	upgradesPurchased: number;
}

export type DailyQuestAnchors = Record<DailyStatMetric, number>;

export interface DailyQuest {
	description: (target: number) => string;
	/** Absolute floor, so a fresh or freshly-prestiged player never gets a trivial target. */
	floor: number;
	id: string;
	metric: DailyStatMetric;
	/** Multiplier applied to the anchor stat to produce the day's target. */
	reward: number;
	scale: number;
}

export const QUEST_POOL: DailyQuest[] = [
	{
		description: target => `Earn ${target.toLocaleString()} atoms today.`,
		floor: 1_000,
		id: 'atoms_earned',
		metric: 'atomsEarned',
		reward: 1,
		scale: 3_600, // roughly one hour of production at the player's best-ever rate
	},
	{
		description: target => `Purchase ${target} buildings today.`,
		floor: 5,
		id: 'buildings_purchased',
		metric: 'buildingsPurchased',
		reward: 1,
		scale: 1.5,
	},
	{
		description: target => `Click ${target} times today.`,
		floor: 100,
		id: 'clicks_100',
		metric: 'clicks',
		reward: 1,
		scale: 1.2,
	},
	{
		description: target => `Click ${target} times today.`,
		floor: 250,
		id: 'clicks_250',
		metric: 'clicks',
		reward: 1,
		scale: 2,
	},
	{
		description: target => `Collect ${target} power-ups today.`,
		floor: 1,
		id: 'power_ups_collected',
		metric: 'powerUpsCollected',
		reward: 1,
		scale: 1.2,
	},
	{
		description: () => `Protonise at least once today.`,
		floor: 1,
		id: 'protonise_once',
		metric: 'protonises',
		reward: 1,
		scale: 1,
	},
	{
		description: target => `Purchase ${target} upgrades today.`,
		floor: 3,
		id: 'upgrades_purchased',
		metric: 'upgradesPurchased',
		reward: 1,
		scale: 1.3,
	},
];

export function getQuestTarget(quest: DailyQuest, anchors: DailyQuestAnchors): number {
	const raw = anchors[quest.metric] * quest.scale;
	return Math.max(quest.floor, Math.round(raw));
}

/** Deterministic seeded shuffle so the client, the server and the benchmark always agree on a given UTC day. */
export function pickDailyQuests(dayKey: string): DailyQuest[] {
	let seed = simpleHash(dayKey);
	const next = () => {
		// xorshift32, deterministic from the seed above
		seed ^= seed << 13;
		seed ^= seed >>> 17;
		seed ^= seed << 5;
		seed |= 0;
		return (seed >>> 0) / 0xffffffff;
	};

	const shuffled = [...QUEST_POOL];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(next() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	return shuffled.slice(0, 3);
}

export function getDailyCap(quests: DailyQuest[]): number {
	return quests.reduce((sum, quest) => sum + quest.reward, 0);
}
