// Game store manager
import {ACHIEVEMENTS} from '$data/achievements';
import {BUILDING_LEVEL_UP_COST, BUILDINGS, type BuildingType} from '$data/buildings';
import {CurrenciesTypes} from '$data/currencies';
import {UPGRADES} from '$data/upgrades';
import {protoniseProtonsGain, PROTONS_ATOMS_REQUIRED} from '$lib/stores/protons';
import {electronizeElectronsGain, ELECTRONS_PROTONS_REQUIRED} from '$lib/stores/electrons';
import {
	achievements,
	activePowerUps,
	atoms,
	buildings,
	electrons,
	lastSave,
	protons,
	skillUpgrades,
	startDate,
	totalClicks,
	totalProtonises,
	totalXP,
	upgrades,
	xpGainMultiplier,
	settings,
} from '$stores/gameStore';
import {info} from '$stores/toasts';
import {derived, get} from 'svelte/store';
import {BUILDING_COST_MULTIPLIER} from '../constants';
import type {Building, GameState, PowerUp, Price} from '../types';
import {loadSavedState, SAVE_KEY, SAVE_VERSION} from './saves';

interface SaveData extends GameState { }

export const currentState = derived(
	[
		achievements,
		activePowerUps,
		atoms,
		electrons,
		protons,
		buildings,
		lastSave,
		settings,
		skillUpgrades,
		startDate,
		totalClicks,
		totalXP,
		upgrades,
		totalProtonises
	],
	([
		achievements,
		activePowerUps,
		atoms,
		electrons,
		protons,
		buildings,
		lastSave,
		settings,
		skillUpgrades,
		startDate,
		totalClicks,
		totalXP,
		upgrades,
		totalProtonises
	]) => {
		return {
			achievements,
			activePowerUps,
			atoms,
			electrons,
			protons,
			buildings,
			lastSave,
			settings,
			skillUpgrades,
			startDate,
			totalClicks,
			totalXP,
			upgrades,
			totalProtonises,
		} as GameState;
	}
);

export function resetGameState(): GameState {
	return {
		achievements: [],
		activePowerUps: [],
		atoms: 0,
		buildings: {},
		electrons: 0,
		lastSave: Date.now(),
		protons: 0,
		settings: {
			automation: {
				buildings: [],
				upgrades: false
			}
		},
		skillUpgrades: [],
		startDate: Date.now(),
		totalClicks: 0,
		totalProtonises: 0,
		totalXP: 0,
		upgrades: [],
		version: SAVE_VERSION,
	};
}

export const gameManager = {
	initialize() {
		const savedState = loadSavedState();
		if (savedState) {
			achievements.set(savedState.achievements.filter(a => a in ACHIEVEMENTS));
			activePowerUps.set(savedState.activePowerUps);
			atoms.set(savedState.atoms);
			buildings.set(savedState.buildings);
			electrons.set(savedState.electrons || 0);
			lastSave.set(savedState.lastSave);
			protons.set(savedState.protons || 0);
			settings.set(savedState.settings || { automation: { buildings: [], upgrades: false } });
			skillUpgrades.set(savedState.skillUpgrades || []);
			startDate.set(savedState.startDate);
			totalClicks.set(savedState.totalClicks);
			totalProtonises.set(savedState.totalProtonises || 0);
			totalXP.set(savedState.totalXP || 0);
			upgrades.set(savedState.upgrades.filter(u => u in UPGRADES));

			get(activePowerUps).forEach(powerUp =>
				setTimeout(() => {
					this.removePowerUp(powerUp.id);
				}, powerUp.duration - (Date.now() - powerUp.startTime))
			);

			// Save in case of data migration
			this.save();
		}

		// Check achievements periodically
		setInterval(() => {
			const state = this.getCurrentState();

			Object.entries(ACHIEVEMENTS).forEach(([name, achievement]) => {
				if (!state.achievements.includes(name) && achievement.condition(state)) {
					achievements.update(current => [
						...current,
						name,
					]);
					info("Achievement unlocked", achievement.name);
				}
			});
		}, 1000);

		// Add XP every 100ms
		let previousAtoms = get(atoms);
		setInterval(() => {
			const currentAtoms = get(atoms);
			const deltaAtoms = currentAtoms - previousAtoms;
			const xpPerAtom = 0.1;
			const xp = deltaAtoms * xpPerAtom;
			const state = this.getCurrentState();
			if (xp > 0 && state.upgrades.includes('feature_levels')) {
				totalXP.update(current => current + xp * get(xpGainMultiplier));
			}
			previousAtoms = currentAtoms;
		}, 100);
	},

	getCurrentState(): GameState {
		return get(currentState);
	},

	addAtoms(amount: number) {
		atoms.update(current => current + amount);
	},

	addCurrency(price: Price) {
		if (price.currency === CurrenciesTypes.ATOMS) {
			atoms.update(current => current + price.amount);
		} else if (price.currency === CurrenciesTypes.ELECTRONS) {
			electrons.update(current => current + price.amount);
		} else if (price.currency === CurrenciesTypes.PROTONS) {
			protons.update(current => current + price.amount);
		}
	},

	canAfford(price: Price): boolean {
		const currency = this.getCurrency(price);
		return currency >= price.amount;
	},

	getCurrency(price: Price): number {
		if (price.currency === CurrenciesTypes.ATOMS) {
			return get(atoms);
		} else if (price.currency === CurrenciesTypes.ELECTRONS) {
			return get(electrons);
		} else if (price.currency === CurrenciesTypes.PROTONS) {
			return get(protons);
		}
		return 0;
	},

	spendCurrency(price: Price): boolean {
		if (!this.canAfford(price)) return false;

		if (price.currency === CurrenciesTypes.ATOMS) {
			atoms.update(current => current - price.amount);
		} else if (price.currency === CurrenciesTypes.ELECTRONS) {
			electrons.update(current => current - price.amount);
		} else if (price.currency === CurrenciesTypes.PROTONS) {
			protons.update(current => current - price.amount);
		}
		return true;
	},

	purchaseBuilding(type: BuildingType, amount: number = 1) {
		const currentState = this.getCurrentState();
		const building = BUILDINGS[type];
		const currentBuilding = currentState.buildings[type] ?? {
			cost: building.cost,
			rate: building.rate,
			level: 0,
			count: 0,
			unlocked: true,
		} as Building;

		// Calculate total cost for all buildings being purchased
		const baseCost = building.cost.amount; // Use original base cost from BUILDINGS
		let totalCost = 0;
		for (let i = 0; i < amount; i++) {
			totalCost += baseCost * (BUILDING_COST_MULTIPLIER ** (currentBuilding.count + i));
		}

		const cost = {
			amount: Math.round(totalCost),
			currency: currentBuilding.cost.currency
		};

		if (!this.spendCurrency(cost)) return false;

		buildings.update(current => ({
			...current,
			[type]: {
				...currentBuilding,
				cost: {
					amount: Math.round(baseCost * (BUILDING_COST_MULTIPLIER ** (currentBuilding.count + amount))),
					currency: cost.currency
				},
				rate: currentBuilding.rate,
				count: currentBuilding.count + amount,
				level: Math.floor((currentBuilding.count + amount) / BUILDING_LEVEL_UP_COST)
			},
		}));

		return true;
	},

	unlockBuilding(type: BuildingType) {
		if (type in get(buildings)) return;

		buildings.update(current => ({
			...current,
			[type]: {
				cost: BUILDINGS[type].cost,
				rate: BUILDINGS[type].rate,
				level: 0,
				count: 0,
				unlocked: true,
			},
		}));
	},

	purchaseUpgrade(id: string) {
		const currentState = this.getCurrentState();
		const upgrade = UPGRADES[id];
		const purchased = currentState.upgrades.includes(id);

		if (!purchased && this.spendCurrency(upgrade.cost)) {
			upgrades.update(current => [
				...current,
				id,
			]);
		}
	},

	protonise() {
		const currentState = this.getCurrentState();
		const protonGain = get(protoniseProtonsGain);

		if (currentState.atoms >= PROTONS_ATOMS_REQUIRED || protonGain > 0) {
			// Keep protons, and electrons upgrades
			const newState = {
				...resetGameState(),
				achievements: currentState.achievements,
				electrons: currentState.electrons,
				protons: currentState.protons + protonGain,
				totalProtonises: currentState.totalProtonises + 1,
				upgrades: currentState.upgrades.filter(id => id.startsWith('proton') || id.startsWith('electron')),
			};

			// Apply quick start upgrades if any
			const quickStartUpgrades = currentState.upgrades
				.filter(id => id.startsWith('protonise_start_'))
				.map(id => UPGRADES[id]);

			if (quickStartUpgrades.length > 0) {
				newState.atoms = Math.max(
					...quickStartUpgrades.map(upgrade =>
						parseInt(upgrade.description.match(/\\d+/)?.[0] || '0')
					)
				);
			}

			// Update all stores except startDate
			achievements.set(newState.achievements);
			activePowerUps.set(newState.activePowerUps);
			atoms.set(newState.atoms);
			protons.set(newState.protons);
			electrons.set(newState.electrons);
			buildings.set(newState.buildings);
			lastSave.set(newState.lastSave);
			skillUpgrades.set(newState.skillUpgrades);
			totalClicks.set(newState.totalClicks);
			totalXP.set(newState.totalXP);
			upgrades.set(newState.upgrades);
			totalProtonises.set(newState.totalProtonises);

			return true;
		}
		return false;
	},

	electronize() {
		const currentState = this.getCurrentState();
		const electronGain = get(electronizeElectronsGain);

		if (currentState.protons >= ELECTRONS_PROTONS_REQUIRED || electronGain > 0) {
			// Keep electrons, and protons upgrades
			const newState = {
				...resetGameState(),
				achievements: currentState.achievements,
				electrons: currentState.electrons + electronGain,
				protons: 0, // Reset protons but keep upgrades
				upgrades: currentState.upgrades.filter(id => id.startsWith('electron') || id.startsWith('proton')),
			};

			// Update all stores except startDate
			achievements.set(newState.achievements);
			activePowerUps.set(newState.activePowerUps);
			atoms.set(newState.atoms);
			electrons.set(newState.electrons);
			protons.set(0); // Reset protons
			buildings.set(newState.buildings);
			lastSave.set(newState.lastSave);
			skillUpgrades.set(newState.skillUpgrades);
			totalClicks.set(newState.totalClicks);
			totalXP.set(newState.totalXP);
			upgrades.set(newState.upgrades);
			totalProtonises.set(0); // Reset protonises count

			return true;
		}
		return false;
	},

	addPowerUp(powerUp: PowerUp) {
		activePowerUps.update(current => [
			...current,
			powerUp,
		]);
	},

	removePowerUp(id: string) {
		activePowerUps.update(current => current.filter(p => p.id !== id));
	},

	reset() {
		const newState = resetGameState();
		achievements.set(newState.achievements);
		activePowerUps.set(newState.activePowerUps);
		atoms.set(newState.atoms);
		buildings.set(newState.buildings);
		electrons.set(newState.electrons);
		lastSave.set(newState.lastSave);
		protons.set(newState.protons);
		skillUpgrades.set(newState.skillUpgrades);
		startDate.set(newState.startDate);
		totalClicks.set(newState.totalClicks);
		totalProtonises.set(newState.totalProtonises);
		totalXP.set(newState.totalXP);
		upgrades.set(newState.upgrades);
	},

	save() {
		const currentState = this.getCurrentState();
		lastSave.set(Date.now());
		localStorage.setItem(SAVE_KEY, JSON.stringify({
			...currentState,
			version: SAVE_VERSION,
		}));
	},

	load(saveData: SaveData) {
		achievements.set(saveData.achievements.filter(a => a in ACHIEVEMENTS));
		activePowerUps.set(saveData.activePowerUps);
		atoms.set(saveData.atoms);
		buildings.set(saveData.buildings);
		electrons.set(saveData.electrons || 0);
		lastSave.set(saveData.lastSave);
		protons.set(saveData.protons || 0);
		settings.set(saveData.settings || { automation: { buildings: [], upgrades: false } });
		skillUpgrades.set(saveData.skillUpgrades);
		startDate.set(saveData.startDate);
		totalClicks.set(saveData.totalClicks);
		totalProtonises.set(saveData.totalProtonises || 0);
		totalXP.set(saveData.totalXP || 0);
		upgrades.set(saveData.upgrades.filter(u => u in UPGRADES));
	},

	toggleAutomation(type: BuildingType) {
		settings.update(current => {
			const buildings = current.automation.buildings;
			const index = buildings.indexOf(type);
			
			return {
				...current,
				automation: {
					...current.automation,
					buildings: index === -1 ? [...buildings, type] : buildings.filter(b => b !== type)
				}
			};
		});
	},

	toggleUpgradeAutomation() {
		settings.update(current => ({
			...current,
			automation: {
				...current.automation,
				upgrades: !current.automation.upgrades
			}
		}));
	},
};
