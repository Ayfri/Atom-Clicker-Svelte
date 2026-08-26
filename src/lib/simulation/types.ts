import type { BuildingType } from '$data/buildings';

export interface BenchmarkConfig {
	botBehavior: BotBehavior;
	name: string;
	prestigeStrategy: PrestigeStrategy;
	snapshotInterval: number;
	targetHours: number;
	tickRate: number;
}

/** When set, bot only clicks during active windows (e.g. 15 min active / 45 min inactive per hour). */
export interface ActivityPattern {
	activeMinutes: number;
	inactiveMinutes: number;
}

export interface BotBehavior {
	activityPattern?: ActivityPattern;
	autoBuy: boolean;
	autoBuyBuildings: boolean;
	autoBuyPhotonUpgrades: boolean;
	autoBuySkills: boolean;
	autoBuyUpgrades: boolean;
	buyStrategy: 'balanced' | 'cheapest' | 'mostEfficient';
	clicksPerSecond: number;
	/** Bot game knowledge 0-1. Blends the naive base-rate building ranking (0) with the real marginal gain per atom spent (1). */
	gameKnowledge: number;
	/** Max buy+prestige actions per tick. undefined = no limit (Automated). */
	maxActionsPerTick?: number;
	/** Max protonises+electronizes per active window. undefined = no limit. */
	maxPrestigesPerActiveWindow?: number;
	/** Whether the bot engages with daily quests. */
	questBehavior: QuestBehavior;
}

/** How a bot engages with daily quests: never claims, claims whatever completes naturally, or steers toward targets. */
export type QuestBehavior = 'dedicated' | 'ignore' | 'passive';

/** Thresholds are ratios against the previous run's gain, not absolute counts: reset once the next run is worth Nx the last. */
export interface PrestigeStrategy {
	autoElectronize: boolean;
	autoProtonise: boolean;
	electronizeThreshold: number;
	protoniseThreshold: number;
}

export interface SimulationSnapshot {
	achievements: number;
	actions: SimulationAction[];
	atoms: number;
	atomsCurrencyBoost: number;
	atomsPerClick: number;
	atomsPerSecond: number;
	bonusMultiplier: number;
	buildingLevels: number;
	buildingLevelFactors: Partial<Record<BuildingType, number>>;
	buildingProductions: Partial<Record<BuildingType, number>>;
	buildingUpgradeFactors: Partial<Record<BuildingType, number>>;
	buildings: Record<BuildingType, number>;
	buildingsEverPurchased: string[];
	buildingsPurchased: number;
	clicks: number;
	dayNumber: number;
	electrons: number;
	electronizes: number;
	globalAchievementMultiplier: number;
	globalFlatMultiplier: number;
	globalLevelMultiplier: number;
	globalMultiplier: number;
	groupContributions: {
		achievementMul: number[];
		globalBoostTiers: number[];
		levelBoost: number[];
		protonBoost: number[];
		protoniseBoost: number[];
	};
	globalProtonBoostMultiplier: number;
	globalProtoniseMultiplier: number;
	globalSkillsMultiplier: number;
	photons: number;
	photonUpgradeLevels: number;
	playerLevel: number;
	protons: number;
	protonises: number;
	quarks: number;
	quarksFromAchievements: number;
	quarksFromQuests: number;
	questsCompletedToday: number;
	questsCompletedTotal: number;
	questsOfferedTotal: number;
	radiationMultiplier: number;
	skillPointsUsed: number;
	skills: number;
	stabilityMultiplier: number;
	timestamp: number;
	totalBuildings: number;
	totalUpgrades: number;
	totalXP: number;
	upgrades: number;
}

export interface SimulationAction {
	apsDelta?: number;
	details?: string;
	isFirstPurchase?: boolean;
	timestamp: number;
	type: 'achievement' | 'building' | 'electronize' | 'photon_upgrade' | 'power_up' | 'protonise' | 'skill' | 'upgrade';
}

export interface MilestoneDefinition {
	check?: (snapshot: SimulationSnapshot) => boolean;
	description: string;
	id: string;
	name: string;
}

export interface MilestoneHit {
	dayReached: number;
	milestone: MilestoneDefinition;
	timeReached: number;
}

export interface SpikeEvent {
	actions: SimulationAction[];
	apsEnd: number;
	apsStart: number;
	avgRatePerMin: number;
	peakRatePerMin: number;
	timestamp: number;
}

export interface SimulationResult {
	cancelled: boolean;
	config: BenchmarkConfig;
	durationMs: number;
	milestones: MilestoneHit[];
	snapshots: SimulationSnapshot[];
	spikes: SpikeEvent[];
}

export const MILESTONES: MilestoneDefinition[] = [
	{ description: 'Reached 1K Atoms', id: 'atoms_1k', name: '1K Atoms' },
	{ description: 'Reached 1M Atoms', id: 'atoms_1m', name: '1M Atoms' },
	{ description: 'Reached 1B Atoms', id: 'atoms_1b', name: '1B Atoms' },
	{ description: 'Reached 1Qa Atoms', id: 'atoms_1qa', name: '1Qa Atoms' },
	{ description: 'Reached 1Sx Atoms', id: 'atoms_1sx', name: '1Sx Atoms' },
	{ description: 'Reached 1No Atoms', id: 'atoms_1no', name: '1No Atoms' },

	{ description: 'Producing 1K atoms/s', id: 'aps_1k', name: '1K APS' },
	{ description: 'Producing 1Qa atoms/s', id: 'aps_1qa', name: '1Qa APS' },
	{ description: 'Producing 1Sx atoms/s', id: 'aps_1sx', name: '1Sx APS' },

	{ description: 'Owns 25 buildings', id: 'buildings_25', name: '25 Buildings' },
	{ description: 'Owns 100 buildings', id: 'buildings_100', name: '100 Buildings' },
	{ description: 'Owns 500 buildings', id: 'buildings_500', name: '500 Buildings' },
	{ description: 'Owns 1000 buildings', id: 'buildings_1k', name: '1K Buildings' },

	{ description: 'First Protonise', id: 'first_protonise', name: '1st Protonise' },
	{ description: '10 Protonises', id: 'protonises_10', name: '10 Protonises' },
	{ description: 'Earned 100 Protons', id: 'protons_100', name: '100 Protons' },
	{ description: 'Earned 1K Protons', id: 'protons_1k', name: '1K Protons' },
	{ description: 'First Electronize', id: 'first_electronize', name: '1st Electronize' },
	{ description: 'Earned 100 Electrons', id: 'electrons_100', name: '100 Electrons' },

	{ description: 'Bought 10 upgrades', id: 'upgrades_10', name: '10 Upgrades' },
	{ description: 'Bought 50 upgrades', id: 'upgrades_50', name: '50 Upgrades' },
	{ description: 'Bought 100 upgrades', id: 'upgrades_100', name: '100 Upgrades' },

	{ description: 'Unlocked 1 skill', id: 'skills_1', name: '1 Skill' },
	{ description: 'Unlocked 15 skills', id: 'skills_15', name: '15 Skills' },
	{ description: 'Unlocked 30 skills', id: 'skills_30', name: '30 Skills' },

	{ description: '10 Photon Upgrade Levels', id: 'photon_10', name: '10 Photon Lvls' },
	{ description: '50 Photon Upgrade Levels', id: 'photon_50', name: '50 Photon Lvls' },

	{ description: 'Earned 10 achievements', id: 'achievements_10', name: '10 Achievements' },
	{ description: 'Earned 50 achievements', id: 'achievements_50', name: '50 Achievements' },
	{ description: 'Earned 100 achievements', id: 'achievements_100', name: '100 Achievements' },

	{ description: 'First currency boost upgrade', id: 'currency_boost_1', name: '1st Currency Boost' },
	{
		description: '10 total currency boost upgrades',
		id: 'currency_boost_10',
		name: '10 Currency Boosts',
	},
	{
		description: '50 total currency boost upgrades',
		id: 'currency_boost_50',
		name: '50 Currency Boosts',
	},

	{ description: 'Reached player level 1', id: 'player_level_1', name: 'Level 1' },
	{ description: 'Reached player level 10', id: 'player_level_10', name: 'Level 10' },
	{ description: 'Reached player level 50', id: 'player_level_50', name: 'Level 50' },
	{ description: 'Reached player level 200', id: 'player_level_200', name: 'Level 200' },

	{ description: 'Purchased first Molecule', id: 'first_building_molecule', name: 'First Molecule' },
	{ description: 'Purchased first Crystal', id: 'first_building_crystal', name: 'First Crystal' },
	{ description: 'Purchased first Nanostructure', id: 'first_building_nanostructure', name: 'First Nanostructure' },
	{ description: 'Purchased first Microorganism', id: 'first_building_microorganism', name: 'First Microorganism' },
	{ description: 'Purchased first Rock', id: 'first_building_rock', name: 'First Rock' },
	{ description: 'Purchased first Planet', id: 'first_building_planet', name: 'First Planet' },
	{ description: 'Purchased first Star', id: 'first_building_star', name: 'First Star' },
	{ description: 'Purchased first Neutron Star', id: 'first_building_neutronStar', name: 'First Neutron Star' },
	{ description: 'Purchased first Black Hole', id: 'first_building_blackHole', name: 'First Black Hole' },

	{ description: 'Earned 1 Quark', id: 'quarks_1', name: '1 Quark' },
	{ description: 'Earned 10 Quarks', id: 'quarks_10', name: '10 Quarks' },
	{ description: 'Earned 50 Quarks', id: 'quarks_50', name: '50 Quarks' },
	{ description: 'Earned 100 Quarks', id: 'quarks_100', name: '100 Quarks' },
];

/** Fields a milestone predicate may read: the engine builds only these between snapshots instead of a full snapshot. */
export type MilestoneCheckData = Pick<
	SimulationSnapshot,
	| 'achievements'
	| 'atoms'
	| 'atomsPerSecond'
	| 'buildingsEverPurchased'
	| 'dayNumber'
	| 'electronizes'
	| 'electrons'
	| 'photonUpgradeLevels'
	| 'playerLevel'
	| 'protonises'
	| 'protons'
	| 'quarks'
	| 'skillPointsUsed'
	| 'skills'
	| 'timestamp'
	| 'totalBuildings'
	| 'upgrades'
>;

export const MILESTONE_CHECKS: Record<string, (s: MilestoneCheckData) => boolean> = {
	atoms_1k: s => s.atoms >= 1_000,
	atoms_1m: s => s.atoms >= 1_000_000,
	atoms_1b: s => s.atoms >= 1_000_000_000,
	atoms_1qa: s => s.atoms >= 1e15,
	atoms_1sx: s => s.atoms >= 1e21,
	atoms_1no: s => s.atoms >= 1e30,

	aps_1k: s => s.atomsPerSecond >= 1_000,
	aps_1qa: s => s.atomsPerSecond >= 1e15,
	aps_1sx: s => s.atomsPerSecond >= 1e21,

	buildings_25: s => s.totalBuildings >= 25,
	buildings_100: s => s.totalBuildings >= 100,
	buildings_500: s => s.totalBuildings >= 500,
	buildings_1k: s => s.totalBuildings >= 1000,

	first_protonise: s => s.protonises >= 1,
	protonises_10: s => s.protonises >= 10,
	protons_100: s => s.protons >= 100,
	protons_1k: s => s.protons >= 1000,
	first_electronize: s => s.electronizes >= 1,
	electrons_100: s => s.electrons >= 100,

	upgrades_10: s => s.upgrades >= 10,
	upgrades_50: s => s.upgrades >= 50,
	upgrades_100: s => s.upgrades >= 100,

	skills_1: s => s.skills >= 1,
	skills_15: s => s.skills >= 15,
	skills_30: s => s.skills >= 30,

	photon_10: s => s.photonUpgradeLevels >= 10,
	photon_50: s => s.photonUpgradeLevels >= 50,

	achievements_10: s => s.achievements >= 10,
	achievements_50: s => s.achievements >= 50,
	achievements_100: s => s.achievements >= 100,

	currency_boost_1: s => s.skillPointsUsed >= 1,
	currency_boost_10: s => s.skillPointsUsed >= 10,
	currency_boost_50: s => s.skillPointsUsed >= 50,

	player_level_1: s => s.playerLevel >= 1,
	player_level_10: s => s.playerLevel >= 10,
	player_level_50: s => s.playerLevel >= 50,
	player_level_200: s => s.playerLevel >= 200,

	first_building_molecule: s => s.buildingsEverPurchased.includes('molecule'),
	first_building_crystal: s => s.buildingsEverPurchased.includes('crystal'),
	first_building_nanostructure: s => s.buildingsEverPurchased.includes('nanostructure'),
	first_building_microorganism: s => s.buildingsEverPurchased.includes('microorganism'),
	first_building_rock: s => s.buildingsEverPurchased.includes('rock'),
	first_building_planet: s => s.buildingsEverPurchased.includes('planet'),
	first_building_star: s => s.buildingsEverPurchased.includes('star'),
	first_building_neutronStar: s => s.buildingsEverPurchased.includes('neutronStar'),
	first_building_blackHole: s => s.buildingsEverPurchased.includes('blackHole'),

	quarks_1: s => s.quarks >= 1,
	quarks_10: s => s.quarks >= 10,
	quarks_50: s => s.quarks >= 50,
	quarks_100: s => s.quarks >= 100,
};

/** Activity schedule: when the bot is "active" (clicking and buying) vs idle. */
export const ACTIVITY_PRESETS = {
	always: {
		id: 'always',
		name: 'Always active',
	},
	afk_5: {
		activityPattern: { activeMinutes: 5, inactiveMinutes: 55 },
		id: 'afk_5',
		name: 'AFK (5 min/h)',
	},
	afk_15: {
		activityPattern: { activeMinutes: 15, inactiveMinutes: 45 },
		id: 'afk_15',
		name: 'AFK (15 min/h)',
	},
} as const;

export type ActivityPresetId = keyof typeof ACTIVITY_PRESETS;

/** How the bot plays when active: strategy, knowledge, limits. Automated = no limits. */
export const PLAYSTYLE_PRESETS = {
	afk: {
		autoBuy: true,
		autoBuyBuildings: true,
		autoBuyPhotonUpgrades: false,
		autoBuySkills: true,
		autoBuyUpgrades: true,
		buyStrategy: 'cheapest' as const,
		clicksPerSecond: 2,
		gameKnowledge: 0.3,
		id: 'afk',
		maxActionsPerTick: 2,
		maxPrestigesPerActiveWindow: 1,
		name: 'AFK-style',
		questBehavior: 'passive' as const,
		snapshotInterval: 300,
		tickRate: 1000,
	},
	automated: {
		autoBuy: true,
		autoBuyBuildings: true,
		autoBuyPhotonUpgrades: true,
		autoBuySkills: true,
		autoBuyUpgrades: true,
		buyStrategy: 'mostEfficient' as const,
		clicksPerSecond: 15,
		gameKnowledge: 1.0,
		id: 'automated',
		maxActionsPerTick: undefined,
		maxPrestigesPerActiveWindow: undefined,
		name: 'Automated (no limits)',
		questBehavior: 'dedicated' as const,
		snapshotInterval: 60,
		tickRate: 100,
	},
	balanced: {
		autoBuy: true,
		autoBuyBuildings: true,
		autoBuyPhotonUpgrades: true,
		autoBuySkills: true,
		autoBuyUpgrades: true,
		buyStrategy: 'balanced' as const,
		clicksPerSecond: 3,
		gameKnowledge: 0.6,
		id: 'balanced',
		maxActionsPerTick: 5,
		maxPrestigesPerActiveWindow: 2,
		name: 'Balanced',
		questBehavior: 'passive' as const,
		snapshotInterval: 120,
		tickRate: 500,
	},
	tryhard: {
		autoBuy: true,
		autoBuyBuildings: true,
		autoBuyPhotonUpgrades: true,
		autoBuySkills: true,
		autoBuyUpgrades: true,
		buyStrategy: 'mostEfficient' as const,
		clicksPerSecond: 8,
		gameKnowledge: 0.9,
		id: 'tryhard',
		maxActionsPerTick: 10,
		maxPrestigesPerActiveWindow: 3,
		name: 'Tryhard',
		questBehavior: 'dedicated' as const,
		snapshotInterval: 60,
		tickRate: 250,
	},
} as const;

export type PlaystylePresetId = keyof typeof PLAYSTYLE_PRESETS;

/** When to prestige, as a multiple of the previous run's gain. Higher threshold = fewer prestiges, each more impactful. */
export const PRESTIGE_PRESETS = {
	early: {
		autoElectronize: true,
		autoProtonise: true,
		electronizeThreshold: 1,
		id: 'early',
		name: 'Early (1x)',
		protoniseThreshold: 1,
	},
	balanced: {
		autoElectronize: true,
		autoProtonise: true,
		electronizeThreshold: 5,
		id: 'balanced',
		name: 'Balanced (5x)',
		protoniseThreshold: 5,
	},
	late: {
		autoElectronize: true,
		autoProtonise: true,
		electronizeThreshold: 15,
		id: 'late',
		name: 'Late (15x)',
		protoniseThreshold: 15,
	},
	patient: {
		autoElectronize: true,
		autoProtonise: true,
		electronizeThreshold: 50,
		id: 'patient',
		name: 'Patient (50x)',
		protoniseThreshold: 50,
	},
	ultra: {
		autoElectronize: true,
		autoProtonise: true,
		electronizeThreshold: 100,
		id: 'ultra',
		name: 'Ultra (100x)',
		protoniseThreshold: 100,
	},
} as const;

export type PrestigePresetId = keyof typeof PRESTIGE_PRESETS;

/** Infer preset IDs from a saved config so the form (selects, target hours) can be updated. */
export function configToPresets(config: BenchmarkConfig): {
	activityId: ActivityPresetId;
	playstyleId: PlaystylePresetId;
	prestigeId: PrestigePresetId;
	questBehavior: QuestBehavior;
	targetHours: number;
} {
	const { botBehavior, prestigeStrategy, snapshotInterval, targetHours, tickRate } = config;

	const activityId: ActivityPresetId = (() => {
		const ap = botBehavior.activityPattern;
		if (!ap) return 'always';
		const key = Object.entries(ACTIVITY_PRESETS).find(
			([_, a]) =>
				'activityPattern' in a &&
				a.activityPattern?.activeMinutes === ap.activeMinutes &&
				a.activityPattern?.inactiveMinutes === ap.inactiveMinutes,
		)?.[0];
		return (key as ActivityPresetId) ?? 'always';
	})();

	const prestigeId: PrestigePresetId = (() => {
		const key = Object.entries(PRESTIGE_PRESETS).find(
			([_, p]) =>
				p.protoniseThreshold === prestigeStrategy.protoniseThreshold &&
				p.electronizeThreshold === prestigeStrategy.electronizeThreshold,
		)?.[0];
		return (key as PrestigePresetId) ?? 'balanced';
	})();

	const playstyleId: PlaystylePresetId = (() => {
		const key = Object.entries(PLAYSTYLE_PRESETS).find(
			([_, p]) =>
				p.tickRate === tickRate &&
				p.snapshotInterval === snapshotInterval &&
				p.buyStrategy === botBehavior.buyStrategy &&
				p.clicksPerSecond === botBehavior.clicksPerSecond,
		)?.[0];
		return (key as PlaystylePresetId) ?? 'balanced';
	})();

	// questBehavior is a direct field on the config (a separate selector from playstyle), not
	// inferred by matching - read it straight off, with a fallback for reports saved before this field existed.
	const questBehavior: QuestBehavior = botBehavior.questBehavior ?? 'passive';

	return { activityId, playstyleId, prestigeId, questBehavior, targetHours };
}

export function buildBenchmarkConfig(
	activityId: ActivityPresetId,
	playstyleId: PlaystylePresetId,
	prestigeId: PrestigePresetId,
	targetHours: number,
	snapshotIntervalOverride?: number,
	questBehaviorOverride?: QuestBehavior,
): BenchmarkConfig {
	const activity = ACTIVITY_PRESETS[activityId];
	const playstyle = PLAYSTYLE_PRESETS[playstyleId];
	const prestige = PRESTIGE_PRESETS[prestigeId];
	const activityPattern = 'activityPattern' in activity ? activity.activityPattern : undefined;
	return {
		botBehavior: {
			...(activityPattern && { activityPattern }),
			autoBuy: playstyle.autoBuy,
			autoBuyBuildings: playstyle.autoBuyBuildings,
			autoBuyPhotonUpgrades: playstyle.autoBuyPhotonUpgrades,
			autoBuySkills: playstyle.autoBuySkills,
			autoBuyUpgrades: playstyle.autoBuyUpgrades,
			buyStrategy: playstyle.buyStrategy,
			clicksPerSecond: playstyle.clicksPerSecond,
			gameKnowledge: playstyle.gameKnowledge,
			...(playstyle.maxActionsPerTick !== undefined && { maxActionsPerTick: playstyle.maxActionsPerTick }),
			...(playstyle.maxPrestigesPerActiveWindow !== undefined && {
				maxPrestigesPerActiveWindow: playstyle.maxPrestigesPerActiveWindow,
			}),
			questBehavior: questBehaviorOverride ?? playstyle.questBehavior,
		},
		name: `${activity.name} · ${playstyle.name} · ${prestige.name}`,
		prestigeStrategy: {
			autoElectronize: prestige.autoElectronize,
			autoProtonise: prestige.autoProtonise,
			electronizeThreshold: prestige.electronizeThreshold,
			protoniseThreshold: prestige.protoniseThreshold,
		},
		snapshotInterval: snapshotIntervalOverride ?? playstyle.snapshotInterval,
		targetHours,
		tickRate: playstyle.tickRate,
	};
}

/** One-click presets that set activity + playstyle + prestige together. */
export const BOT_PROFILES = {
	afk: {
		activityId: 'afk_15' as const,
		playstyleId: 'afk' as const,
		prestigeId: 'balanced' as const,
	},
	automated: {
		activityId: 'always' as const,
		playstyleId: 'automated' as const,
		prestigeId: 'ultra' as const,
	},
	balanced: {
		activityId: 'always' as const,
		playstyleId: 'balanced' as const,
		prestigeId: 'balanced' as const,
	},
	tryhard: {
		activityId: 'always' as const,
		playstyleId: 'tryhard' as const,
		prestigeId: 'patient' as const,
	},
} as const;

export type BotProfileName = keyof typeof BOT_PROFILES;
