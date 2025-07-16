export const LAYERS = {
	NEVER: 0,
	PROTONIZER: 1,
	ELECTRONIZE: 2,
	SPECIAL: -1
} as const;

export const STATS = {
	ACHIEVEMENTS: 'achievements',
	ACTIVE_POWER_UPS: 'activePowerUps',
	ATOMS: 'atoms',
	BUILDINGS: 'buildings',
	ELECTRONS: 'electrons',
	LAST_SAVE: 'lastSave',
	PHOTONS: 'photons',
	PHOTON_UPGRADES: 'photonUpgrades',
	PROTONS: 'protons',
	SETTINGS: 'settings',
	SKILL_UPGRADES: 'skillUpgrades',
	START_DATE: 'startDate',
	TOTAL_BONUS_PHOTONS_CLICKED: 'totalBonusPhotonsClicked',
	TOTAL_CLICKS: 'totalClicks',
	TOTAL_ELECTRONIZES: 'totalElectronizes',
	TOTAL_PROTONISES: 'totalProtonises',
	TOTAL_XP: 'totalXP',
	UPGRADES: 'upgrades'
} as const;

export type LayerType = typeof LAYERS[keyof typeof LAYERS];
export type StatName = typeof STATS[keyof typeof STATS];

export const NUMBER_STATS = [
	STATS.ATOMS,
	STATS.ELECTRONS,
	STATS.LAST_SAVE,
	STATS.PHOTONS,
	STATS.PROTONS,
	STATS.START_DATE,
	STATS.TOTAL_BONUS_PHOTONS_CLICKED,
	STATS.TOTAL_CLICKS,
	STATS.TOTAL_ELECTRONIZES,
	STATS.TOTAL_PROTONISES,
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
