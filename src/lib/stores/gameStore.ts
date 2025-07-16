import { derived } from 'svelte/store';
import { StatManager } from '$helpers/statManager';
import { type BuildingType } from '$data/buildings';
import { POWER_UP_DEFAULT_INTERVAL } from '$data/powerUp';
import { UPGRADES } from '$data/upgrades';
import { SKILL_UPGRADES } from '$data/skillTree';
import type { Building, PowerUp, Settings } from '$lib/types';
import { calculateEffects, getUpgradesWithEffects } from '$helpers/effects';
import { SAVE_VERSION } from '$helpers/saves';
import { LAYERS, STATS } from '$helpers/statConstants';
import { ELECTRONS_PROTONS_REQUIRED } from '$lib/constants';

// Create the stat manager instance
export const statManager = new StatManager();

// Register all game stats with their layer and configuration
export const achievements = statManager.register({
	id: STATS.ACHIEVEMENTS,
	defaultValue: [] as string[],
	layer: LAYERS.NEVER,
	minVersion: 1,
	description: 'Unlocked achievements'
});

export const activePowerUps = statManager.register({
	id: STATS.ACTIVE_POWER_UPS,
	defaultValue: [] as PowerUp[],
	layer: LAYERS.PROTONIZER,
	saveable: true,
	minVersion: 1,
	description: 'Currently active power-ups'
});

export const atoms = statManager.register({
	id: STATS.ATOMS,
	defaultValue: 0,
	layer: LAYERS.PROTONIZER,
	minVersion: 1,
	description: 'Primary game currency'
});

export const buildings = statManager.register({
	id: STATS.BUILDINGS,
	defaultValue: {} as Partial<Record<BuildingType, Building>>,
	layer: LAYERS.PROTONIZER,
	minVersion: 1,
	description: 'Player buildings'
});

export const electrons = statManager.register({
	id: STATS.ELECTRONS,
	defaultValue: 0,
	layer: LAYERS.SPECIAL,
	minVersion: 6,
	description: 'Secondary currency from electronize'
});

export const lastSave = statManager.register({
	id: STATS.LAST_SAVE,
	defaultValue: Date.now(),
	layer: LAYERS.SPECIAL,
	minVersion: 1,
	description: 'Last save timestamp'
});

export const photons = statManager.register({
	id: STATS.PHOTONS,
	defaultValue: 0,
	layer: LAYERS.PHOTON_REALM,
	minVersion: 11,
	description: 'Purple realm currency from violet circles'
});

export const photonUpgrades = statManager.register({
	id: STATS.PHOTON_UPGRADES,
	defaultValue: {} as Record<string, number>,
	layer: LAYERS.PHOTON_REALM,
	minVersion: 12,
	description: 'Photon upgrade levels'
});

export const protons = statManager.register({
	id: STATS.PROTONS,
	defaultValue: 0,
	layer: LAYERS.ELECTRONIZE,
	minVersion: 4,
	description: 'Tertiary currency from protonise'
});

export const settings = statManager.register({
	id: STATS.SETTINGS,
	defaultValue: {
		automation: {
			buildings: [],
			upgrades: false
		}
	} as Settings,
	layer: LAYERS.NEVER,
	minVersion: 8,
	description: 'Game settings and automation'
});

export const skillUpgrades = statManager.register({
	id: STATS.SKILL_UPGRADES,
	defaultValue: [] as string[],
	layer: LAYERS.PROTONIZER,
	minVersion: 3,
	description: 'Purchased skill tree upgrades'
});

export const startDate = statManager.register({
	id: STATS.START_DATE,
	defaultValue: Date.now(),
	layer: LAYERS.NEVER,
	minVersion: 5,
	description: 'Game start timestamp'
});

export const totalBonusPhotonsClicked = statManager.register({
	id: STATS.TOTAL_BONUS_PHOTONS_CLICKED,
	defaultValue: 0,
	layer: LAYERS.PROTONIZER,
	minVersion: 10,
	description: 'Total bonus photons clicked'
});

export const totalClicks = statManager.register({
	id: STATS.TOTAL_CLICKS,
	defaultValue: 0,
	layer: LAYERS.PROTONIZER,
	minVersion: 1,
	description: 'Total clicks made'
});

export const totalElectronizes = statManager.register({
	id: STATS.TOTAL_ELECTRONIZES,
	defaultValue: 0,
	layer: LAYERS.SPECIAL,
	minVersion: 9,
	description: 'Total number of electronizes performed'
});

export const totalProtonises = statManager.register({
	id: STATS.TOTAL_PROTONISES,
	defaultValue: 0,
	layer: LAYERS.ELECTRONIZE,
	minVersion: 4,
	description: 'Total number of protonises performed'
});

export const totalXP = statManager.register({
	id: STATS.TOTAL_XP,
	defaultValue: 0,
	layer: LAYERS.PROTONIZER,
	minVersion: 3,
	description: 'Total experience points earned'
});

export const upgrades = statManager.register({
	id: STATS.UPGRADES,
	defaultValue: [] as string[],
	layer: LAYERS.PROTONIZER,
	minVersion: 1,
	description: 'Purchased upgrades'
});

export const purpleRealmUnlocked = statManager.register({
	id: 'purpleRealmUnlocked',
	defaultValue: false,
	layer: LAYERS.PHOTON_REALM,
	minVersion: 13,
	description: 'Whether the purple realm has been unlocked'
});

// XP and leveling system
export function getXPForLevel(level: number) {
	const base = 100;
	const taux = 0.42; // 42%
	return Math.floor(base * Math.pow(1 + taux, level - 1));
}

export function getLevelFromTotalXP(totalXP: number) {
	let level = 0;
	let remainingXP = totalXP;
	while (remainingXP >= getXPForLevel(level + 1)) {
		remainingXP -= getXPForLevel(level + 1);
		level++;
	}
	return level;
}

// Derived stores for level system
export const playerLevel = derived(totalXP, $totalXP => getLevelFromTotalXP($totalXP));

export const currentLevelXP = derived([totalXP, playerLevel], ([$totalXP, $playerLevel]) => {
	if ($playerLevel === 0) return $totalXP;
	const previousLevelXP = Array.from({ length: $playerLevel }, (_, i) => getXPForLevel(i + 1)).reduce((acc, val) => acc + val, 0);
	return Math.max(0, $totalXP - previousLevelXP);
});

export const nextLevelXP = derived(playerLevel, $playerLevel => getXPForLevel($playerLevel + 1));

export const xpProgress = derived(
	[currentLevelXP, nextLevelXP],
	([$currentLevelXP, $nextLevelXP]) => ($currentLevelXP / $nextLevelXP) * 100
);

// Helper function to get current state (for compatibility)
export function getCurrentState() {
	return {
		achievements: achievements.get(),
		activePowerUps: activePowerUps.get(),
		atoms: atoms.get(),
		buildings: buildings.get(),
		electrons: electrons.get(),
		lastSave: lastSave.get(),
		photons: photons.get(),
		photonUpgrades: photonUpgrades.get(),
		protons: protons.get(),
		purpleRealmUnlocked: purpleRealmUnlocked.get(),
		settings: settings.get(),
		skillUpgrades: skillUpgrades.get(),
		startDate: startDate.get(),
		totalBonusPhotonsClicked: totalBonusPhotonsClicked.get(),
		totalClicks: totalClicks.get(),
		totalElectronizes: totalElectronizes.get(),
		totalProtonises: totalProtonises.get(),
		totalXP: totalXP.get(),
		upgrades: upgrades.get(),
		version: SAVE_VERSION
	};
}

// Derived stores for game calculations
export const currentUpgradesBought = derived(
	[upgrades, skillUpgrades],
	([$upgrades, $skillUpgrades]) => {
		const allUpgradeIds = [...$upgrades, ...$skillUpgrades];
		return allUpgradeIds
			.filter(id => UPGRADES[id] || SKILL_UPGRADES[id])
			.map(id => UPGRADES[id] || SKILL_UPGRADES[id]);
	}
);

export const autoClicksPerSecond = derived(
	[currentUpgradesBought],
	([$currentUpgradesBought]) => {
		const autoClickUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'auto_click' });
		return calculateEffects(autoClickUpgrades, getCurrentState(), 0);
	}
);

export const bonusMultiplier = derived(activePowerUps, $activePowerUps => {
	return $activePowerUps.reduce((acc, powerUp) => acc * powerUp.multiplier, 1);
});

export const globalMultiplier = derived(
	[currentUpgradesBought],
	([$currentUpgradesBought]) => {
		const globalUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'global' });
		return calculateEffects(globalUpgrades, getCurrentState(), 1);
	}
);

export const atomsPerSecond = derived(
	[buildings, currentUpgradesBought, globalMultiplier, bonusMultiplier],
	([$buildings, $currentUpgradesBought, $globalMultiplier, $bonusMultiplier]) => {
		return Object.entries($buildings).reduce((total, [type, building]) => {
			if (!building) return total;

			const upgrades = getUpgradesWithEffects($currentUpgradesBought, { target: type, type: 'building' });
			const multiplier = calculateEffects(upgrades, getCurrentState(), building.rate);
			const oldMultiplier = Math.pow(building.count / 2, building.level + 1) / 5;
			const linearMultiplier = (building.level + 1) * 100;
			const levelMultiplier = building.level > 0 ? Math.sqrt(oldMultiplier * linearMultiplier) : 1;
			const production = building.count * multiplier * levelMultiplier * $globalMultiplier * $bonusMultiplier;

			return total + production;
		}, 0);
	}
);

export const skillPointsTotal = derived([buildings], ([$buildings]) => Object.values($buildings).reduce((sum, building) => sum + building.level, 0));
export const skillPointsAvailable = derived([skillPointsTotal, skillUpgrades], ([$skillPointsTotal, $skillUpgrades]) => $skillPointsTotal - $skillUpgrades.length);

export const hasAvailableSkillUpgrades = derived(
	[skillPointsAvailable, skillUpgrades, buildings],
	([$skillPointsAvailable, $skillUpgrades, $buildings]) => {
		if ($skillPointsAvailable <= 0) return false;

		const currentState = { buildings: $buildings, skillUpgrades: $skillUpgrades } as any;

		return Object.values(SKILL_UPGRADES).some(skill => {
			if ($skillUpgrades.includes(skill.id)) return false;
			if (skill.condition && !skill.condition(currentState)) return false;
			if (skill.requires && !skill.requires.every(req => $skillUpgrades.includes(req))) return false;
			return true;
		});
	}
);

export const clickPower = derived(
	[currentUpgradesBought, bonusMultiplier],
	([$currentUpgradesBought, $bonusMultiplier]) => {
		const clickUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'click' });
		return calculateEffects(clickUpgrades, getCurrentState(), 1) * $bonusMultiplier;
	}
);

export const powerUpInterval = derived(currentUpgradesBought, $currentUpgradeBought => {
	const powerUpIntervalUpgrades = getUpgradesWithEffects($currentUpgradeBought, { type: 'power_up_interval' });
	return POWER_UP_DEFAULT_INTERVAL.map(interval => calculateEffects(powerUpIntervalUpgrades, getCurrentState(), interval)) as [number, number];
});

export const powerUpDurationMultiplier = derived(currentUpgradesBought, $currentUpgradesBought => {
	const powerUpDurationUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'power_up_duration' });
	return calculateEffects(powerUpDurationUpgrades, getCurrentState(), 1);
});

export const powerUpEffectMultiplier = derived(currentUpgradesBought, $currentUpgradesBought => {
	const powerUpMultiplierUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'power_up_multiplier' });
	return calculateEffects(powerUpMultiplierUpgrades, getCurrentState(), 1);
});

export const xpGainMultiplier = derived(currentUpgradesBought, $currentUpgradesBought => {
	const xpGainUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'xp_gain' });
	return calculateEffects(xpGainUpgrades, getCurrentState(), 1);
});

export const hasBonus = derived(activePowerUps, $activePowerUps => $activePowerUps.length > 0);

// Add memoization helper at the top
let buildingProductionsCache: { hash: string; result: Record<BuildingType, number> } | null = null;

export const buildingProductions = derived(
	[
		buildings,
		currentUpgradesBought,
		globalMultiplier,
		bonusMultiplier
	],
	([$buildings, $currentUpgradesBought, $globalMultiplier, $bonusMultiplier]) => {
		// Create a hash for memoization
		const hash = JSON.stringify([$buildings, $currentUpgradesBought.length, $globalMultiplier, $bonusMultiplier]);

		// Return cached result if hash matches
		if (buildingProductionsCache && buildingProductionsCache.hash === hash) {
			return buildingProductionsCache.result;
		}

		const result = Object.entries($buildings).reduce((acc, [type, building]) => {
			let production = 0;
			if (building) {
				const upgrades = getUpgradesWithEffects($currentUpgradesBought, { target: type, type: 'building' });
				const multiplier = calculateEffects(upgrades, getCurrentState(), building.rate);
				const oldMultiplier = Math.pow(building.count / 2, building.level + 1) / 5;
				const linearMultiplier = (building.level + 1) * 100;
				const levelMultiplier = building.level > 0 ? Math.sqrt(oldMultiplier * linearMultiplier) : 1;
				production = building.count * multiplier * levelMultiplier * $globalMultiplier * $bonusMultiplier;
			}
			return {
				...acc,
				[type]: production,
			};
		}, {} as Record<BuildingType, number>);

		// Cache the result
		buildingProductionsCache = { hash, result };
		return result;
	}
);

export const canProtonise = derived(
	[atoms, protons],
	([$atoms, $protons]) => $atoms >= ELECTRONS_PROTONS_REQUIRED || $protons > 0
);
