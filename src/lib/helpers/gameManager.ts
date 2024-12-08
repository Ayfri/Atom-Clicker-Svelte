// Game store manager
import {get} from 'svelte/store';
import {BUILDING_COST_MULTIPLIER} from '../constants';
import {ACHIEVEMENTS} from '../data/achievements';
import {BUILDING_LEVEL_UP_COST, BUILDINGS, type BuildingType} from '../data/buildings';
import {UPGRADES} from '../data/upgrades';
import {loadSavedState, SAVE_KEY, SAVE_VERSION} from './saves';
import {achievements, activePowerUps, atoms, buildings, lastSave, totalClicks, upgrades, skillUpgrades} from '../stores/gameStore';
import {info} from '../stores/toasts';
import type {GameState, PowerUp} from '../types';
import type { Building } from '../types';

interface SaveData {
	achievements: string[];
	activePowerUps: PowerUp[];
	atoms: number;
	buildings: Record<BuildingType, Building>;
	lastSave: number;
	totalClicks: number;
	upgrades: string[];
	version: number;
	skillUpgrades: string[];
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
			totalClicks.set(savedState.totalClicks);
			upgrades.set(savedState.upgrades.filter(u => u in UPGRADES));
			skillUpgrades.set(savedState.skillUpgrades || []);

			get(activePowerUps).forEach(powerUp =>
				setTimeout(() => {
					this.removePowerUp(powerUp.id);
				}, powerUp.duration - (Date.now() - powerUp.startTime))
			);

			// Save in case of data migration
			this.save();
		} else {
			skillUpgrades.set([]);
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
	},

	getCurrentState(): GameState {
		return {
			achievements: get(achievements),
			activePowerUps: get(activePowerUps),
			atoms: get(atoms),
			buildings: get(buildings),
			lastSave: get(lastSave),
			totalClicks: get(totalClicks),
			upgrades: get(upgrades),
			version: SAVE_VERSION,
			skillUpgrades: get(skillUpgrades),
		};
	},

	addAtoms(amount: number) {
		atoms.update(current => current + amount);
	},

	purchaseBuilding(type: BuildingType) {
		const currentState = this.getCurrentState();
		const building = BUILDINGS[type];
		const currentBuilding = currentState.buildings[type] ?? {
			cost: building.cost,
			rate: building.rate,
			level: 0,
			count: 0,
			unlocked: true,
		};

		if (currentState.atoms < currentBuilding.cost) return;

		atoms.update(current => current - currentBuilding.cost);
		buildings.update(current => ({
			...current,
			[type]: {
				...currentBuilding,
				cost: Math.round(currentBuilding.cost * BUILDING_COST_MULTIPLIER),
				rate: currentBuilding.rate,
				count: currentBuilding.count + 1,
				level: Math.floor((currentBuilding.count + 1) / BUILDING_LEVEL_UP_COST)
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

		if (!purchased && currentState.atoms >= upgrade.cost) {
			atoms.update(current => current - upgrade.cost);
			upgrades.update(current => [
				...current,
				id,
			]);
		}
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
		achievements.set([]);
		activePowerUps.set([]);
		atoms.set(0);
		buildings.set({});
		lastSave.set(Date.now());
		totalClicks.set(0);
		upgrades.set([]);
		skillUpgrades.set([]);
	},

	save() {
		const currentState = this.getCurrentState();
		localStorage.setItem(SAVE_KEY, JSON.stringify(currentState));
	},

	load(saveData: SaveData) {
		achievements.set(saveData.achievements.filter(a => a in ACHIEVEMENTS));
		activePowerUps.set(saveData.activePowerUps);
		atoms.set(saveData.atoms);
		buildings.set(saveData.buildings);
		lastSave.set(saveData.lastSave);
		totalClicks.set(saveData.totalClicks);
		upgrades.set(saveData.upgrades.filter(u => u in UPGRADES));
		skillUpgrades.set(saveData.skillUpgrades);
	},
};
