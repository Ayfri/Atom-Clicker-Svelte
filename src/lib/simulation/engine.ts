/** Headless simulation engine (chunked with scheduler.yield). */
import { ACHIEVEMENTS } from '$data/achievements';
import { BUILDINGS, BUILDING_TYPES, type BuildingType } from '$data/buildings';
import { CurrenciesTypes, type CurrencyName } from '$data/currencies';
import { type DailyQuest, type DailyQuestAnchors, getDailyCap, getQuestTarget, pickDailyQuests } from '$data/dailyQuests';
import { ALL_PHOTON_UPGRADES, getPhotonUpgradeCost } from '$data/photonUpgrades';
import { POWER_UPS } from '$data/powerUp';
import { QUARK_ACHIEVEMENT_REWARD } from '$data/quarkAchievements';
import { RADIATION_UPGRADES, getRadiationUpgradePrice } from '$data/radiationUpgrades';
import { RealmTypes } from '$data/realms';
import { SKILL_UPGRADES } from '$data/skillTree';
import { UPGRADES } from '$data/upgrades';
import { currenciesManager } from '$helpers/CurrenciesManager.svelte';
import { foldEffects } from '$helpers/effects';
import { gameManager } from '$helpers/GameManager.svelte';
import { radiationManager } from '$helpers/RadiationManager.svelte';
import {
	MILESTONES,
	MILESTONE_CHECKS,
	type BenchmarkConfig,
	type MilestoneDefinition,
	type MilestoneCheckData,
	type MilestoneHit,
	type SimulationAction,
	type SimulationResult,
	type SimulationSnapshot,
	type SpikeEvent,
} from './types';

const CHUNK_SIZE = 500;
const YIELD_INTERVAL = 10;

const ACHIEVEMENT_ENTRIES = Object.entries(ACHIEVEMENTS);
// Costs are static, so scanning cost-ascending lets the "cheapest affordable" searches stop at their first match.
const UPGRADE_ENTRIES = Object.entries(UPGRADES).sort(([, a], [, b]) => a.cost.amount - b.cost.amount);
const SKILL_ENTRIES = Object.entries(SKILL_UPGRADES).sort(([, a], [, b]) => a.cost.amount - b.cost.amount);
const PHOTON_UPGRADE_ENTRIES = Object.entries(ALL_PHOTON_UPGRADES);
const RADIATION_UPGRADE_ENTRIES = Object.entries(RADIATION_UPGRADES);
const MILESTONE_ENTRIES: { check: (s: MilestoneCheckData) => boolean; milestone: MilestoneDefinition }[] = MILESTONES
	.filter(milestone => milestone.id in MILESTONE_CHECKS)
	.map(milestone => ({ check: MILESTONE_CHECKS[milestone.id], milestone }));

/** Progress state of a running simulation. */
export interface SimulationProgress {
	currentHour: number;
	estimatedTimeLeft: number;
	milestoneCount: number;
	percent: number;
	recentMilestones: MilestoneHit[];
	recentSpikes: SpikeEvent[];
	snapshots: SimulationSnapshot[];
	ticksPerSecond: number;
	totalHours: number;
}

export type ProgressCallback = (progress: SimulationProgress) => void;

// Yields to main thread so UI stays responsive; uses scheduler.yield when available.
const schedulerYield = (globalThis as any).scheduler?.yield as (() => Promise<void>) | undefined;
const yieldToMain: () => Promise<void> =
	typeof schedulerYield === 'function'
		? () => schedulerYield.call((globalThis as any).scheduler)
		: () => new Promise(resolve => setTimeout(resolve, 0));

const SPIKE_WINDOW_MS = 60_000;
const SPIKE_MIN_HISTORY = 5;
const SPIKE_MULTIPLIER = 4;
const SPIKE_MIN_RATE = 50;

export class SimulationEngine {
	private abortController: AbortController | null = null;
	private actions: SimulationAction[] = [];
	private activeNow = false;
	private cachedSkillsRef: string[] | null = null;
	private cachedSkillsSet = new Set<string>();
	private cachedUpgradesRef: string[] | null = null;
	private cachedUpgradesSet = new Set<string>();
	private config: BenchmarkConfig;
	private everPurchasedBuildings = new Set<string>();
	private ownedAchievements = new Set<string>();
	private pendingMilestones = MILESTONE_ENTRIES;
	private lastWasActive = false;
	private milestones: MilestoneHit[] = [];
	private nextPowerUpTime = 0;
	private powerUpCounter = 0;
	private prestigesThisActiveWindow = 0;
	private quarks = 0;
	private quarksFromAchievements = 0;
	private quarksFromQuests = 0;
	private questsCompletedToday = 0;
	private questsCompletedTotal = 0;
	private questsOfferedTotal = 0;
	private recentMilestones: MilestoneHit[] = [];
	private recentSpikes: SpikeEvent[] = [];
	private savedState: string | null = null;
	private simDayIndex = -1;
	private simQuestTargets: Record<string, number> = {};
	private simQuests: DailyQuest[] = [];
	private snapshots: SimulationSnapshot[] = [];
	private spikeRateHistory: number[] = [];
	private spikes: SpikeEvent[] = [];
	private spikeWindowActions: SimulationAction[] = [];
	private spikeWindowAps = 0;
	private spikeWindowStart = 0;

	constructor(config: BenchmarkConfig) {
		this.config = config;
	}

	cancel() {
		this.abortController?.abort();
	}

	async runAsync(onProgress?: ProgressCallback): Promise<SimulationResult> {
		this.abortController = new AbortController();
		const { signal } = this.abortController;

		const startRealTime = performance.now();
		// Simulation mutates global game state; save and restore so main game is unchanged.
		this.savedState = JSON.stringify(gameManager.getCurrentState());
		gameManager.resetAll();
		currenciesManager.hardReset();

		// A real engaged player turns auto-click on as soon as upgrades unlock it; the derived returns 0 if no upgrade.
		if (!gameManager.settings.automation.autoClick) gameManager.toggleAutoClick();
		if (!gameManager.settings.automation.autoClickPhotons) gameManager.toggleAutoClickPhotons();
		this.actions = [];
		this.activeNow = false;
		this.cachedSkillsRef = null;
		this.cachedUpgradesRef = null;
		this.everPurchasedBuildings.clear();
		this.ownedAchievements = new Set(gameManager.achievements);
		this.pendingMilestones = MILESTONE_ENTRIES;
		this.lastWasActive = false;
		this.milestones = [];
		this.nextPowerUpTime = this.rollPowerUpInterval();
		this.powerUpCounter = 0;
		this.prestigesThisActiveWindow = 0;
		this.quarks = 0;
		this.quarksFromAchievements = 0;
		this.quarksFromQuests = 0;
		this.questsCompletedToday = 0;
		this.questsCompletedTotal = 0;
		this.questsOfferedTotal = 0;
		this.recentMilestones = [];
		this.recentSpikes = [];
		this.simDayIndex = -1;
		this.simQuestTargets = {};
		this.simQuests = [];
		this.snapshots = [];
		this.spikeRateHistory = [];
		this.spikes = [];
		this.spikeWindowActions = [];
		this.spikeWindowAps = gameManager.atomsPerSecond;
		this.spikeWindowStart = 0;

		const totalGameTimeMs = this.config.targetHours * 3600 * 1000;
		const totalTicks = Math.floor(totalGameTimeMs / this.config.tickRate);
		const snapshotIntervalTicks = Math.floor((this.config.snapshotInterval * 1000) / this.config.tickRate);
		// Scale check intervals to simulated time: achievements every ~1s, milestones every ~5s.
		const achievementCheckInterval = Math.max(1, Math.round(1000 / this.config.tickRate));
		const milestoneCheckInterval = Math.max(1, Math.round(5000 / this.config.tickRate));
		this.takeSnapshot();

		let lastProgressUpdate = startRealTime;
		let ticksSinceLastUpdate = 0;
		let lastTicksPerSecond = 0;
		let cancelled = false;
		const tickRate = this.config.tickRate;

		try {
			for (let tick = 0; tick < totalTicks; tick++) {
				if (tick % YIELD_INTERVAL === 0) {
					await yieldToMain();
					if (signal.aborted) {
						cancelled = true;
						break;
					}
				}
				gameManager.tick(tickRate, true);
				const activeNow = this.isInActiveWindow();
				this.activeNow = activeNow;
				this.simulateClicks();
				this.simulatePhotonRealmClicks();
				this.tickPowerUps();
				this.checkQuestDayRollover();
				if (activeNow && !this.lastWasActive) {
					this.prestigesThisActiveWindow = 0;
				}
				this.lastWasActive = activeNow;
				if (activeNow) {
					this.executeBotBehavior();
					this.steerDedicatedQuests();
				}
				this.flushSpikeWindowIfNeeded();
				if (tick % achievementCheckInterval === 0) {
					this.checkAchievements();
				}
				if (tick % milestoneCheckInterval === 0) {
					this.checkMilestones();
				}

				if ((tick + 1) % snapshotIntervalTicks === 0) {
					this.takeSnapshot();
				}

				ticksSinceLastUpdate++;
				if (tick % CHUNK_SIZE === 0 && tick > 0) {
					const now = performance.now();
					const elapsed = now - lastProgressUpdate;

					if (elapsed > 0) {
						lastTicksPerSecond = (ticksSinceLastUpdate / elapsed) * 1000;
					}

					const remainingTicks = totalTicks - tick;
					const estimatedTimeLeft = lastTicksPerSecond > 0 ? (remainingTicks / lastTicksPerSecond) * 1000 : 0;

					onProgress?.({
						currentHour: gameManager.inGameTime / (3600 * 1000),
						estimatedTimeLeft,
						milestoneCount: this.milestones.length,
						percent: (tick / totalTicks) * 100,
						recentMilestones: [...this.recentMilestones],
						recentSpikes: [...this.recentSpikes],
						snapshots: this.snapshots,
						ticksPerSecond: lastTicksPerSecond,
						totalHours: this.config.targetHours,
					});

					this.recentMilestones = [];
					this.recentSpikes = [];
					lastProgressUpdate = now;
					ticksSinceLastUpdate = 0;
				}
			}

			if (this.simDayIndex !== -1) {
				this.settleQuestDay();
			}
			if (!cancelled) {
				this.takeSnapshot();
			}
		} finally {
			// Restore main game state after simulation (see savedState at start of runAsync).
			if (this.savedState) {
				const originalState = JSON.parse(this.savedState);
				gameManager.loadSaveData(originalState);
			}
		}

		const durationMs = performance.now() - startRealTime;

		return {
			cancelled,
			config: this.config,
			durationMs,
			milestones: this.milestones,
			snapshots: this.snapshots,
			spikes: this.spikes,
		};
	}

	private flushSpikeWindowIfNeeded() {
		const simTime = gameManager.inGameTime;
		if (simTime - this.spikeWindowStart < SPIKE_WINDOW_MS) return;

		const windowDurationMs = simTime - this.spikeWindowStart;
		const ratePerMin = (this.spikeWindowActions.length / windowDurationMs) * 60_000;

		if (this.spikeRateHistory.length >= SPIKE_MIN_HISTORY && ratePerMin >= SPIKE_MIN_RATE) {
			const recentHistory = this.spikeRateHistory.slice(-SPIKE_MIN_HISTORY);
			const avgRate = recentHistory.reduce((a, b) => a + b, 0) / recentHistory.length;
			if (avgRate > 0 && ratePerMin > avgRate * SPIKE_MULTIPLIER) {
				const spike: SpikeEvent = {
					actions: [...this.spikeWindowActions],
					apsEnd: gameManager.atomsPerSecond,
					apsStart: this.spikeWindowAps,
					avgRatePerMin: avgRate,
					peakRatePerMin: ratePerMin,
					timestamp: this.spikeWindowStart,
				};
				this.spikes.push(spike);
				this.recentSpikes.push(spike);
			}
		}

		this.spikeRateHistory.push(ratePerMin);
		this.spikeWindowActions = [];
		this.spikeWindowAps = gameManager.atomsPerSecond;
		this.spikeWindowStart = simTime;
	}

	private pushAction(action: SimulationAction) {
		this.actions.push(action);
		this.spikeWindowActions.push(action);
	}

	private checkAchievements() {
		const owned = this.ownedAchievements;
		const newlyEarned: string[] = [];

		for (const [id, achievement] of ACHIEVEMENT_ENTRIES) {
			if (owned.has(id)) continue;
			try {
				if (achievement.condition(gameManager)) {
					owned.add(id);
					newlyEarned.push(id);
					this.pushAction({
						details: achievement.name,
						timestamp: gameManager.inGameTime,
						type: 'achievement',
					});
				}
			} catch {
				// Some achievement conditions throw in simulation (e.g. DOM / optional deps).
			}
		}

		if (newlyEarned.length > 0) {
			gameManager.achievements = [...gameManager.achievements, ...newlyEarned];
			// Every achievement grants a flat reward, see quarkAchievements.ts.
			const reward = newlyEarned.length * QUARK_ACHIEVEMENT_REWARD;
			this.quarksFromAchievements += reward;
			this.quarks += reward;
		}
	}

	private questAnchors(): DailyQuestAnchors {
		return {
			achievementsUnlocked: 0,
			atomsEarned: gameManager.highestAPS,
			buildingsPurchased: 0,
			clicks: 0,
			electronizes: 0,
			higgsBosonsCollected: 0,
			otherDailyQuestsCompleted: 0,
			powerUpsCollected: 0,
			protonises: 0,
			upgradesPurchased: 0,
		};
	}

	/** Synthetic, deterministic day keys keep two runs of the same config reproducible. */
	private checkQuestDayRollover() {
		const dayIndex = Math.floor(gameManager.inGameTime / (24 * 3600 * 1000));
		if (dayIndex === this.simDayIndex) return;

		if (this.simDayIndex !== -1) {
			this.settleQuestDay();
		}

		this.simDayIndex = dayIndex;
		this.simQuests = pickDailyQuests(`sim-${dayIndex}`);
		this.simQuestTargets = {};
		const anchors = this.questAnchors();
		for (const quest of this.simQuests) {
			this.simQuestTargets[quest.id] = getQuestTarget(quest, anchors);
		}
		this.questsOfferedTotal += this.simQuests.length;

		gameManager.dailyStats = {
			achievementsUnlocked: 0,
			atomsEarned: 0,
			buildingsPurchased: 0,
			clicks: 0,
			dayKey: `sim-${dayIndex}`,
			electronizes: 0,
			higgsBosonsCollected: 0,
			otherDailyQuestsCompleted: 0,
			powerUpsCollected: 0,
			protonises: 0,
			questIds: this.simQuests.map(quest => quest.id),
			questTargets: this.simQuestTargets,
			upgradesPurchased: 0,
		};
	}

	/** Evaluates the day that just ended: completion is measured for every archetype, claiming is gated by questBehavior. */
	private settleQuestDay() {
		const cap = getDailyCap(this.simQuests);
		let grantedToday = 0;
		let completedToday = 0;

		for (const quest of this.simQuests) {
			const target = this.simQuestTargets[quest.id] ?? quest.floor;
			const progress = gameManager.dailyStats[quest.metric] ?? 0;
			const metTarget = progress >= target;
			if (!metTarget) continue;

			completedToday += 1;
			this.questsCompletedTotal += 1;

			if (this.config.botBehavior.questBehavior === 'ignore') continue;
			if (grantedToday + quest.reward > cap) continue;
			grantedToday += quest.reward;
			this.quarksFromQuests += quest.reward;
			this.quarks += quest.reward;
		}

		this.questsCompletedToday = completedToday;
	}

	/** 'dedicated' bots grind out the last stretch of a close-but-incomplete click quest instead of leaving it on the table. */
	private steerDedicatedQuests() {
		if (this.config.botBehavior.questBehavior !== 'dedicated') return;
		if (this.simDayIndex === -1) return;

		const dayLengthMs = 24 * 3600 * 1000;
		const dayProgress = (gameManager.inGameTime % dayLengthMs) / dayLengthMs;
		if (dayProgress < 0.7) return;

		for (const quest of this.simQuests) {
			if (quest.metric !== 'clicks') continue;
			const target = this.simQuestTargets[quest.id] ?? quest.floor;
			if (gameManager.dailyStats.clicks >= target) continue;
			gameManager.dailyStats = { ...gameManager.dailyStats, clicks: gameManager.dailyStats.clicks + 5 };
		}
	}

	private checkMilestones() {
		const pending = this.pendingMilestones;
		if (pending.length === 0) return;

		const snapshot = this.createMilestoneData();
		let stillPending: typeof pending | null = null;

		for (let i = 0; i < pending.length; i++) {
			const entry = pending[i];
			if (!entry.check(snapshot)) {
				stillPending?.push(entry);
				continue;
			}
			if (!stillPending) stillPending = pending.slice(0, i);
			const hit: MilestoneHit = {
				dayReached: snapshot.dayNumber,
				milestone: entry.milestone,
				timeReached: snapshot.timestamp,
			};
			this.milestones.push(hit);
			this.recentMilestones.push(hit);
		}

		if (stillPending) this.pendingMilestones = stillPending;
	}

	/** Milestone predicates only read a handful of counters, so the between-snapshot check skips the full snapshot build. */
	private createMilestoneData(): MilestoneCheckData {
		let totalBuildings = 0;
		for (const type of BUILDING_TYPES) totalBuildings += gameManager.buildings[type]?.count ?? 0;

		let photonUpgradeLevels = 0;
		for (const level of Object.values(gameManager.photonUpgrades || {})) photonUpgradeLevels += level || 0;

		let skillPointsUsed = 0;
		for (const points of Object.values(gameManager.skillPointBoosts || {})) skillPointsUsed += points ?? 0;

		return {
			achievements: gameManager.achievements.length,
			atoms: currenciesManager.getAmount(CurrenciesTypes.ATOMS),
			atomsPerSecond: gameManager.atomsPerSecond,
			buildingsEverPurchased: [...this.everPurchasedBuildings],
			dayNumber: gameManager.inGameTime / (24 * 3600 * 1000),
			electronizes: gameManager.totalElectronizesAllTime,
			electrons: currenciesManager.getAmount(CurrenciesTypes.ELECTRONS),
			photonUpgradeLevels,
			playerLevel: gameManager.getLevelFromTotalXP(gameManager.totalXP),
			protonises: gameManager.totalProtonisesAllTime,
			protons: currenciesManager.getAmount(CurrenciesTypes.PROTONS),
			quarks: this.quarks,
			skillPointsUsed,
			skills: gameManager.skillUpgrades.length,
			timestamp: gameManager.inGameTime,
			totalBuildings,
			upgrades: gameManager.upgrades.length,
		};
	}

	private createSnapshotData(): SimulationSnapshot {
		const effectSources = gameManager.allEffectSources;
		const buildings: Record<BuildingType, number> = {} as Record<BuildingType, number>;
		const buildingLevelFactors: Partial<Record<BuildingType, number>> = {};
		const buildingUpgradeFactors: Partial<Record<BuildingType, number>> = {};
		let totalBuildings = 0;
		let buildingLevels = 0;

		for (const type of BUILDING_TYPES) {
			const building = gameManager.buildings[type];
			const count = building?.count ?? 0;
			buildings[type] = count;
			totalBuildings += count;
			buildingLevels += building?.level ?? 0;

			if (building && count > 0) {
				const options = { target: type, type: 'building' as const };
				const effectiveRate = foldEffects(effectSources, gameManager, building.rate, options);
				buildingUpgradeFactors[type] = effectiveRate / building.rate;

				const oldMultiplier = Math.pow(count / 2, building.level + 1) / 5;
				const linearMultiplier = (building.level + 1) * 100;
				buildingLevelFactors[type] = building.level > 0 ? Math.sqrt(oldMultiplier * linearMultiplier) : 1;
			}
		}

		// Count photon upgrade levels
		const photonUpgradeLevels = Object.values(gameManager.photonUpgrades || {}).reduce((sum, level) => sum + (level || 0), 0);
		const skillPointsUsed = Object.values(gameManager.skillPointBoosts || {}).reduce((sum, points) => sum + (points ?? 0), 0);
		const playerLevel = gameManager.getLevelFromTotalXP(gameManager.totalXP);
		const radiationMultiplier = gameManager.radiationMultiplier;
		const baseGlobalMultiplier = radiationMultiplier > 0 ? gameManager.globalMultiplier / radiationMultiplier : gameManager.globalMultiplier;

		const globalOptions = { type: 'global' as const };
		// One pass over the effect sources; each group used to filter the whole list on its own.
		const skillSources: typeof effectSources = [];
		const flatSources: typeof effectSources = [];
		const achievementSources: typeof effectSources = [];
		const levelSources: typeof effectSources = [];
		const protonBoostSources: typeof effectSources = [];
		const protoniseSources: typeof effectSources = [];

		for (const source of effectSources) {
			const id = source.id;
			if (id in SKILL_UPGRADES) skillSources.push(source);
			if (id.startsWith('global_boost_')) flatSources.push(source);
			else if (id.startsWith('global_achievements_mul_')) achievementSources.push(source);
			else if (id.startsWith('level_boost_')) levelSources.push(source);
			else if (id.startsWith('proton_boost_')) protonBoostSources.push(source);
			else if (id.startsWith('protonise_boost_')) protoniseSources.push(source);
		}

		const globalSkillsMultiplier = foldEffects(skillSources, gameManager, 1, globalOptions);
		const globalFlatMultiplier = foldEffects(flatSources, gameManager, 1, globalOptions);
		const globalAchievementMultiplier = foldEffects(achievementSources, gameManager, 1, globalOptions);
		const globalLevelMultiplier = foldEffects(levelSources, gameManager, 1, globalOptions);
		const globalProtonBoostMultiplier = foldEffects(protonBoostSources, gameManager, 1, globalOptions);
		const globalProtoniseMultiplier = foldEffects(protoniseSources, gameManager, 1, globalOptions);

		let levelBoostCount = 0;
		const ownedUpgrades = new Set<string>();
		for (const id of gameManager.upgrades) {
			ownedUpgrades.add(id);
			if (id.startsWith('level_boost_')) levelBoostCount++;
		}

		const getUpgradeContribution = (id: string): number => {
			if (!ownedUpgrades.has(id)) return 1;
			const upgrade = UPGRADES[id];
			if (!upgrade) return 1;
			const globalEffect = upgrade.effects.find(e => e.type === 'global');
			if (!globalEffect) return 1;
			return globalEffect.apply(1, gameManager);
		};

		const computeGroupContributions = (prefix: string, count: number): number[] =>
			Array.from({ length: count }, (_, i) => getUpgradeContribution(`${prefix}_${i + 1}`));

		const globalBoostRaw = computeGroupContributions('global_boost', 50);
		const globalBoostTiers = Array.from({ length: 5 }, (_, tier) =>
			globalBoostRaw.slice(tier * 10, tier * 10 + 10).reduce((acc, v) => acc * v, 1),
		);

		const groupContributions = {
			achievementMul: computeGroupContributions('global_achievements_mul', 11),
			globalBoostTiers,
			levelBoost: computeGroupContributions('level_boost', 10),
			protonBoost: computeGroupContributions('proton_boost', 10),
			protoniseBoost: computeGroupContributions('protonise_boost', 5),
		};

		return {
			achievements: gameManager.achievements.length,
			actions: [...this.actions],
			atoms: currenciesManager.getAmount(CurrenciesTypes.ATOMS),
			atomsCurrencyBoost: gameManager.getCurrencyBoostMultiplier(CurrenciesTypes.ATOMS),
			atomsPerClick: gameManager.clickPower,
			atomsPerSecond: gameManager.atomsPerSecond,
			baseGlobalMultiplier,
			bonusMultiplier: gameManager.bonusMultiplier,
			buildingLevelFactors,
			buildingLevels,
			buildingProductions: { ...gameManager.buildingProductions },
			buildingUpgradeFactors,
			buildings,
			buildingsEverPurchased: [...this.everPurchasedBuildings],
			buildingsPurchased: gameManager.totalBuildingsPurchasedAllTime,
			clicks: gameManager.totalClicksAllTime,
			dayNumber: gameManager.inGameTime / (24 * 3600 * 1000),
			electrons: currenciesManager.getAmount(CurrenciesTypes.ELECTRONS),
			electronizes: gameManager.totalElectronizesAllTime,
			globalAchievementMultiplier,
			globalFlatMultiplier,
			globalLevelMultiplier,
			globalMultiplier: gameManager.globalMultiplier,
			globalProtonBoostMultiplier,
			globalProtoniseMultiplier,
			globalSkillsMultiplier,
			groupContributions,
			levelBoostCount,
			photons: currenciesManager.getAmount(CurrenciesTypes.PHOTONS),
			photonUpgradeLevels,
			playerLevel,
			protons: currenciesManager.getAmount(CurrenciesTypes.PROTONS),
			protonises: gameManager.totalProtonisesAllTime,
			quarks: this.quarks,
			quarksFromAchievements: this.quarksFromAchievements,
			quarksFromQuests: this.quarksFromQuests,
			questsCompletedToday: this.questsCompletedToday,
			questsCompletedTotal: this.questsCompletedTotal,
			questsOfferedTotal: this.questsOfferedTotal,
			radiationMultiplier,
			skillPointsUsed,
			skills: gameManager.skillUpgrades.length,
			stabilityMultiplier: gameManager.stabilityMultiplier,
			timestamp: gameManager.inGameTime,
			totalBuildings,
			totalUpgrades: gameManager.totalUpgradesPurchasedAllTime,
			totalXP: gameManager.totalXP,
			upgrades: gameManager.upgrades.length,
		};
	}

	private executeBotBehavior() {
		const { botBehavior, prestigeStrategy } = this.config;
		const maxActionsPerTick = botBehavior.maxActionsPerTick;
		const maxPrestigesPerActiveWindow = botBehavior.maxPrestigesPerActiveWindow;
		let actionsThisTick = 0;

		const canDoAction = (): boolean => maxActionsPerTick == null || actionsThisTick < maxActionsPerTick;
		const canPrestige = (): boolean =>
			maxPrestigesPerActiveWindow == null || this.prestigesThisActiveWindow < maxPrestigesPerActiveWindow;

		if (canDoAction() && canPrestige() && prestigeStrategy.autoProtonise && gameManager.protoniseProtonsGain >= prestigeStrategy.protoniseThreshold) {
			if (gameManager.protonise()) {
				this.pushAction({
					details: `+${gameManager.protoniseProtonsGain} protons`,
					timestamp: gameManager.inGameTime,
					type: 'protonise',
				});
				this.prestigesThisActiveWindow++;
				actionsThisTick++;
			}
		}

		if (canDoAction() && canPrestige() && prestigeStrategy.autoElectronize && gameManager.electronizeElectronsGain >= prestigeStrategy.electronizeThreshold) {
			if (gameManager.electronize()) {
				this.pushAction({
					details: `+${gameManager.electronizeElectronsGain} electrons`,
					timestamp: gameManager.inGameTime,
					type: 'electronize',
				});
				this.prestigesThisActiveWindow++;
				actionsThisTick++;
			}
		}

		if (!botBehavior.autoBuy) return;

		if (canDoAction() && botBehavior.autoBuyBuildings) {
			const building = this.selectBuilding();
			if (building) {
				const maxAffordable = gameManager.getMaxAffordableBuilding(building);
				if (maxAffordable > 0) {
					const isFirstPurchase = !this.everPurchasedBuildings.has(building);
					const apsBeforeBuy = gameManager.atomsPerSecond;
					gameManager.purchaseBuilding(building, maxAffordable);
					this.everPurchasedBuildings.add(building);
					this.pushAction({
						apsDelta: gameManager.atomsPerSecond - apsBeforeBuy,
						details: `${building} x${maxAffordable}`,
						isFirstPurchase,
						timestamp: gameManager.inGameTime,
						type: 'building',
					});
					actionsThisTick++;
				}
			}
		}
		if (canDoAction() && botBehavior.autoBuyUpgrades) {
			const affordableUpgrade = this.getAffordableUpgrade(this.ownedUpgradeSet());
			if (affordableUpgrade) {
				gameManager.purchaseUpgrade(affordableUpgrade);
				this.pushAction({
					details: affordableUpgrade,
					timestamp: gameManager.inGameTime,
					type: 'upgrade',
				});
				actionsThisTick++;
			}
		}
		if (canDoAction() && botBehavior.autoBuySkills) {
			const affordableSkill = this.getAffordableSkill(this.ownedSkillSet());
			if (affordableSkill) {
				gameManager.purchaseSkill(affordableSkill);
				this.pushAction({
					details: affordableSkill,
					timestamp: gameManager.inGameTime,
					type: 'skill',
				});
				actionsThisTick++;
			}
		}
		if (canDoAction() && botBehavior.autoBuyPhotonUpgrades) {
			const photons = currenciesManager.getAmount(CurrenciesTypes.PHOTONS);
			const excitedPhotons = currenciesManager.getAmount(CurrenciesTypes.EXCITED_PHOTONS);
			const affordablePhotonUpgrade = this.getAffordablePhotonUpgrade(photons, excitedPhotons);
			if (affordablePhotonUpgrade) {
				gameManager.purchasePhotonUpgrade(affordablePhotonUpgrade);
				this.pushAction({
					details: affordablePhotonUpgrade,
					timestamp: gameManager.inGameTime,
					type: 'photon_upgrade',
				});
				actionsThisTick++;
			}
		}
		let availableSkillPoints = gameManager.skillPointsAvailable;
		if (canDoAction() && availableSkillPoints > 0) {
			const boostPriority: CurrencyName[] = [
				CurrenciesTypes.ATOMS,
				CurrenciesTypes.PROTONS,
				CurrenciesTypes.ELECTRONS,
				CurrenciesTypes.PHOTONS,
			];

			for (const currency of boostPriority) {
				if (availableSkillPoints <= 0 || !canDoAction()) break;
				if (gameManager.addCurrencyBoost(currency)) {
					availableSkillPoints--;
					actionsThisTick++;
				}
			}
		}

		if (radiationManager.unlocked) {
			// Passive: fuel the core - keep enough electrons for the next electronize, spend surplus on mass.
			const electrons = currenciesManager.getAmount(CurrenciesTypes.ELECTRONS);
			const electronizeReserve = gameManager.electronizeElectronsGain > 0
				? gameManager.electronizeElectronsGain * 3
				: 50;
			const surplus = electrons - electronizeReserve;
			if (surplus > 0 && (radiationManager.mass === 0 || radiationManager.timeToEmpty < 3_600_000)) {
				radiationManager.bombardCore(Math.min(Math.floor(surplus * 0.3), 20));
			}
			// Set control rods once the core has fuel.
			if (radiationManager.mass > 0 && radiationManager.controlRodLevel === 0) {
				radiationManager.setControlRodLevel(0.5);
			}
			// Buy cheapest radiation upgrade (costs electrons, counts as an action).
			if (canDoAction()) {
				const upgradeId = this.getAffordableRadiationUpgrade();
				if (upgradeId && radiationManager.purchaseUpgrade(upgradeId)) {
					actionsThisTick++;
				}
			}
		}
	}

	/** Mirrors gameManager's upgrade arrays into sets, rebuilt only when a purchase swaps the array. */
	private ownedUpgradeSet(): Set<string> {
		const owned = gameManager.upgrades;
		if (owned !== this.cachedUpgradesRef) {
			this.cachedUpgradesRef = owned;
			this.cachedUpgradesSet = new Set(owned);
		}
		return this.cachedUpgradesSet;
	}

	private ownedSkillSet(): Set<string> {
		const owned = gameManager.skillUpgrades;
		if (owned !== this.cachedSkillsRef) {
			this.cachedSkillsRef = owned;
			this.cachedSkillsSet = new Set(owned);
		}
		return this.cachedSkillsSet;
	}

	private getAffordablePhotonUpgrade(photons: number, excitedPhotons: number): string | null {
		let bestId: string | null = null;
		let bestCost = Infinity;

		for (const [id, upgrade] of PHOTON_UPGRADE_ENTRIES) {
			const currentLevel = gameManager.photonUpgrades[id] ?? 0;
			if (currentLevel >= upgrade.maxLevel) continue;
			const cost = getPhotonUpgradeCost(upgrade, currentLevel);
			if (cost >= bestCost) continue;
			const available = upgrade.currency === CurrenciesTypes.EXCITED_PHOTONS ? excitedPhotons : photons;
			if (available < cost) continue;
			if (upgrade.condition && !upgrade.condition(gameManager)) continue;
			bestCost = cost;
			bestId = id;
		}

		return bestId;
	}

	private getAffordableRadiationUpgrade(): string | null {
		let bestId: string | null = null;
		let bestCost = Infinity;
		const electrons = currenciesManager.getAmount(CurrenciesTypes.ELECTRONS);

		for (const [id, upgrade] of RADIATION_UPGRADE_ENTRIES) {
			const currentLevel = radiationManager.upgradeLevels[id] ?? 0;
			if (currentLevel >= upgrade.maxLevel) continue;
			const price = getRadiationUpgradePrice(upgrade, currentLevel);
			if (price.amount >= bestCost) continue;
			if (electrons < price.amount) continue;
			bestCost = price.amount;
			bestId = id;
		}

		return bestId;
	}

	private getAffordableSkill(ownedSkills: Set<string>): string | null {
		for (const [id, skill] of SKILL_ENTRIES) {
			if (ownedSkills.has(id)) continue;
			if (currenciesManager.getAmount(skill.cost.currency) < skill.cost.amount) continue;
			if (skill.requires && !skill.requires.every(req => ownedSkills.has(req))) continue;
			if (skill.condition && !skill.condition(gameManager)) continue;
			return id;
		}

		return null;
	}

	private getAffordableUpgrade(ownedUpgrades: Set<string>): string | null {
		for (const [id, upgrade] of UPGRADE_ENTRIES) {
			if (ownedUpgrades.has(id)) continue;
			if (currenciesManager.getAmount(upgrade.cost.currency) < upgrade.cost.amount) continue;
			if (upgrade.condition && !upgrade.condition(gameManager)) continue;
			return id;
		}

		return null;
	}

	private selectBuilding(): BuildingType | null {
		const { buyStrategy } = this.config.botBehavior;
		const atoms = currenciesManager.getAmount(CurrenciesTypes.ATOMS);

		// Costs are stable for the whole selection, so price each building once instead of inside every comparison.
		const costs: number[] = [];
		let anyAffordable = false;
		for (let i = 0; i < BUILDING_TYPES.length; i++) {
			const cost = gameManager.getBuildingCost(BUILDING_TYPES[i], 1);
			costs[i] = cost;
			if (atoms >= cost) anyAffordable = true;
		}

		if (!anyAffordable) return null;

		const cheapestAffordable = (onlyUnowned: boolean): BuildingType | null => {
			let best: BuildingType | null = null;
			let bestCost = Infinity;
			for (let i = 0; i < BUILDING_TYPES.length; i++) {
				const type = BUILDING_TYPES[i];
				if (atoms < costs[i] || costs[i] >= bestCost) continue;
				if (onlyUnowned && (gameManager.buildings[type]?.count ?? 0) > 0) continue;
				bestCost = costs[i];
				best = type;
			}
			return best;
		};

		const mostEfficientAffordable = (): BuildingType | null => {
			let best: BuildingType | null = null;
			let bestRate = -Infinity;
			for (let i = 0; i < BUILDING_TYPES.length; i++) {
				const type = BUILDING_TYPES[i];
				if (atoms < costs[i]) continue;
				const rate = BUILDINGS[type].rate / costs[i];
				if (best !== null && rate <= bestRate) continue;
				bestRate = rate;
				best = type;
			}
			return best;
		};

		switch (buyStrategy) {
			case 'cheapest':
				return cheapestAffordable(false);
			case 'mostEfficient':
				return mostEfficientAffordable();
			case 'balanced':
			default:
				return cheapestAffordable(true) ?? mostEfficientAffordable();
		}
	}

	private isInActiveWindow(): boolean {
		const { activityPattern } = this.config.botBehavior;
		if (!activityPattern) return true;
		const cycleMs = (activityPattern.activeMinutes + activityPattern.inactiveMinutes) * 60 * 1000;
		const activeMs = activityPattern.activeMinutes * 60 * 1000;
		const positionInCycle = gameManager.inGameTime % cycleMs;
		return positionInCycle < activeMs;
	}

	private simulateClicks() {
		const { clicksPerSecond } = this.config.botBehavior;
		if (!this.activeNow) return;
		if (clicksPerSecond <= 0) return;
		// When another realm is active the player is clicking there, not the atom button.
		// Atom auto-click (via upgrades) still fires through gameManager.tick().
		if (gameManager.realms[RealmTypes.PHOTONS]?.unlocked) return;

		const clicksThisTick = clicksPerSecond * (this.config.tickRate / 1000);
		const clickPower = gameManager.clickPower;

		gameManager.addAtoms(clickPower * clicksThisTick);
		gameManager.totalClicksAllTime += Math.floor(clicksThisTick);
		gameManager.totalClicksRun += Math.floor(clicksThisTick);
		// Bypasses gameManager.incrementClicks() for performance, so dailyStats needs its own bump here.
		gameManager.dailyStats = { ...gameManager.dailyStats, clicks: gameManager.dailyStats.clicks + Math.floor(clicksThisTick) };
	}

	/** Headless equivalent of clicking realm circles. Mirrors offlineProgress.ts photon math + adds auto-click. */
	private simulatePhotonRealmClicks() {
		if (!gameManager.realms[RealmTypes.PHOTONS]?.unlocked) return;

		const deltaSeconds = this.config.tickRate / 1000;
		const manualClicks = this.activeNow ? this.config.botBehavior.clicksPerSecond * deltaSeconds : 0;
		const autoClicks = gameManager.photonAutoClicksPer5Seconds > 0 ? (gameManager.photonAutoClicksPer5Seconds / 5) * deltaSeconds : 0;
		const totalClicks = manualClicks + autoClicks;
		if (totalClicks <= 0) return;

		const { doubleChance, excitedDoubleChance, excitedFromMaxBonus, photonValueBonus } = this.photonClickEffects();
		// Photon realm caps excited chance behind 'excited_auto_click' upgrade for auto-clicks only.
		const autoAllowsExcited = (gameManager.photonUpgrades['excited_auto_click'] || 0) > 0;
		const excitedChanceManual = gameManager.excitedPhotonChance;
		const excitedChanceAuto = autoAllowsExcited ? excitedChanceManual : 0;

		const basePhotonAvg = (1 + 10) / 2;
		const normalPhotonsPerClick = (basePhotonAvg + photonValueBonus) * (1 + doubleChance);
		const excitedPhotonsPerClick = (1 + excitedDoubleChance) + (10 + photonValueBonus) * excitedFromMaxBonus;

		const photonsMultiplier = gameManager.getCurrencyBoostMultiplier(CurrenciesTypes.PHOTONS);
		const excitedMultiplier = gameManager.getCurrencyBoostMultiplier(CurrenciesTypes.EXCITED_PHOTONS);

		const normalClicks = manualClicks * (1 - excitedChanceManual) + autoClicks * (1 - excitedChanceAuto);
		const excitedClicks = manualClicks * excitedChanceManual + autoClicks * excitedChanceAuto;

		const photonsGain = normalClicks * normalPhotonsPerClick * photonsMultiplier;
		const excitedGain = excitedClicks * excitedPhotonsPerClick * excitedMultiplier;

		if (photonsGain > 0) currenciesManager.add(CurrenciesTypes.PHOTONS, photonsGain);
		if (excitedGain > 0) currenciesManager.add(CurrenciesTypes.EXCITED_PHOTONS, excitedGain);
	}

	/** The four photon click modifiers are folded in a single walk of the effect sources, which runs every tick. */
	private photonClickEffects(): { doubleChance: number; excitedDoubleChance: number; excitedFromMaxBonus: number; photonValueBonus: number } {
		let doubleChance = 0;
		let excitedDoubleChance = 0;
		let excitedFromMaxBonus = 0;
		let photonValueBonus = 0;

		for (const source of gameManager.allEffectSources) {
			if (!('effects' in source) || !Array.isArray(source.effects)) continue;
			const isPhotonValue = source.id === 'photon_value';

			for (const effect of source.effects) {
				switch (effect.type) {
					case 'click':
						if (isPhotonValue) photonValueBonus = effect.apply(photonValueBonus, gameManager);
						break;
					case 'excited_photon_double':
						excitedDoubleChance = effect.apply(excitedDoubleChance, gameManager);
						break;
					case 'excited_photon_from_max':
						excitedFromMaxBonus = effect.apply(excitedFromMaxBonus, gameManager);
						break;
					case 'photon_double_chance':
						doubleChance = effect.apply(doubleChance, gameManager);
						break;
				}
			}
		}

		return { doubleChance, excitedDoubleChance, excitedFromMaxBonus, photonValueBonus };
	}

	private rollPowerUpInterval(): number {
		const [min, max] = gameManager.powerUpInterval;
		return gameManager.inGameTime + min + Math.random() * (max - min);
	}

	/** Spawn power-ups at gameManager.powerUpInterval; if active window, "click" them (apply boost + Higgs Boson). */
	private tickPowerUps() {
		if (gameManager.inGameTime < this.nextPowerUpTime) return;

		this.nextPowerUpTime = this.rollPowerUpInterval();
		if (!this.activeNow) return;

		const base = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
		const multiplier = base.multiplier * gameManager.powerUpEffectMultiplier;
		const duration = base.duration * gameManager.powerUpDurationMultiplier;

		gameManager.addPowerUp({
			description: `Multiplies atoms by ${multiplier} for ${duration / 1000}s`,
			duration,
			id: `sim_${this.powerUpCounter++}`,
			multiplier,
			name: base.name,
			startTime: gameManager.inGameTime,
		});
		gameManager.incrementBonusHiggsBosonClicks();

		this.pushAction({
			details: `×${multiplier.toFixed(1)} / ${(duration / 1000).toFixed(0)}s`,
			timestamp: gameManager.inGameTime,
			type: 'power_up',
		});
	}

	private takeSnapshot() {
		this.snapshots.push(this.createSnapshotData());
		this.actions = [];
	}
}
