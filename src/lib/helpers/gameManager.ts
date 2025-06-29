import { ACHIEVEMENTS } from '$data/achievements';
import { BUILDING_LEVEL_UP_COST, BUILDINGS, type BuildingType } from '$data/buildings';
import { CurrenciesTypes } from '$data/currencies';
import { UPGRADES } from '$data/upgrades';
import { protoniseProtonsGain } from '$stores/protons';
import { electronizeElectronsGain } from '$stores/electrons';
import { PROTONS_ATOMS_REQUIRED, ELECTRONS_PROTONS_REQUIRED } from '../constants';
import { info } from '$stores/toasts';
import { get } from 'svelte/store';
import { BUILDING_COST_MULTIPLIER } from '../constants';
import type { Building, PowerUp, Price } from '../types';
import { SAVE_KEY } from './saves';
import { LAYERS, STATS, type NumberStatName, type ArrayStatName } from './statConstants';
import {
	statManager,
	achievements,
	atoms,
	buildings,
	electrons,
	protons,
	upgrades,
	xpGainMultiplier,
	getCurrentState,
	settings
} from '$stores/gameStore';

export const gameManager = {
	initialize() {
		this.loadGame();
		this.setupAchievementChecking();
		this.setupXPGeneration();
	},

	loadGame() {
		try {
			const saved = localStorage.getItem(SAVE_KEY);
			if (saved) {
				const savedData = JSON.parse(saved);
				if (statManager.isValidSaveData(savedData)) {
					statManager.loadSaveData(savedData);
					console.log('Game loaded successfully');
					this.save();
				}
			}
		} catch (e) {
			console.error('Failed to load saved game:', e);
		}
	},

	setupAchievementChecking() {
		setInterval(() => {
			const state = getCurrentState();
			const currentAchievements = achievements.get();

			Object.entries(ACHIEVEMENTS).forEach(([id, achievement]) => {
				if (!currentAchievements.includes(id) && achievement.condition(state)) {
					achievements.push(id);
					info("Achievement unlocked", achievement.name);
				}
			});
		}, 1000);
	},

	setupXPGeneration() {
		let previousAtoms = atoms.get();
		setInterval(() => {
			const currentAtoms = atoms.get();
			const deltaAtoms = currentAtoms - previousAtoms;
			const xpPerAtom = 0.1;
			const xp = deltaAtoms * xpPerAtom;

			if (xp > 0 && upgrades.includes('feature_levels')) {
				this.addStat(STATS.TOTAL_XP, xp * get(xpGainMultiplier));
			}
			previousAtoms = currentAtoms;
		}, 100);
	},

	canAfford(price: Price): boolean {
		return this.getCurrency(price) >= price.amount;
	},

	getCurrency(price: Price): number {
		if (price.currency === CurrenciesTypes.ATOMS) {
			return atoms.get();
		} else if (price.currency === CurrenciesTypes.ELECTRONS) {
			return electrons.get();
		} else if (price.currency === CurrenciesTypes.PROTONS) {
			return protons.get();
		}
		return 0;
	},

	spendCurrency(price: Price): boolean {
		if (!this.canAfford(price)) return false;

		if (price.currency === CurrenciesTypes.ATOMS) {
			this.addStat(STATS.ATOMS, -price.amount);
		} else if (price.currency === CurrenciesTypes.ELECTRONS) {
			this.addStat(STATS.ELECTRONS, -price.amount);
		} else if (price.currency === CurrenciesTypes.PROTONS) {
			this.addStat(STATS.PROTONS, -price.amount);
		}
		return true;
	},

	purchaseBuilding(type: BuildingType, amount: number = 1) {
		const buildingsData = buildings.get();
		const building = BUILDINGS[type];
		const currentBuilding = buildingsData[type] ?? {
			cost: building.cost,
			rate: building.rate,
			level: 0,
			count: 0,
			unlocked: true,
		} as Building;

		const baseCost = building.cost.amount;
		let totalCost = 0;
		for (let i = 0; i < amount; i++) {
			totalCost += baseCost * (BUILDING_COST_MULTIPLIER ** (currentBuilding.count + i));
		}

		const cost = {
			amount: Math.round(totalCost),
			currency: currentBuilding.cost.currency
		};

		if (!this.spendCurrency(cost)) return false;

		const newBuilding = {
			...currentBuilding,
			cost: {
				amount: Math.round(baseCost * (BUILDING_COST_MULTIPLIER ** (currentBuilding.count + amount))),
				currency: cost.currency
			},
			count: currentBuilding.count + amount,
			level: Math.floor((currentBuilding.count + amount) / BUILDING_LEVEL_UP_COST)
		};

		buildings.update(current => ({
			...current,
			[type]: newBuilding
		}));

		return true;
	},

	unlockBuilding(type: BuildingType) {
		const buildingsData = buildings.get();
		if (type in buildingsData) return;

		buildings.update(current => ({
			...current,
			[type]: {
				cost: BUILDINGS[type].cost,
				rate: BUILDINGS[type].rate,
				level: 0,
				count: 0,
				unlocked: true,
			}
		}));
	},

	purchaseUpgrade(id: string) {
		const upgrade = UPGRADES[id];
		const currentUpgrades = upgrades.get();
		const purchased = currentUpgrades.includes(id);

		if (!purchased && this.spendCurrency(upgrade.cost)) {
			statManager.getArray<string>(STATS.UPGRADES)?.push(id);
			return true;
		}
		return false;
	},

	protonise() {
		const currentAtoms = atoms.get();
		const protonGain = get(protoniseProtonsGain);

		if (currentAtoms >= PROTONS_ATOMS_REQUIRED || protonGain > 0) {
			const currentUpgrades = upgrades.get();
			const persistentUpgrades = currentUpgrades.filter(id =>
				id.startsWith('proton') || id.startsWith('electron')
			);

			// Increment protonise counter before reset
			this.addStat(STATS.TOTAL_PROTONISES, 1);
			// Reset all stats at protonizer layer and above
			statManager.resetLayer(LAYERS.PROTONIZER);
			// Restore persistent upgrades
			statManager.getArray<string>(STATS.UPGRADES)?.set(persistentUpgrades);
			this.addStat(STATS.PROTONS, protonGain);

			this.save();
			return true;
		}
		return false;
	},

	electronize() {
		const currentProtons = protons.get();
		const electronGain = get(electronizeElectronsGain);

		if (currentProtons >= ELECTRONS_PROTONS_REQUIRED || electronGain > 0) {
			const currentUpgrades = upgrades.get();
			const persistentUpgrades = currentUpgrades.filter(id =>
				id.startsWith('electron') || id.startsWith('proton')
			);

			// Increment electronize counter before reset
			this.addStat(STATS.TOTAL_ELECTRONIZES, 1);
			// Reset protonise counter
			statManager.getNumber(STATS.TOTAL_PROTONISES)?.reset();
			// Reset all stats at electronize layer and above
			statManager.resetLayer(LAYERS.ELECTRONIZE);
			// Restore persistent upgrades
			statManager.getArray<string>(STATS.UPGRADES)?.set(persistentUpgrades);
			this.addStat(STATS.ELECTRONS, electronGain);

			this.save();
			return true;
		}
		return false;
	},

	addPowerUp(powerUp: PowerUp) {
		statManager.getArray<PowerUp>(STATS.ACTIVE_POWER_UPS)?.push(powerUp);

		setTimeout(() => {
			this.removePowerUp(powerUp.id);
		}, powerUp.duration);
	},

	removePowerUp(id: string) {
		statManager.getArray<PowerUp>(STATS.ACTIVE_POWER_UPS)?.removeBy((powerUp: PowerUp) => powerUp.id === id);
	},

	save() {
		statManager.getNumber(STATS.LAST_SAVE)?.set(Date.now());
		const saveData = statManager.getSaveData();
		localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
	},

	reset() {
		statManager.resetAll();
		statManager.getNumber(STATS.START_DATE)?.set(Date.now());
		this.save();
	},

	getCurrentState,

	addStat(statName: NumberStatName, amount: number) {
		const stat = statManager.getNumber(statName);
		stat?.add(amount);
	},

	multiplyStat(statName: NumberStatName, factor: number) {
		const stat = statManager.getNumber(statName);
		stat?.multiply(factor);
	},

	addAtoms: (amount: number) => gameManager.addStat(STATS.ATOMS, amount),
	incrementClicks: () => gameManager.addStat(STATS.TOTAL_CLICKS, 1),
	incrementBonusPhotonClicks: () => gameManager.addStat(STATS.TOTAL_BONUS_PHOTONS_CLICKED, 1),

	toggleAutomation(buildingType: BuildingType) {
		settings.update(current => {
			const buildings = [...current.automation.buildings];
			const index = buildings.indexOf(buildingType);

			if (index === -1) {
				buildings.push(buildingType);
			} else {
				buildings.splice(index, 1);
			}

			return {
				...current,
				automation: {
					...current.automation,
					buildings
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

	unlockAchievement(achievementId: string) {
		const currentAchievements = achievements.get();
		if (!currentAchievements.includes(achievementId)) {
			achievements.push(achievementId);
		}
	}
};
