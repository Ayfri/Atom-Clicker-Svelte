import {derived, get, writable} from 'svelte/store';
import {type BuildingType} from '$data/buildings';
import {POWER_UP_DEFAULT_INTERVAL} from '$data/powerUp';
import {UPGRADES} from '$data/upgrades';
import {SKILL_UPGRADES} from '$data/skillTree';
import type {Building, Effect, PowerUp, Range, Upgrade, SkillUpgrade } from '../types';
import { currentState } from '$lib/helpers/gameManager';

// Individual stores
export const achievements = writable<string[]>([]);
export const activePowerUps = writable<PowerUp[]>([]);
export const atoms = writable<number>(0);
export const buildings = writable<Partial<Record<BuildingType, Building>>>({});
export const lastSave = writable<number>(Date.now());
export const protons = writable<number>(0);
export const skillUpgrades = writable<string[]>([]);
export const totalClicks = writable<number>(0);
export const totalProtonises = writable<number>(0);
export const totalXP = writable<number>(0);
export const upgrades = writable<string[]>([]);

// Using a geometric progression formula
export function getXPForLevel(level: number) {
	const base = 100;
	const taux = 0.42; // 42%
	return Math.floor(base * Math.pow(1 + taux, level - 1));
}

// Derived stores for level system
export const playerLevel = derived(totalXP, $totalXP => {
    let level = 0;
	let remainingXP = $totalXP;
	while (remainingXP >= getXPForLevel(level + 1)) {
		remainingXP -= getXPForLevel(level + 1);
		level++;
	}
	return level;
});

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

interface SearchEffectsOptions {
	target?: Effect['target'];
	type?: Effect['type'];
}

function getUpgradesWithEffects(upgrades: (Upgrade | SkillUpgrade)[], options: SearchEffectsOptions) {
	return upgrades.filter((upgrade): upgrade is (Upgrade | SkillUpgrade) => {
		if ('effects' in upgrade && Array.isArray(upgrade.effects)) {
			const effects = upgrade.effects;
			let isType = true;
			let isTarget = true;

			if (options.type) {
				isType = effects.some(effect => effect.type === options.type);
			}
			if (options.target) {
				isTarget = effects.some(effect => effect.target === options.target);
			}
			return isType && isTarget;
		}

		return false;
	});
}

function calculateEffects(upgrades: (Upgrade | SkillUpgrade)[], defaultValue: number = 0): number {
	const state = get(currentState);
	return upgrades.reduce((currentValue, upgrade) => {
		if ('effects' in upgrade && Array.isArray(upgrade.effects)) {
			return upgrade.effects.reduce((value, effect) => effect.apply(value, state), currentValue);
		}
		return currentValue;
	}, defaultValue);
}

// Derived stores
export const currentUpgradesBought = derived(
	[upgrades, skillUpgrades],
	([$upgrades, $skillUpgrades]) => {
		const allUpgradeIds = [...$upgrades, ...$skillUpgrades];
		return allUpgradeIds
			.filter(id => UPGRADES[id] || SKILL_UPGRADES[id])
			.map(id => UPGRADES[id] || SKILL_UPGRADES[id]);
	}
);

export const bonusMultiplier = derived(activePowerUps, $activePowerUps => {
	return $activePowerUps.reduce((acc, powerUp) => acc * powerUp.multiplier, 1);
});

export const protonMultiplier = derived(
    [currentUpgradesBought, totalProtonises],
    ([$currentUpgradesBought, $totalProtonises]) => {
        const protonUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'global' })
            .filter(upgrade => upgrade.id.startsWith('proton_') || upgrade.id.startsWith('protonise_'));

        // Calculate base multiplier from proton upgrades
        const baseMultiplier = calculateEffects(protonUpgrades, 1);

        // Add multiplier from total protonises if any protonise boost upgrades are active
        const hasProtoniseBoost = protonUpgrades.some(upgrade => upgrade.id.startsWith('protonise_boost_'));
        if (hasProtoniseBoost) {
            return baseMultiplier * (1 + ($totalProtonises * 0.1)); // 10% boost per protonise
        }

        return baseMultiplier;
    }
);

export const globalMultiplier = derived(
	[currentUpgradesBought, protonMultiplier],
	([$currentUpgradesBought, $protonMultiplier]) => {
		const globalUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'global' })
			.filter(upgrade => !upgrade.id.startsWith('proton_') && !upgrade.id.startsWith('protonise_'));
		return calculateEffects(globalUpgrades, 1) * $protonMultiplier;
	}
);

export const hasBonus = derived(activePowerUps, $activePowerUps => $activePowerUps.length > 0);

export const buildingProductions = derived(
	[
		buildings,
		currentUpgradesBought,
		globalMultiplier,
		bonusMultiplier
	],
	([$buildings, $currentUpgradesBought, $globalMultiplier, $bonusMultiplier]) => {
		return Object.entries($buildings).reduce((acc, [type, building]) => {
			let production = 0;
			if (building) {
				const upgrades = getUpgradesWithEffects($currentUpgradesBought, { target: type, type: 'building' });
				const multiplier = calculateEffects(upgrades, building.rate);
				const levelMultiplier = building.level > 0 ? (building.count / 2) ** (building.level + 1) / 5 : 1;
				production = building.count * multiplier * levelMultiplier * $globalMultiplier * $bonusMultiplier;
			}
			return {
				...acc,
				[type]: production,
			};
		}, {} as Record<BuildingType, number>);
	}
);

export const atomsPerSecond = derived(
	[buildingProductions],
	([$buildingProductions]) => {
		return Object.entries($buildingProductions).reduce((total, [_, building]) => total + building, 0);
	}
);

export const skillPointsTotal = derived([buildings], ([$buildings]) => Object.values($buildings).reduce((sum, building) => sum + building.level, 0));
export const skillPointsAvailable = derived([skillPointsTotal, skillUpgrades], ([$skillPointsTotal, $skillUpgrades]) => $skillPointsTotal - $skillUpgrades.length);

export const clickPower = derived(
	[currentUpgradesBought, bonusMultiplier, buildingProductions],
	([$currentUpgradesBought, $bonusMultiplier, $buildingProductions]) => {
		// First, get all click upgrades
		const clickUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'click' });
		
		// Separate APS-based upgrades from other click upgrades
		const apsUpgrades = clickUpgrades.filter(upgrade => upgrade.id.startsWith('click_power_aps'));
		const regularClickUpgrades = clickUpgrades.filter(upgrade => !upgrade.id.startsWith('click_power_aps'));
		
		// Calculate base click power with regular upgrades first
		const baseClickPower = calculateEffects(regularClickUpgrades, 1) * $bonusMultiplier;
		
		// Then apply APS-based upgrades after all other multipliers
		return calculateEffects(apsUpgrades, baseClickPower);
	}
);

export const powerUpInterval = derived(currentUpgradesBought, $currentUpgradeBought => {
	const powerUpIntervalUpgrades = getUpgradesWithEffects($currentUpgradeBought, { type: 'power_up_interval' });
	return POWER_UP_DEFAULT_INTERVAL.map(interval => calculateEffects(powerUpIntervalUpgrades, interval)) as Range;
});

export const powerUpDurationMultiplier = derived(currentUpgradesBought, $currentUpgradesBought => {
	const powerUpDurationUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'power_up_duration' });
	return calculateEffects(powerUpDurationUpgrades, 1);
});

export const powerUpEffectMultiplier = derived(currentUpgradesBought, $currentUpgradesBought => {
	const powerUpMultiplierUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'power_up_multiplier' });
	return calculateEffects(powerUpMultiplierUpgrades, 1);
});

export const xpGainMultiplier = derived(currentUpgradesBought, $currentUpgradesBought => {
	const xpGainUpgrades = getUpgradesWithEffects($currentUpgradesBought, { type: 'xp_gain' });
	return calculateEffects(xpGainUpgrades, 1);
});

// Derived stores for protonise system
export const canProtonise = derived(
    [atoms, protons],
    ([$atoms, $protons]) => $atoms >= 1_000_000_000 || $protons > 0
);
