import { type BuildingType, BUILDINGS, BUILDING_LEVEL_UP_COST } from '$data/buildings';
import { type Building, type PowerUp, type Settings, type GameState, type Price } from '$lib/types';
import { LAYERS, type LayerType } from '$helpers/statConstants';
import { SAVE_VERSION, loadSavedState, SAVE_KEY } from '$helpers/saves';
import { ACHIEVEMENTS } from '$data/achievements';
import { CurrenciesTypes } from '$data/currencies';
import { PHOTON_UPGRADES, getPhotonUpgradeCost } from '$data/photonUpgrades';
import { SKILL_UPGRADES } from '$data/skillTree';
import { statsConfig } from '$helpers/statConstants';
import { UPGRADES } from '$data/upgrades';
import { BUILDING_COST_MULTIPLIER, PROTONS_ATOMS_REQUIRED, ELECTRONS_PROTONS_REQUIRED } from '$lib/constants';
import { calculateEffects, getUpgradesWithEffects } from '$helpers/effects';
import { POWER_UP_DEFAULT_INTERVAL } from '$data/powerUp';
import { info } from '$stores/toasts';
import { saveRecovery } from '$stores/saveRecovery';
import { leaderboardStats } from '$stores/leaderboard.svelte';
import { browser } from '$app/environment';

export class GameManager {
	// Stats
	achievements = $state<string[]>([]);
	activePowerUps = $state<PowerUp[]>([]);
	atoms = $state(0);
	buildings = $state<Partial<Record<BuildingType, Building>>>({});
	electrons = $state(0);
	highestAPS = $state(0);
	inGameTime = $state(0);
	lastSave = $state(Date.now());
	photons = $state(0);
	photonUpgrades = $state<Record<string, number>>({});
	powerUpsCollected = $state(0);
	protons = $state(0);
	purpleRealmUnlocked = $state(false);
	settings = $state<Settings>({
		automation: {
			autoClick: false,
			autoClickPhotons: false,
			buildings: [],
			upgrades: false
		}
	});
	skillUpgrades = $state<string[]>([]);
	startDate = $state(Date.now());
	totalAtomsEarned = $state(0);
	totalAtomsEarnedAllTime = $state(0);
	totalBonusPhotonsClicked = $state(0);
	totalBuildingsPurchased = $state(0);
	totalClicks = $state(0);
	totalClicksAllTime = $state(0);
	totalElectronizes = $state(0);
	totalElectronsEarned = $state(0);
	totalProtonises = $state(0);
	totalProtonsEarned = $state(0);
	totalUpgradesPurchased = $state(0);
	totalUsers = $state(0);
	totalXP = $state(0);
	upgrades = $state<string[]>([]);

	// Configuration for stats (for saving/loading/resetting)
	private statsConfig = statsConfig;

	// Intervals
	private gameInterval: ReturnType<typeof setInterval> | null = null;

	initialize() {
		this.loadGame();
		this.setupInterval();

		if (browser) {
			leaderboardStats.subscribe(stats => {
				this.totalUsers = stats.totalUsers;
			});
		}
	}

	cleanup() {
		if (this.gameInterval) clearInterval(this.gameInterval);
	}

	// Derived values (Getters)

	atomsPerSecond = $derived.by(() => {
		return Object.entries(this.buildings).reduce((total, [type, building]) => {
			if (!building) return total;

			const upgrades = getUpgradesWithEffects(this.currentUpgradesBought, { target: type, type: 'building' });
			const multiplier = calculateEffects(upgrades, this, building.rate);
			const oldMultiplier = Math.pow(building.count / 2, building.level + 1) / 5;
			const linearMultiplier = (building.level + 1) * 100;
			const levelMultiplier = building.level > 0 ? Math.sqrt(oldMultiplier * linearMultiplier) : 1;
			const production = building.count * multiplier * levelMultiplier * this.globalMultiplier * this.bonusMultiplier;

			return total + production;
		}, 0);
	});

	autoClicksPerSecond = $derived.by(() => {
		if (!this.settings.automation.autoClick) return 0;
		const autoClickUpgrades = getUpgradesWithEffects(this.currentUpgradesBought, { type: 'auto_click' });
		return calculateEffects(autoClickUpgrades, this, 0);
	});

	bonusMultiplier = $derived(this.activePowerUps.reduce((acc, powerUp) => acc * powerUp.multiplier, 1));

	buildingProductions = $derived.by(() => {
		return Object.entries(this.buildings).reduce((acc, [type, building]) => {
			let production = 0;
			if (building) {
				const upgrades = getUpgradesWithEffects(this.currentUpgradesBought, { target: type, type: 'building' });
				const multiplier = calculateEffects(upgrades, this, building.rate);
				const oldMultiplier = Math.pow(building.count / 2, building.level + 1) / 5;
				const linearMultiplier = (building.level + 1) * 100;
				const levelMultiplier = building.level > 0 ? Math.sqrt(oldMultiplier * linearMultiplier) : 1;
				production = building.count * multiplier * levelMultiplier * this.globalMultiplier * this.bonusMultiplier;
			}
			return {
				...acc,
				[type]: production,
			};
		}, {} as Record<BuildingType, number>);
	});

	canProtonise = $derived(this.atoms >= PROTONS_ATOMS_REQUIRED || this.protons > 0);

	clickPower = $derived.by(() => {
		const clickUpgrades = getUpgradesWithEffects(this.currentUpgradesBought, { type: 'click' });
		return calculateEffects(clickUpgrades, this, 1) * this.bonusMultiplier;
	});

	currentLevelXP = $derived.by(() => {
		if (this.playerLevel === 0) return this.totalXP;
		const previousLevelXP = Array.from({ length: this.playerLevel }, (_, i) => this.getXPForLevel(i + 1)).reduce((acc, val) => acc + val, 0);
		return Math.max(0, this.totalXP - previousLevelXP);
	});

	currentUpgradesBought = $derived.by(() => {
		const allUpgradeIds = [...this.upgrades, ...this.skillUpgrades];
		return allUpgradeIds
			.filter(id => UPGRADES[id] || SKILL_UPGRADES[id])
			.map(id => UPGRADES[id] || SKILL_UPGRADES[id]);
	});

	electronizeElectronsGain = $derived.by(() => {
		if (this.protons < ELECTRONS_PROTONS_REQUIRED) return 0;

		// Get all electron gain multiplier upgrades
		const electronGainUpgrades = getUpgradesWithEffects(this.currentUpgradesBought, { type: 'electron_gain' });

		// Start with base gain of 1 and apply multipliers
		return calculateEffects(electronGainUpgrades, this, 1);
	});

	globalMultiplier = $derived.by(() => {
		const globalUpgrades = getUpgradesWithEffects(this.currentUpgradesBought, { type: 'global' });
		return calculateEffects(globalUpgrades, this, 1);
	});

	hasAvailableSkillUpgrades = $derived.by(() => {
		if (this.skillPointsAvailable <= 0) return false;

		return Object.values(SKILL_UPGRADES).some(skill => {
			if (this.skillUpgrades.includes(skill.id)) return false;
			if (skill.condition && !skill.condition(this)) return false;
			if (skill.requires && !skill.requires.every(req => this.skillUpgrades.includes(req))) return false;
			return true;
		});
	});

	hasBonus = $derived(this.activePowerUps.length > 0);

	playerLevel = $derived(this.getLevelFromTotalXP(this.totalXP));

	nextLevelXP = $derived(this.getXPForLevel(this.playerLevel + 1));

	powerUpDurationMultiplier = $derived.by(() => {
		const powerUpDurationUpgrades = getUpgradesWithEffects(this.currentUpgradesBought, { type: 'power_up_duration' });
		return calculateEffects(powerUpDurationUpgrades, this, 1);
	});

	powerUpEffectMultiplier = $derived.by(() => {
		const powerUpMultiplierUpgrades = getUpgradesWithEffects(this.currentUpgradesBought, { type: 'power_up_multiplier' });
		return calculateEffects(powerUpMultiplierUpgrades, this, 1);
	});

	powerUpInterval = $derived.by(() => {
		const powerUpIntervalUpgrades = getUpgradesWithEffects(this.currentUpgradesBought, { type: 'power_up_interval' });
		return POWER_UP_DEFAULT_INTERVAL.map(interval => calculateEffects(powerUpIntervalUpgrades, this, interval)) as [number, number];
	});

	protoniseProtonsGain = $derived.by(() => {
		if (this.atoms < PROTONS_ATOMS_REQUIRED) return 0;

		// Calculate base proton gain
		const baseGain = Math.floor(Math.sqrt(this.atoms / PROTONS_ATOMS_REQUIRED));

		// Get all proton gain multiplier upgrades
		const protonGainUpgrades = getUpgradesWithEffects(this.currentUpgradesBought, { type: 'proton_gain' });

		// Apply multipliers to base gain
		return calculateEffects(protonGainUpgrades, this, baseGain);
	});

	skillPointsTotal = $derived(Object.values(this.buildings).reduce((sum, building) => sum + building.level, 0));

	skillPointsAvailable = $derived(this.skillPointsTotal - this.skillUpgrades.length);

	xpGainMultiplier = $derived.by(() => {
		const xpGainUpgrades = getUpgradesWithEffects(this.currentUpgradesBought, { type: 'xp_gain' });
		return calculateEffects(xpGainUpgrades, this, 1);
	});

	xpProgress = $derived((this.currentLevelXP / this.nextLevelXP) * 100);

	// Methods

	// State Management
	getCurrentState(): GameState {
		return {
			achievements: this.achievements,
			activePowerUps: this.activePowerUps,
			atoms: this.atoms,
			buildings: this.buildings,
			electrons: this.electrons,
			highestAPS: this.highestAPS,
			inGameTime: this.inGameTime,
			lastSave: this.lastSave,
			photons: this.photons,
			photonUpgrades: this.photonUpgrades,
			powerUpsCollected: this.powerUpsCollected,
			protons: this.protons,
			purpleRealmUnlocked: this.purpleRealmUnlocked,
			settings: this.settings,
			skillUpgrades: this.skillUpgrades,
			startDate: this.startDate,
			totalAtomsEarned: this.totalAtomsEarned,
			totalAtomsEarnedAllTime: this.totalAtomsEarnedAllTime,
			totalBonusPhotonsClicked: this.totalBonusPhotonsClicked,
			totalBuildingsPurchased: this.totalBuildingsPurchased,
			totalClicks: this.totalClicks,
			totalClicksAllTime: this.totalClicksAllTime,
			totalElectronizes: this.totalElectronizes,
			totalElectronsEarned: this.totalElectronsEarned,
			totalProtonises: this.totalProtonises,
			totalProtonsEarned: this.totalProtonsEarned,
			totalUpgradesPurchased: this.totalUpgradesPurchased,
			totalUsers: this.totalUsers,
			totalXP: this.totalXP,
			upgrades: this.upgrades,
			version: SAVE_VERSION
		};
	}

	loadGame() {
		const result = loadSavedState();

		if (result.success && result.state) {
			this.loadSaveData(result.state);
			console.log('Game loaded successfully');
			this.save();
		} else if (!result.success && result.errorType) {
			saveRecovery.setError(
				result.errorType,
				result.errorDetails || 'Unknown error loading save',
				result.rawData ?? null
			);
			console.error('Save load failed:', result.errorType, result.errorDetails);
		}
	}

	loadSaveData(data: Partial<GameState>) {
		for (const [key, config] of Object.entries(this.statsConfig)) {
			if (key in data) {
				this[key as keyof this] = data[key as keyof GameState] as any;
			}
		}
	}

	save() {
		this.lastSave = Date.now();
		const saveData = this.getCurrentState();
		localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
	}

	// Reset Logic
	reset() {
		this.resetAll();
		this.startDate = Date.now();
		this.save();
	}

	resetAll() {
		for (const [key, config] of Object.entries(this.statsConfig)) {
			this[key as keyof this] = config.defaultValue;
		}
	}

	resetLayer(layer: LayerType) {
		for (const [key, config] of Object.entries(this.statsConfig)) {
			if (config.layer >= layer) {
				this[key as keyof this] = config.defaultValue;
			}
		}
	}

	// Currency & Affordability
	canAfford(price: Price): boolean {
		return this.getCurrency(price) >= price.amount;
	}

	getCurrency(price: Price): number {
		if (price.currency === CurrenciesTypes.ATOMS) return this.atoms;
		if (price.currency === CurrenciesTypes.ELECTRONS) return this.electrons;
		if (price.currency === CurrenciesTypes.PHOTONS) return this.photons;
		if (price.currency === CurrenciesTypes.PROTONS) return this.protons;
		return 0;
	}

	spendCurrency(price: Price): boolean {
		if (!this.canAfford(price)) return false;

		if (price.currency === CurrenciesTypes.ATOMS) this.atoms -= price.amount;
		else if (price.currency === CurrenciesTypes.ELECTRONS) this.electrons -= price.amount;
		else if (price.currency === CurrenciesTypes.PHOTONS) this.photons -= price.amount;
		else if (price.currency === CurrenciesTypes.PROTONS) this.protons -= price.amount;
		return true;
	}

	// Building Helpers
	getBuildingCost(type: BuildingType, amount: number): number {
		const building = BUILDINGS[type];
		const currentCount = this.buildings[type]?.count ?? 0;
		const baseCost = building.cost.amount;
		const r = BUILDING_COST_MULTIPLIER;
		const a = baseCost * (r ** currentCount);
		const cost = a * (Math.pow(r, amount) - 1) / (r - 1);
		return Math.round(cost);
	}

	getMaxAffordableBuilding(type: BuildingType): number {
		const building = BUILDINGS[type];
		const currency = this.getCurrency(building.cost);
		const currentCount = this.buildings[type]?.count ?? 0;
		const baseCost = building.cost.amount;
		const r = BUILDING_COST_MULTIPLIER;
		const a = baseCost * (r ** currentCount);

		if (currency < a) return 0;

		const n = Math.log((currency * (r - 1) / a) + 1) / Math.log(r);
		return Math.floor(n);
	}

	// Purchasing
	purchaseBuilding(type: BuildingType, amount: number = 1) {
		const building = BUILDINGS[type];
		const currentBuilding = this.buildings[type] ?? {
			cost: building.cost,
			rate: building.rate,
			level: 0,
			count: 0,
			unlocked: true,
		} as Building;

		const totalCost = this.getBuildingCost(type, amount);

		const cost = {
			amount: totalCost,
			currency: currentBuilding.cost.currency
		};

		if (!this.spendCurrency(cost)) return false;

		const newCount = currentBuilding.count + amount;
		const newBuilding = {
			...currentBuilding,
			cost: {
				amount: this.getBuildingCost(type, 1), // Cost of the NEXT one
				currency: cost.currency
			},
			count: newCount,
			level: Math.floor(newCount / BUILDING_LEVEL_UP_COST)
		};

		this.buildings = {
			...this.buildings,
			[type]: newBuilding
		};

		this.totalBuildingsPurchased += amount;
		return true;
	}

	purchasePhotonUpgrade(upgradeId: string) {
		const currentLevel = this.photonUpgrades[upgradeId] || 0;
		const upgrade = PHOTON_UPGRADES[upgradeId];

		if (!upgrade || currentLevel >= upgrade.maxLevel) {
			return false;
		}

		const cost = {
			amount: getPhotonUpgradeCost(upgrade, currentLevel),
			currency: CurrenciesTypes.PHOTONS
		};

		if (this.spendCurrency(cost)) {
			this.photonUpgrades = {
				...this.photonUpgrades,
				[upgradeId]: currentLevel + 1
			};
			return true;
		}
		return false;
	}

	purchaseSkill(skillId: string) {
		const skill = SKILL_UPGRADES[skillId];
		if (!skill) return false;

		if (this.skillUpgrades.includes(skillId)) return false;
		if (this.skillPointsAvailable < 1) return false;

		// Check requirements
		if (skill.requires && !skill.requires.every(req => this.skillUpgrades.includes(req))) return false;
		if (skill.condition && !skill.condition(this)) return false;

		this.skillUpgrades = [...this.skillUpgrades, skillId];
		return true;
	}

	purchaseUpgrade(id: string) {
		const upgrade = UPGRADES[id];
		const purchased = this.upgrades.includes(id);

		if (!purchased && this.spendCurrency(upgrade.cost)) {
			this.upgrades = [...this.upgrades, id];

			if (id === 'feature_purple_realm') {
				this.purpleRealmUnlocked = true;
			}

			this.totalUpgradesPurchased += 1;
			return true;
		}
		return false;
	}

	unlockBuilding(type: BuildingType) {
		if (type in this.buildings) return;

		this.buildings = {
			...this.buildings,
			[type]: {
				cost: BUILDINGS[type].cost,
				rate: BUILDINGS[type].rate,
				level: 0,
				count: 0,
				unlocked: true,
			}
		};
	}

	// Prestige
	electronize() {
		const electronGain = this.electronizeElectronsGain;

		if (this.protons >= ELECTRONS_PROTONS_REQUIRED || electronGain > 0) {
			const persistentUpgrades = this.upgrades.filter(id =>
				id.startsWith('electron') || id.startsWith('proton') || id === 'feature_purple_realm'
			);

			this.totalElectronizes += 1;
			this.totalElectronsEarned += electronGain;
			this.totalProtonises = 0; // Reset protonise counter

			this.resetLayer(LAYERS.ELECTRONIZE);

			this.upgrades = persistentUpgrades;
			if (persistentUpgrades.includes('feature_purple_realm')) {
				this.purpleRealmUnlocked = true;
			}
			this.electrons += electronGain;

			this.save();
			return true;
		}
		return false;
	}

	protonise() {
		const protonGain = this.protoniseProtonsGain;

		if (this.atoms >= PROTONS_ATOMS_REQUIRED || protonGain > 0) {
			const persistentUpgrades = this.upgrades.filter(id =>
				id.startsWith('proton') || id.startsWith('electron') || id === 'feature_purple_realm'
			);

			this.totalProtonises += 1;
			this.totalProtonsEarned += protonGain;

			this.resetLayer(LAYERS.PROTONIZER);

			this.upgrades = persistentUpgrades;
			if (persistentUpgrades.includes('feature_purple_realm')) {
				this.purpleRealmUnlocked = true;
			}
			this.protons += protonGain;

			this.save();
			return true;
		}
		return false;
	}

	// Stats & Progression
	addAtoms(amount: number) {
		this.atoms += amount;
		if (amount > 0) {
			this.totalAtomsEarned += amount;
			this.totalAtomsEarnedAllTime += amount;

			if (this.upgrades.includes('feature_levels')) {
				const xpPerAtom = 0.1;
				this.totalXP += amount * xpPerAtom * this.xpGainMultiplier;
			}
		}
	}

	addPhotons(amount: number) {
		this.photons += amount;
	}

	incrementBonusPhotonClicks() {
		this.totalBonusPhotonsClicked += 1;
	}

	incrementClicks() {
		this.totalClicks += 1;
		this.totalClicksAllTime += 1;
	}

	unlockAchievement(achievementId: string) {
		if (!this.achievements.includes(achievementId)) {
			this.achievements = [...this.achievements, achievementId];
		}
	}

	// Power-Ups
	addPowerUp(powerUp: PowerUp) {
		this.activePowerUps = [...this.activePowerUps, powerUp];
		this.powerUpsCollected += 1;

		setTimeout(() => {
			this.removePowerUp(powerUp.id);
		}, powerUp.duration);
	}

	removePowerUp(id: string) {
		this.activePowerUps = this.activePowerUps.filter(p => p.id !== id);
	}

	// Automation
	toggleAutomation(buildingType: BuildingType) {
		const buildings = [...this.settings.automation.buildings];
		const index = buildings.indexOf(buildingType);

		if (index === -1) {
			buildings.push(buildingType);
		} else {
			buildings.splice(index, 1);
		}

		this.settings = {
			...this.settings,
			automation: {
				...this.settings.automation,
				buildings
			}
		};
	}

	toggleAutoClick() {
		this.settings = {
			...this.settings,
			automation: {
				...this.settings.automation,
				autoClick: !this.settings.automation.autoClick
			}
		};
	}

	toggleAutoClickPhotons() {
		this.settings = {
			...this.settings,
			automation: {
				...this.settings.automation,
				autoClickPhotons: !this.settings.automation.autoClickPhotons
			}
		};
	}

	toggleUpgradeAutomation() {
		this.settings = {
			...this.settings,
			automation: {
				...this.settings.automation,
				upgrades: !this.settings.automation.upgrades
			}
		};
	}

	// XP Helpers
	getLevelFromTotalXP(totalXP: number) {
		let level = 0;
		let remainingXP = totalXP;
		while (remainingXP >= this.getXPForLevel(level + 1)) {
			remainingXP -= this.getXPForLevel(level + 1);
			level++;
		}
		return level;
	}

	getXPForLevel(level: number) {
		const base = 100;
		const taux = 0.42; // 42%
		return Math.floor(base * Math.pow(1 + taux, level - 1));
	}

	// Intervals setup
	setupInterval() {
		if (this.gameInterval) clearInterval(this.gameInterval);

		this.gameInterval = setInterval(() => {
			this.inGameTime += 1000;

			if (this.atomsPerSecond > this.highestAPS) {
				this.highestAPS = this.atomsPerSecond;
			}

			Object.entries(ACHIEVEMENTS).forEach(([id, achievement]) => {
				if (!this.achievements.includes(id) && achievement.condition(this)) {
					this.achievements = [...this.achievements, id];
					info("Achievement unlocked", `<strong>${achievement.name}</strong><br>${achievement.description}`);
				}
			});
		}, 1000);
	}
}

export const gameManager = new GameManager();
