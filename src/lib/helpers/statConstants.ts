// Layer types
// 0 = never reset
// 1 = reset all stats at layer
// 2 = reset all stats at layer and layer 1
// 3 = reset all stats at layer and layer 1 and layer 2 etc...

export const LAYERS = {
	ELECTRONIZE: 2,
	NEVER: 0,
	PHOTON_REALM: 3,
	PROTONIZER: 1,
	SPECIAL: -1
} as const;

export type LayerType = typeof LAYERS[keyof typeof LAYERS];

export interface StatConfig<T = any> {
	defaultValue: T;
	description?: string;
	layer: LayerType;
	minVersion: number;
	saveable?: boolean;
}

export const statsConfig: Record<string, StatConfig> = {
	achievements: { defaultValue: [], layer: LAYERS.NEVER, minVersion: 1 },
	activePowerUps: { defaultValue: [], layer: LAYERS.PROTONIZER, minVersion: 1, saveable: true },
	atoms: { defaultValue: 0, layer: LAYERS.PROTONIZER, minVersion: 1 },
	buildings: { defaultValue: {}, layer: LAYERS.PROTONIZER, minVersion: 1 },
	electrons: { defaultValue: 0, layer: LAYERS.SPECIAL, minVersion: 6 },
	excitedPhotons: { defaultValue: 0, layer: LAYERS.PHOTON_REALM, minVersion: 16 },
	highestAPS: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 14 },
	inGameTime: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 14 },
	lastSave: { defaultValue: Date.now(), layer: LAYERS.SPECIAL, minVersion: 1 },
	photons: { defaultValue: 0, layer: LAYERS.PHOTON_REALM, minVersion: 11 },
	photonUpgrades: { defaultValue: {}, layer: LAYERS.PHOTON_REALM, minVersion: 12 },
	powerUpsCollected: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 14 },
	protons: { defaultValue: 0, layer: LAYERS.ELECTRONIZE, minVersion: 4 },
	purpleRealmUnlocked: { defaultValue: false, layer: LAYERS.PHOTON_REALM, minVersion: 13 },
	settings: { defaultValue: { automation: { autoClick: false, autoClickPhotons: false, buildings: [], upgrades: false } }, layer: LAYERS.NEVER, minVersion: 8 },
	skillUpgrades: { defaultValue: [], layer: LAYERS.PROTONIZER, minVersion: 3 },
	startDate: { defaultValue: Date.now(), layer: LAYERS.NEVER, minVersion: 5 },
	totalAtomsEarnedAllTime: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 14 },
	totalAtomsEarnedRun: { defaultValue: 0, layer: LAYERS.PROTONIZER, minVersion: 16 },
	totalBonusHiggsBosonClickedAllTime: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 16 },
	totalBonusHiggsBosonClickedRun: { defaultValue: 0, layer: LAYERS.PROTONIZER, minVersion: 16 },
	totalBuildingsPurchasedAllTime: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 16 },
	totalClicksAllTime: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 14 },
	totalClicksRun: { defaultValue: 0, layer: LAYERS.PROTONIZER, minVersion: 16 },
	totalElectronizesAllTime: { defaultValue: 0, layer: LAYERS.SPECIAL, minVersion: 16 },
	totalElectronizesRun: { defaultValue: 0, layer: LAYERS.SPECIAL, minVersion: 16 },
	totalElectronsEarnedAllTime: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 16 },
	totalElectronsEarnedRun: { defaultValue: 0, layer: LAYERS.ELECTRONIZE, minVersion: 16 },
	totalExcitedPhotonsEarnedAllTime: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 16 },
	totalExcitedPhotonsEarnedRun: { defaultValue: 0, layer: LAYERS.PHOTON_REALM, minVersion: 16 },
	totalPhotonsEarnedAllTime: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 16 },
	totalPhotonsEarnedRun: { defaultValue: 0, layer: LAYERS.PHOTON_REALM, minVersion: 16 },
	totalProtonisesAllTime: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 16 },
	totalProtonisesRun: { defaultValue: 0, layer: LAYERS.ELECTRONIZE, minVersion: 16 },
	totalProtonsEarnedAllTime: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 16 },
	totalProtonsEarnedRun: { defaultValue: 0, layer: LAYERS.ELECTRONIZE, minVersion: 16 },
	totalUpgradesPurchasedAllTime: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 16 },
	totalUsers: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 15, saveable: false },
	totalXP: { defaultValue: 0, layer: LAYERS.PROTONIZER, minVersion: 3 },
	upgrades: { defaultValue: [], layer: LAYERS.PROTONIZER, minVersion: 1 }
};

export const STATS = {
	ACHIEVEMENTS: 'achievements',
	ACTIVE_POWER_UPS: 'activePowerUps',
	ATOMS: 'atoms',
	BUILDINGS: 'buildings',
	ELECTRONS: 'electrons',
	EXCITED_PHOTONS: 'excitedPhotons',
	HIGHEST_APS: 'highestAPS',
	IN_GAME_TIME: 'inGameTime',
	LAST_SAVE: 'lastSave',
	PHOTONS: 'photons',
	PHOTON_UPGRADES: 'photonUpgrades',
	POWER_UPS_COLLECTED: 'powerUpsCollected',
	PROTONS: 'protons',
	PURPLE_REALM_UNLOCKED: 'purpleRealmUnlocked',
	SETTINGS: 'settings',
	SKILL_UPGRADES: 'skillUpgrades',
	START_DATE: 'startDate',
	TOTAL_ATOMS_EARNED_ALL_TIME: 'totalAtomsEarnedAllTime',
	TOTAL_ATOMS_EARNED_RUN: 'totalAtomsEarnedRun',
	TOTAL_BONUS_HIGGS_BOSON_CLICKED_ALL_TIME: 'totalBonusHiggsBosonClickedAllTime',
	TOTAL_BONUS_HIGGS_BOSON_CLICKED_RUN: 'totalBonusHiggsBosonClickedRun',
	TOTAL_BUILDINGS_PURCHASED_ALL_TIME: 'totalBuildingsPurchasedAllTime',
	TOTAL_CLICKS_ALL_TIME: 'totalClicksAllTime',
	TOTAL_CLICKS_RUN: 'totalClicksRun',
	TOTAL_ELECTRONIZES_ALL_TIME: 'totalElectronizesAllTime',
	TOTAL_ELECTRONIZES_RUN: 'totalElectronizesRun',
	TOTAL_ELECTRONS_EARNED_ALL_TIME: 'totalElectronsEarnedAllTime',
	TOTAL_ELECTRONS_EARNED_RUN: 'totalElectronsEarnedRun',
	TOTAL_EXCITED_PHOTONS_EARNED_ALL_TIME: 'totalExcitedPhotonsEarnedAllTime',
	TOTAL_EXCITED_PHOTONS_EARNED_RUN: 'totalExcitedPhotonsEarnedRun',
	TOTAL_PHOTONS_EARNED_ALL_TIME: 'totalPhotonsEarnedAllTime',
	TOTAL_PHOTONS_EARNED_RUN: 'totalPhotonsEarnedRun',
	TOTAL_PROTONISES_ALL_TIME: 'totalProtonisesAllTime',
	TOTAL_PROTONISES_RUN: 'totalProtonisesRun',
	TOTAL_PROTONS_EARNED_ALL_TIME: 'totalProtonsEarnedAllTime',
	TOTAL_PROTONS_EARNED_RUN: 'totalProtonsEarnedRun',
	TOTAL_UPGRADES_PURCHASED_ALL_TIME: 'totalUpgradesPurchasedAllTime',
	TOTAL_USERS: 'totalUsers',
	TOTAL_XP: 'totalXP',
	UPGRADES: 'upgrades'
} as const;

export type StatName = typeof STATS[keyof typeof STATS];

export const NUMBER_STATS = [
	STATS.ATOMS,
	STATS.ELECTRONS,
	STATS.EXCITED_PHOTONS,
	STATS.HIGHEST_APS,
	STATS.IN_GAME_TIME,
	STATS.LAST_SAVE,
	STATS.PHOTONS,
	STATS.POWER_UPS_COLLECTED,
	STATS.PROTONS,
	STATS.START_DATE,
	STATS.TOTAL_ATOMS_EARNED_ALL_TIME,
	STATS.TOTAL_ATOMS_EARNED_RUN,
	STATS.TOTAL_BONUS_HIGGS_BOSON_CLICKED_ALL_TIME,
	STATS.TOTAL_BONUS_HIGGS_BOSON_CLICKED_RUN,
	STATS.TOTAL_BUILDINGS_PURCHASED_ALL_TIME,
	STATS.TOTAL_CLICKS_ALL_TIME,
	STATS.TOTAL_CLICKS_RUN,
	STATS.TOTAL_ELECTRONIZES_ALL_TIME,
	STATS.TOTAL_ELECTRONIZES_RUN,
	STATS.TOTAL_ELECTRONS_EARNED_ALL_TIME,
	STATS.TOTAL_ELECTRONS_EARNED_RUN,
	STATS.TOTAL_EXCITED_PHOTONS_EARNED_ALL_TIME,
	STATS.TOTAL_EXCITED_PHOTONS_EARNED_RUN,
	STATS.TOTAL_PHOTONS_EARNED_ALL_TIME,
	STATS.TOTAL_PHOTONS_EARNED_RUN,
	STATS.TOTAL_PROTONISES_ALL_TIME,
	STATS.TOTAL_PROTONISES_RUN,
	STATS.TOTAL_PROTONS_EARNED_ALL_TIME,
	STATS.TOTAL_PROTONS_EARNED_RUN,
	STATS.TOTAL_UPGRADES_PURCHASED_ALL_TIME,
	STATS.TOTAL_USERS,
	STATS.TOTAL_XP
] as const;

export const ARRAY_STATS = [
	STATS.ACHIEVEMENTS,
	STATS.ACTIVE_POWER_UPS,
	STATS.SKILL_UPGRADES,
	STATS.UPGRADES
] as const;

export type NumberStatName = typeof NUMBER_STATS[number];
export type ArrayStatName = typeof ARRAY_STATS[number];
