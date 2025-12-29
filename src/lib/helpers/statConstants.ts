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
	highestAPS: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 14 },
	inGameTime: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 14 },
	lastSave: { defaultValue: Date.now(), layer: LAYERS.SPECIAL, minVersion: 1 },
	photons: { defaultValue: 0, layer: LAYERS.PHOTON_REALM, minVersion: 11 },
	photonUpgrades: { defaultValue: {}, layer: LAYERS.PHOTON_REALM, minVersion: 12 },
	powerUpsCollected: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 14 },
	protons: { defaultValue: 0, layer: LAYERS.ELECTRONIZE, minVersion: 4 },
	purpleRealmUnlocked: { defaultValue: false, layer: LAYERS.PHOTON_REALM, minVersion: 13 },
	settings: { defaultValue: { automation: { autoClick: false, buildings: [], upgrades: false } }, layer: LAYERS.NEVER, minVersion: 8 },
	skillUpgrades: { defaultValue: [], layer: LAYERS.PROTONIZER, minVersion: 3 },
	startDate: { defaultValue: Date.now(), layer: LAYERS.NEVER, minVersion: 5 },
	totalAtomsEarned: { defaultValue: 0, layer: LAYERS.PROTONIZER, minVersion: 14 },
	totalAtomsEarnedAllTime: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 14 },
	totalBonusPhotonsClicked: { defaultValue: 0, layer: LAYERS.PROTONIZER, minVersion: 10 },
	totalBuildingsPurchased: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 14 },
	totalClicks: { defaultValue: 0, layer: LAYERS.PROTONIZER, minVersion: 1 },
	totalClicksAllTime: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 14 },
	totalElectronizes: { defaultValue: 0, layer: LAYERS.SPECIAL, minVersion: 9 },
	totalElectronsEarned: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 14 },
	totalProtonises: { defaultValue: 0, layer: LAYERS.ELECTRONIZE, minVersion: 4 },
	totalProtonsEarned: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 14 },
	totalUpgradesPurchased: { defaultValue: 0, layer: LAYERS.NEVER, minVersion: 14 },
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
	TOTAL_ATOMS_EARNED: 'totalAtomsEarned',
	TOTAL_ATOMS_EARNED_ALL_TIME: 'totalAtomsEarnedAllTime',
	TOTAL_BONUS_PHOTONS_CLICKED: 'totalBonusPhotonsClicked',
	TOTAL_BUILDINGS_PURCHASED: 'totalBuildingsPurchased',
	TOTAL_CLICKS: 'totalClicks',
	TOTAL_CLICKS_ALL_TIME: 'totalClicksAllTime',
	TOTAL_ELECTRONIZES: 'totalElectronizes',
	TOTAL_ELECTRONS_EARNED: 'totalElectronsEarned',
	TOTAL_PROTONS_EARNED: 'totalProtonsEarned',
	TOTAL_PROTONISES: 'totalProtonises',
	TOTAL_UPGRADES_PURCHASED: 'totalUpgradesPurchased',
	TOTAL_USERS: 'totalUsers',
	TOTAL_XP: 'totalXP',
	UPGRADES: 'upgrades'
} as const;

export type StatName = typeof STATS[keyof typeof STATS];

export const NUMBER_STATS = [
	STATS.ATOMS,
	STATS.ELECTRONS,
	STATS.HIGHEST_APS,
	STATS.IN_GAME_TIME,
	STATS.LAST_SAVE,
	STATS.PHOTONS,
	STATS.POWER_UPS_COLLECTED,
	STATS.PROTONS,
	STATS.START_DATE,
	STATS.TOTAL_ATOMS_EARNED,
	STATS.TOTAL_ATOMS_EARNED_ALL_TIME,
	STATS.TOTAL_BONUS_PHOTONS_CLICKED,
	STATS.TOTAL_BUILDINGS_PURCHASED,
	STATS.TOTAL_CLICKS,
	STATS.TOTAL_CLICKS_ALL_TIME,
	STATS.TOTAL_ELECTRONIZES,
	STATS.TOTAL_ELECTRONS_EARNED,
	STATS.TOTAL_PROTONS_EARNED,
	STATS.TOTAL_PROTONISES,
	STATS.TOTAL_UPGRADES_PURCHASED,
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
