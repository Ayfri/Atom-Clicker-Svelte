import {BUILDING_TYPES, BUILDINGS, type BuildingType} from '$data/buildings';
import type {Effect, GameState, Upgrade} from '$lib/types';
import {capitalize, formatNumber, shortNumberText} from '$lib/utils';
import {atomsPerSecond, playerLevel} from '$stores/gameStore';
import {get} from 'svelte/store';

export const SPECIAL_UPGRADES: Upgrade[] = [];

interface CreateUpgradesOptions {
	condition?: (index: number, state: GameState) => boolean;
	cost: (index: number) => number;
	count: number;
	description: (index: number) => string;
	effects: (index: number) => Effect[];
	id: string;
	name: (index: number) => string;
}

function createUpgrades(options: CreateUpgradesOptions): Upgrade[] {
	const upgrades: Upgrade[] = [];
	for (let i = 1; i <= options.count; i++) {
		const effects = options.effects(i);
		upgrades.push({
			condition: state => options.condition?.(i, state) !== false,
			cost: options.cost(i),
			description: options.description(i),
			effects,
			id: `${options.id}_${i}`,
			name: options.name(i),
		});
	}
	return upgrades;
}

function createBuildingUpgrades(buildingType: BuildingType) {
	const building = BUILDINGS[buildingType];
	return createUpgrades({
		condition: (_, state) => state.buildings[buildingType]?.unlocked === true,
		count: 13,
		id: buildingType.toLowerCase(),
		name: i => `${building.name} Boost ${i}`,
		description: i => `${capitalize(shortNumberText(1 + Math.ceil(i / 5)))} ${building.name} production`,
		cost: i => building.cost * 2 ** (i * 4),
		effects: i => [{
			type: 'building',
			target: buildingType,
			description: `Multiply ${building.name} production by ${1 + Math.ceil(i / 5)}`,
			apply: (currentValue) => currentValue * (1 + Math.ceil(i / 5))
		}]
	});
}

function createClickPowerUpgrades() {
	const upgrades: Upgrade[] = [];
	upgrades.push(...createUpgrades({
		count: 13,
		id: 'click_power_mul',
		name: i => `Click Power ${i}`,
		description: i => `${i < 6 ? '1.5x' : '2x'} click power`,
		cost: i => 10 * 2 ** (i * 4),
		effects: i => [{
			type: 'click',
			description: `Multiply click power by ${i < 6 ? 1.5 : 2}`,
			apply: (currentValue) => currentValue * (i < 6 ? 1.5 : 2)
		}]
	}));

	upgrades.push(...createUpgrades({
		count: 6,
		id: 'click_power_val',
		name: i => `Click Value ${i}`,
		description: i => `+${formatNumber(Math.ceil(10 ** i / 10))} atoms per click`,
		cost: i => 10 ** (i * 2) / 2,
		effects: i => [{
			type: 'click',
			description: `Add ${Math.ceil(10 ** i / 10)} atoms per click`,
			apply: (currentValue) => currentValue + Math.ceil(10 ** i / 10)
		}]
	}));

	upgrades.push(...createUpgrades({
		count: 6,
		id: 'click_power_aps',
		name: i => `Global Click Power ${i}`,
		description: i => `+${i}% of your Atoms per second per click`,
		cost: i => 1000 * 2 ** (i * 7),
		effects: i => [{
			type: 'click' as const,
			description: `Add ${i}% of APS to click power`,
			apply: (currentValue) => currentValue + (get(atomsPerSecond) * i / 100)
		}]
	}));

	return upgrades;
}

function createGlobalUpgrades() {
	const upgrades = createUpgrades({
		id: 'global_boost',
		name: i => `Global Boost ${i}`,
		description: i => `${1 + i/100}x all production`,
		cost: i => 10 ** (i * 2),
		count: 20,
		effects: i => [{
			type: 'global',
			description: `Multiply all production by ${1 + i/100}`,
			apply: (currentValue) => currentValue * (1 + i/100)
		}]
	});

	upgrades.push(...createUpgrades({
		id: 'global_achievements_mul',
		count: 11,
		condition: (i, state) => i > 1 ? state.achievements.length > 30 * i : true,
		name: i => `Atom Soup ${i}`,
		description: i => `+${(2.5 * Math.ceil(i / 5))}% production per achievement`,
		cost: i => 10_000 * 2 ** (i * 7),
		effects: i => [{
			type: 'global',
			description: `Add ${(2.5 * Math.ceil(i / 5))}% production per achievement`,
			apply: (currentValue, state) => {
				const perAchievement = 2.5 * Math.ceil(i / 5);
				const achievements = state.achievements.length;
				const boost = achievements * perAchievement / 100;
				return currentValue * (1 + boost);
			}
		}]
	}));

	return upgrades;
}

function createPowerUpIntervalUpgrades() {
	return createUpgrades({
		id: 'power_up_interval',
		count: 10,
		name: i => `Power Up Interval ${i + 1}`,
		description: i => `${i > 5 ? '0.9x' : '0.8x'} power up interval`,
		cost: i => 10_000 * 2 ** (i * 7),
		effects: i => [{
			type: 'power_up_interval',
			description: `Multiply power up interval by ${i > 5 ? 0.9 : 0.8}`,
			apply: (currentValue) => currentValue * (i > 5 ? 0.9 : 0.8)
		}]
	});
}

function createLevelBoostUpgrades() {
	const upgrades: Upgrade[] = [];
	const count = 6;
	for (let i = 1; i <= count; i++) {
		upgrades.push({
			id: `level_boost_${i}`,
			name: `Level Boost ${i}`,
			description: `+${i * 10}% production per level`,
			cost: 10 ** (i * 3),
			effects: [{
				type: 'global',
				description: `Add ${i * 10}% production per level`,
				apply: (currentValue) => {
					const level = get(playerLevel);
					return currentValue * (1 + (level * i * 0.1));
				}
			}]
		});
	}
	return upgrades;
}

const upgrades = [
	...SPECIAL_UPGRADES,
	...BUILDING_TYPES.map(createBuildingUpgrades).flat(),
	...createClickPowerUpgrades(),
	...createGlobalUpgrades(),
	...createPowerUpIntervalUpgrades(),
	...createLevelBoostUpgrades(),
];

export const UPGRADES = Object.fromEntries(upgrades.map(upgrade => [
	upgrade.id,
	upgrade,
]));
