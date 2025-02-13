import {BUILDING_LEVEL_UP_COST, type BuildingType} from '$data/buildings';
import {CurrenciesTypes} from '$data/currencies';
import type {Building, GameState} from '../types';

export const SAVE_KEY = 'atomic-clicker-save';
export const SAVE_VERSION = 7;

// Helper functions for state management
export function loadSavedState(): GameState | null {
	try {
		const saved = localStorage.getItem(SAVE_KEY);
		if (saved) {
			const savedState = migrateSavedState(JSON.parse(saved));
			if (isValidGameState(savedState)) {
				return savedState;
			}
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
			'lastSave',
			(v: any) => typeof v === 'number',
		],
		[
			'protons',
			(v: any) => typeof v === 'number',
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
			'totalClicks',
			(v: any) => typeof v === 'number',
		],
		[
			'totalProtonises',
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

	return savedState;
}
