import {BUILDING_LEVEL_UP_COST, type BuildingType} from '$data/buildings';
import {CurrenciesTypes} from '$data/currencies';
import type {Building, GameState} from '$lib/types';

export const SAVE_KEY = 'atomic-clicker-save';
export const SAVE_VERSION = 14;

// Helper functions for state management
export function loadSavedState(): GameState | null {
	try {
		const saved = localStorage.getItem(SAVE_KEY);
		if (saved) {
			const savedState = migrateSavedState(JSON.parse(saved));
			if (isValidGameState(savedState)) {
				console.log('Valid game state:', savedState);
				return savedState;
			}
			console.log('Invalid game state:', savedState);
		}
	} catch (e) {
		console.error('Failed to load saved game:', e);
	}
	return null;
}

export function isValidGameState(state: any): state is GameState {
	if (!state) return false;

	const checks = [
		[
			'achievements',
			Array.isArray,
		],
		[
			'activePowerUps',
			Array.isArray,
		],
		[
			'atoms',
			(v: any) => typeof v === 'number',
		],
		[
			'buildings',
			(v: any) => typeof v === 'object',
		],
		[
			'electrons',
			(v: any) => typeof v === 'number',
		],
		[
			'highestAPS',
			(v: any) => typeof v === 'number',
		],
		[
			'inGameTime',
			(v: any) => typeof v === 'number',
		],
		[
			'lastSave',
			(v: any) => typeof v === 'number',
		],
		[
			'photons',
			(v: any) => typeof v === 'number',
		],
		[
			'photonUpgrades',
			(v: any) => typeof v === 'object',
		],
		[
			'powerUpsCollected',
			(v: any) => typeof v === 'number',
		],
		[
			'protons',
			(v: any) => typeof v === 'number',
		],
		[
			'settings',
			(v: any) => typeof v === 'object' &&
				typeof v.automation === 'object' &&
				Array.isArray(v.automation.buildings) &&
				typeof v.automation.upgrades === 'boolean'
		],
		[
			'skillUpgrades',
			Array.isArray,
		],
		[
			'startDate',
			(v: any) => typeof v === 'number',
		],
		[
			'totalAtomsEarned',
			(v: any) => typeof v === 'number',
		],
		[
			'totalAtomsEarnedAllTime',
			(v: any) => typeof v === 'number',
		],
		[
			'totalBonusPhotonsClicked',
			(v: any) => typeof v === 'number',
		],
		[
			'totalBuildingsPurchased',
			(v: any) => typeof v === 'number',
		],
		[
			'totalClicks',
			(v: any) => typeof v === 'number',
		],
		[
			'totalClicksAllTime',
			(v: any) => typeof v === 'number',
		],
		[
			'totalElectronizes',
			(v: any) => typeof v === 'number',
		],
		[
			'totalElectronsEarned',
			(v: any) => typeof v === 'number',
		],
		[
			'totalProtonises',
			(v: any) => typeof v === 'number',
		],
		[
			'totalProtonsEarned',
			(v: any) => typeof v === 'number',
		],
		[
			'totalUpgradesPurchased',
			(v: any) => typeof v === 'number',
		],
		[
			'totalXP',
			(v: any) => typeof v === 'number',
		],
		[
			'upgrades',
			Array.isArray,
		],
		[
			'version',
			(v: any) => v === SAVE_VERSION,
		]
	] as const;

	const validated = checks.filter(([key, validator]) => key in state && validator(state[key]));
	if (validated.length !== checks.length) {
		const missingKeys = checks.filter(([key]) => !(key in state));
		console.log('Missing keys:', missingKeys);
	}
	return validated.length === checks.length;
}

function migrateSavedState(savedState: any): GameState | undefined {
	if (!('buildings' in savedState)) return savedState;

	if (!('version' in savedState)) {
		// Migrate from old format
		savedState.buildings = Object.entries(savedState.buildings as Partial<GameState['buildings']>).reduce((acc, [key, value]) => {
			acc[key as BuildingType] = {
				...value,
				unlocked: true,
			};
			return acc;
		}, {} as GameState['buildings']);
	}

	if (savedState.version === 1) {
		// Hard reset due to balancing
		return undefined;
	}

	if (savedState.version === 2) {
		Object.entries<Partial<Building>>(savedState.buildings)?.forEach(([key, building]) => {
			building.level = Math.floor((building.count ?? 0) / BUILDING_LEVEL_UP_COST);
			savedState[key] = building;
		});
		savedState.version = 3;
	}
	if (savedState.version === 3) {
		// Add skillUpgrades
		savedState.skillUpgrades = [];
		savedState.totalXP = 0;
		savedState.version = 4;
	}
	if (savedState.version === 4) {
		// Add totalProtonises
		Object.entries<Partial<Building>>(savedState.buildings)?.forEach(([key, building]) => {
			savedState[key].cost = {
				amount: typeof building.cost === 'number' ? building.cost : building.cost?.amount,
				currency: CurrenciesTypes.ATOMS,
			}
		});
		savedState.protons = 0;
		savedState.totalProtonises = 0;
		savedState.version = 5;
	}
	if (savedState.version === 5) {
		// Add startDate
		savedState.startDate = Date.now();
		savedState.version = 6;
	}
	if (savedState.version === 6) {
		// Add electrons
		savedState.electrons = 0;
		savedState.version = 7;
	}
	if (savedState.version === 7) {
		// Add settings
		savedState.settings = {
			automation: {
				buildings: [],
				upgrades: false
			}
		};
		savedState.version = 8;
	}
	if (savedState.version === 8) {
		// Add totalElectronizes
		savedState.totalElectronizes = 0;
		if (savedState.electrons > 0) {
			savedState.totalElectronizes = 1;
		}
		savedState.version = 9;
	}
	if (savedState.version === 9) {
		// Add totalBonusPhotonsClicked
		savedState.totalBonusPhotonsClicked = 0;
		savedState.version = 10;
	}
	if (savedState.version === 10) {
		// Add photons
		savedState.photons = 0;
		savedState.version = 11;
	}
	if (savedState.version === 11) {
		// Add photonUpgrades
		savedState.photonUpgrades = {};
		savedState.version = 12;
	}
	if (savedState.version === 12) {
		// Add purpleRealmUnlocked
		savedState.purpleRealmUnlocked = false;
		savedState.version = 13;
	}
	if (savedState.version === 13) {
		// Add new stats tracking - initialize from current values
		savedState.highestAPS = 0;
		savedState.inGameTime = 0;
		savedState.powerUpsCollected = 0;
		// Initialize earned stats from current balance as a baseline
		savedState.totalAtomsEarned = savedState.atoms || 0;
		savedState.totalAtomsEarnedAllTime = savedState.atoms || 0;
		// Count total buildings currently owned as baseline
		const buildingsOwned = Object.values(savedState.buildings || {}).reduce((acc: number, b: any) => acc + (b?.count || 0), 0);
		savedState.totalBuildingsPurchased = buildingsOwned;
		// Initialize clicks all time from current run
		savedState.totalClicksAllTime = savedState.totalClicks || 0;
		// Initialize currency earned from current balance
		savedState.totalElectronsEarned = savedState.electrons || 0;
		savedState.totalProtonsEarned = savedState.protons || 0;
		// Count upgrades owned as baseline
		savedState.totalUpgradesPurchased = (savedState.upgrades?.length || 0) + (savedState.skillUpgrades?.length || 0);
		savedState.version = 14;
	}

	return savedState;
}
