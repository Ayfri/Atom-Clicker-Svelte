import {BUILDING_LEVEL_UP_COST, type BuildingType} from '$data/buildings';
import {CurrenciesTypes} from '$data/currencies';
import type {Building, GameState} from '$lib/types';
import {saveRecovery, type SaveErrorType} from '$stores/saveRecovery';
import { statsConfig } from '$helpers/statConstants';

export const SAVE_KEY = 'atomic-clicker-save';
export const SAVE_VERSION = 14;

export interface LoadSaveResult {
	errorDetails?: string;
	errorType?: SaveErrorType;
	rawData?: string;
	state: GameState | null;
	success: boolean;
}

// Helper functions for state management
export function loadSavedState(): LoadSaveResult {
	let rawData: string | null = null;

	try {
		rawData = localStorage.getItem(SAVE_KEY);
		if (!rawData) {
			return { state: null, success: true }; // No save exists, not an error
		}

		// Step 1: Try to parse JSON
		let parsedData: any;
		try {
			parsedData = JSON.parse(rawData);
		} catch (parseError) {
			console.error('Failed to parse save JSON:', parseError);
			return {
				errorDetails: `JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
				errorType: 'invalid_json',
				rawData,
				state: null,
				success: false,
			};
		}

		// Step 2: Try to migrate
		let migratedState: GameState | undefined;
		try {
			migratedState = migrateSavedState(parsedData);
		} catch (migrateError) {
			console.error('Failed to migrate save:', migrateError);
			// Try to recover without migration if it's already current version
			if (parsedData.version === SAVE_VERSION) {
				migratedState = parsedData;
			} else {
				return {
					errorDetails: `Migration from v${parsedData.version || 'unknown'} failed: ${migrateError instanceof Error ? migrateError.message : 'Unknown error'}`,
					errorType: 'migration_failed',
					rawData,
					state: null,
					success: false,
				};
			}
		}

		if (!migratedState) {
			return {
				errorDetails: 'Save migration returned empty result',
				errorType: 'migration_failed',
				rawData,
				state: null,
				success: false,
			};
		}

		// Step 3: Validate and try to repair if needed
		const validationResult = validateAndRepairGameState(migratedState);
		if (validationResult.valid) {
			console.log('Valid game state:', validationResult.state);
			return { state: validationResult.state, success: true };
		}

		// If repair was attempted but still invalid
		if (validationResult.repaired && validationResult.state) {
			console.log('Game state repaired:', validationResult.repairs);
			return { state: validationResult.state, success: true };
		}

		return {
			errorDetails: `Validation failed: ${validationResult.errors.join(', ')}`,
			errorType: 'validation_failed',
			rawData,
			state: null,
			success: false,
		};
	} catch (e) {
		console.error('Failed to load saved game:', e);
		return {
			errorDetails: `Unexpected error: ${e instanceof Error ? e.message : 'Unknown error'}`,
			errorType: 'unknown',
			rawData: rawData ?? undefined,
			state: null,
			success: false,
		};
	}
}

// Attempt to load with error handling and recovery popup
export function loadSavedStateWithRecovery(): GameState | null {
	const result = loadSavedState();

	if (result.success) {
		return result.state;
	}

	// Set error in recovery store
	if (result.errorType && result.errorDetails) {
		saveRecovery.setError(result.errorType, result.errorDetails, result.rawData ?? null);
	}

	return null;
}

interface ValidationResult {
	errors: string[];
	repaired: boolean;
	repairs: string[];
	state: GameState | null;
	valid: boolean;
}

function validateAndRepairGameState(state: any): ValidationResult {
	const errors: string[] = [];
	const repairs: string[] = [];
	let repaired = false;

	if (!state || typeof state !== 'object') {
		return { errors: ['State is not an object'], repaired: false, repairs: [], state: null, valid: false };
	}

	// Define custom validators for complex types
	const customValidators: Record<string, (v: any) => boolean> = {
		settings: (v: any) => typeof v === 'object' && v !== null &&
			typeof v.automation === 'object' &&
			Array.isArray(v.automation?.buildings) &&
			typeof v.automation?.upgrades === 'boolean'
	};

	// Generate checks from statsConfig
	const checks = Object.entries(statsConfig).map(([key, config]) => {
		let validator = (v: any) => true;

		if (key in customValidators) {
			validator = customValidators[key];
		} else if (Array.isArray(config.defaultValue)) {
			validator = Array.isArray;
		} else if (typeof config.defaultValue === 'number') {
			validator = (v: any) => typeof v === 'number' && !isNaN(v);
		} else if (typeof config.defaultValue === 'boolean') {
			validator = (v: any) => typeof v === 'boolean';
		} else if (typeof config.defaultValue === 'object' && config.defaultValue !== null) {
			validator = (v: any) => typeof v === 'object' && v !== null;
		}

		return {
			defaultValue: config.defaultValue,
			key,
			validator
		};
	});

	// Try to repair each field
	for (const check of checks) {
		if (!(check.key in state)) {
			state[check.key] = check.defaultValue;
			repairs.push(`Added missing field: ${check.key}`);
			repaired = true;
		} else if (!check.validator(state[check.key])) {
			const oldValue = state[check.key];
			state[check.key] = check.defaultValue;
			repairs.push(`Repaired invalid ${check.key}: ${JSON.stringify(oldValue)} -> ${JSON.stringify(check.defaultValue)}`);
			repaired = true;
		}
	}

	// Handle version separately - we upgrade to current version
	if (state.version !== SAVE_VERSION) {
		state.version = SAVE_VERSION;
		repairs.push(`Updated version to ${SAVE_VERSION}`);
		repaired = true;
	}

	// Repair NaN/Infinity values in numeric fields
	const numericFields = Object.entries(statsConfig)
		.filter(([_, config]) => typeof config.defaultValue === 'number')
		.map(([key]) => key);

	for (const field of numericFields) {
		if (typeof state[field] === 'number' && (isNaN(state[field]) || !isFinite(state[field]))) {
			state[field] = 0;
			repairs.push(`Fixed NaN/Infinity in ${field}`);
			repaired = true;
		}
	}

	// Verify repairs were successful
	const allValid = checks.every(check => check.key in state && check.validator(state[check.key]));

	if (!allValid) {
		const failedChecks = checks.filter(check => !(check.key in state) || !check.validator(state[check.key]));
		for (const check of failedChecks) {
			errors.push(`Field ${check.key} is still invalid after repair`);
		}
	}

	return {
		errors,
		repaired,
		repairs,
		state: allValid ? state as GameState : null,
		valid: allValid && errors.length === 0,
	};
}

// Simple validation check (used by cloud save)
export function isValidGameState(state: any): state is GameState {
	if (!state) return false;
	const result = validateAndRepairGameState(structuredClone(state));
	return result.valid || result.repaired;
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

	while ((savedState.version || 0) < SAVE_VERSION) {
		if (!savedState.version) break;

		const nextVersion = savedState.version + 1;

		// Generic Migration
		for (const [key, config] of Object.entries(statsConfig)) {
			if (config.minVersion <= nextVersion) {
				if (!(key in savedState)) {
					savedState[key] = typeof config.defaultValue === 'object' && config.defaultValue !== null
						? structuredClone(config.defaultValue)
						: config.defaultValue;
				}
			}
		}

		// Specific Migrations
		if (savedState.version === 2) {
			Object.entries<Partial<Building>>(savedState.buildings)?.forEach(([key, building]) => {
				building.level = Math.floor((building.count ?? 0) / BUILDING_LEVEL_UP_COST);
				savedState[key] = building;
			});
		}

		if (savedState.version === 4) {
			Object.entries<Partial<Building>>(savedState.buildings)?.forEach(([key, building]) => {
				savedState[key].cost = {
					amount: typeof building.cost === 'number' ? building.cost : building.cost?.amount,
					currency: CurrenciesTypes.ATOMS,
				}
			});
		}

		if (savedState.version === 8) {
			if (savedState.electrons > 0) {
				savedState.totalElectronizes = 1;
			}
		}

		if (savedState.version === 13) {
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
		}

		savedState.version = nextVersion;
	}

	return savedState;
}
