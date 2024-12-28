// Game store manager
import {ACHIEVEMENTS} from '$data/achievements';
import {BUILDING_LEVEL_UP_COST, BUILDINGS, type BuildingType} from '$data/buildings';
import {CurrenciesTypes} from '$data/currencies';
import {UPGRADES} from '$data/upgrades';
import {protoniseProtonsGain, PROTONS_ATOMS_REQUIRED} from '$lib/stores/protons';
import {
	achievements,
	activePowerUps,
	atoms,
	buildings,
	lastSave,
	protons,
	skillUpgrades,
	startDate,
	totalClicks,
	totalProtonises,
	totalXP,
	upgrades,
	xpGainMultiplier,
} from '$stores/gameStore';
import {info} from '$stores/toasts';
import {derived, get} from 'svelte/store';
import {BUILDING_COST_MULTIPLIER} from '../constants';
import type {Building, GameState, PowerUp, Price} from '../types';
import {loadSavedState, SAVE_KEY, SAVE_VERSION} from './saves';

interface SaveData extends GameState { }

export const currentState = derived([achievements, activePowerUps, atoms, protons, buildings, lastSave, skillUpgrades, startDate, totalClicks, totalXP, upgrades, totalProtonises], ([achievements, activePowerUps, atoms, protons, buildings, lastSave, skillUpgrades, startDate, totalClicks, totalXP, upgrades, totalProtonises]) => {
	return {
		achievements,
		activePowerUps,
		atoms,
		protons,
		buildings,
		lastSave,
		skillUpgrades,
		startDate,
		totalClicks,
		totalXP,
		upgrades,
		totalProtonises,
	} as GameState;
});

export function resetGameState(): GameState {
	return {
		achievements: [],
		activePowerUps: [],
		atoms: 0,
		protons: 0,
		buildings: {},
		lastSave: Date.now(),
		skillUpgrades: [],
		startDate: Date.now(),
		totalClicks: 0,
		totalXP: 0,
		upgrades: [],
		version: SAVE_VERSION,
		totalProtonises: 0,
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
			lastSave.set(savedState.lastSave);
			protons.set(savedState.protons || 0);
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
			if (xp > 0) {
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
		} else if (price.currency === CurrenciesTypes.PROTONS) {
			return get(protons);
		}
		return 0;
	},

	spendCurrency(price: Price): boolean {
		if (!this.canAfford(price)) return false;

		if (price.currency === CurrenciesTypes.ATOMS) {
			atoms.update(current => current - price.amount);
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
		const baseCost = currentBuilding.cost.amount / BUILDING_COST_MULTIPLIER; // Get the actual base cost
		let totalCost = 0;
		for (let i = 0; i < amount; i++) {
			totalCost += baseCost * (BUILDING_COST_MULTIPLIER ** (currentBuilding.count + i + 1));
		}

		const cost = {
			amount: Math.round(totalCost),
			currency: currentBuilding.cost.currency
		};

		if (!this.spendCurrency(cost)) return;

		buildings.update(current => ({
			...current,
			[type]: {
				...currentBuilding,
				cost: {
					amount: Math.round(baseCost * (BUILDING_COST_MULTIPLIER ** (currentBuilding.count + amount + 1))),
					currency: cost.currency
				},
				rate: currentBuilding.rate,
				count: currentBuilding.count + amount,
				level: Math.floor((currentBuilding.count + amount) / BUILDING_LEVEL_UP_COST)
			},
		}));
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
			// Keep protons and increment them
			const newState = {
				...resetGameState(),
				achievements: currentState.achievements,
				protons: currentState.protons + protonGain,
				totalProtonises: currentState.totalProtonises + 1,
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
		lastSave.set(saveData.lastSave);
		protons.set(saveData.protons || 0);
		totalClicks.set(saveData.totalClicks);
		totalProtonises.set(saveData.totalProtonises || 0);
		skillUpgrades.set(saveData.skillUpgrades);
		startDate.set(saveData.startDate);
		totalXP.set(saveData.totalXP);
		upgrades.set(saveData.upgrades.filter(u => u in UPGRADES));
	},
};
