/**
 * Simulation types and data structures for headless game benchmarking.
 */

import type { BuildingType } from '$data/buildings';

/**
 * Configuration for a benchmark simulation.
 */
export interface BenchmarkConfig {
	botBehavior: BotBehavior;
	name: string;
	prestigeStrategy: PrestigeStrategy;
	snapshotInterval: number;
	targetHours: number;
	tickRate: number;
}

/**
 * Bot behavior settings for the simulation.
 */
export interface BotBehavior {
	autoBuy: boolean;
	autoBuyBuildings: boolean;
	autoBuyPhotonUpgrades: boolean;
	autoBuySkills: boolean;
	autoBuyUpgrades: boolean;
	buyStrategy: 'balanced' | 'cheapest' | 'mostEfficient';
	clicksPerSecond: number;
	/**
	 * How well the bot knows the game (0-1).
	 * Higher values mean more optimal play and access to hidden achievements.
	 */
	gameKnowledge: number;
}

/**
 * Strategy for automatic prestige actions.
 */
export interface PrestigeStrategy {
	autoElectronize: boolean;
	autoProtonise: boolean;
	electronizeThreshold: number;
	protoniseThreshold: number;
}

/**
 * Snapshot of the game state at a specific point in the simulation.
 */
export interface SimulationSnapshot {
	achievements: number;
	actions: SimulationAction[];
	atoms: number;
	atomsPerSecond: number;
	buildingLevels: number;
	buildings: Record<BuildingType, number>;
	buildingsPurchased: number;
	clicks: number;
	dayNumber: number;
	electrons: number;
	electronizes: number;
	globalMultiplier: number;
	photons: number;
	photonUpgradeLevels: number;
	playerLevel: number;
	protons: number;
	protonises: number;
	skillPointsUsed: number;
	skills: number;
	timestamp: number;
	totalBuildings: number;
	totalUpgrades: number;
	totalXP: number;
	upgrades: number;
}

/**
 * Action taken by the bot during simulation.
 */
export interface SimulationAction {
	details?: string;
	timestamp: number;
	type: 'achievement' | 'building' | 'electronize' | 'photon_upgrade' | 'protonise' | 'skill' | 'upgrade';
}

/**
 * Definition of a benchmark milestone.
 */
export interface MilestoneDefinition {
	check?: (snapshot: SimulationSnapshot) => boolean;
	description: string;
	id: string;
	name: string;
}

/**
 * Recorded milestone hit during simulation.
 */
export interface MilestoneHit {
	dayReached: number;
	milestone: MilestoneDefinition;
	timeReached: number;
}

/**
 * Results of a completed simulation.
 */
export interface SimulationResult {
	cancelled: boolean;
	config: BenchmarkConfig;
	durationMs: number;
	milestones: MilestoneHit[];
	snapshots: SimulationSnapshot[];
}

/**
 * Sparse milestones for checking game progression.
 */
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
];

export const MILESTONE_CHECKS: Record<string, (s: SimulationSnapshot) => boolean> = {
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

	currency_boost_1: s => s.buildingLevels >= 1,
	currency_boost_10: s => s.buildingLevels >= 10,
	currency_boost_50: s => s.buildingLevels >= 50,

	player_level_1: s => s.playerLevel >= 1,
	player_level_10: s => s.playerLevel >= 10,
	player_level_50: s => s.playerLevel >= 50,
	player_level_200: s => s.playerLevel >= 200,
};

/**
 * Predefined bot profiles for common player behavior.
 */
export const BOT_PROFILES: Record<string, BenchmarkConfig> = {
	afk: {
		botBehavior: {
			autoBuy: true,
			autoBuyBuildings: true,
			autoBuyPhotonUpgrades: false,
			autoBuySkills: true,
			autoBuyUpgrades: true,
			buyStrategy: 'cheapest',
			clicksPerSecond: 0,
			gameKnowledge: 0.3,
		},
		name: 'AFK Player',
		prestigeStrategy: {
			autoElectronize: true,
			autoProtonise: true,
			electronizeThreshold: 1,
			protoniseThreshold: 1,
		},
		snapshotInterval: 300,
		targetHours: 10,
		tickRate: 1000,
	},
	balanced: {
		botBehavior: {
			autoBuy: true,
			autoBuyBuildings: true,
			autoBuyPhotonUpgrades: true,
			autoBuySkills: true,
			autoBuyUpgrades: true,
			buyStrategy: 'balanced',
			clicksPerSecond: 2,
			gameKnowledge: 0.6,
		},
		name: 'Balanced Player',
		prestigeStrategy: {
			autoElectronize: true,
			autoProtonise: true,
			electronizeThreshold: 5,
			protoniseThreshold: 5,
		},
		snapshotInterval: 120,
		targetHours: 10,
		tickRate: 500,
	},
	tryhard: {
		botBehavior: {
			autoBuy: true,
			autoBuyBuildings: true,
			autoBuyPhotonUpgrades: true,
			autoBuySkills: true,
			autoBuyUpgrades: true,
			buyStrategy: 'mostEfficient',
			clicksPerSecond: 10,
			gameKnowledge: 1.0,
		},
		name: 'Tryhard Player',
		prestigeStrategy: {
			autoElectronize: true,
			autoProtonise: true,
			electronizeThreshold: 10,
			protoniseThreshold: 10,
		},
		snapshotInterval: 60,
		targetHours: 10,
		tickRate: 250,
	},
};
