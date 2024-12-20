import {BUILDING_TYPES, BUILDINGS, type BuildingType} from '$data/buildings';
import {CurrenciesTypes, type CurrencyName} from '$data/currencies';
import type {Effect, GameState, Upgrade} from '$lib/types';
import {capitalize, formatNumber, shortNumberText} from '$lib/utils';
import {atomsPerSecond, playerLevel} from '$stores/gameStore';
import {get} from 'svelte/store';

export const SPECIAL_UPGRADES: Upgrade[] = [];

interface CreateUpgradesOptions {
	condition?: (index: number, state: GameState) => boolean;
	cost: (index: number) => number;
	currency?: CurrencyName;
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
			cost: {
				amount: options.cost(i),
				currency: options.currency ?? CurrenciesTypes.ATOMS
			},
			description: options.description(i),
			effects,
			id: `${options.id}_${i}`,
			name: options.name(i),
		} as Upgrade);
	}
	return upgrades;
}

function createBuildingUpgrades(buildingType: BuildingType) {
	const building = BUILDINGS[buildingType];
	return createUpgrades({
		condition: (_, state) => state.buildings[buildingType]?.unlocked === true,
		count: 15,
		id: buildingType.toLowerCase(),
		name: i => `${building.name} Boost ${i}`,
		description: i => `${capitalize(shortNumberText(1 + Math.ceil(i / 5)))} ${building.name} production`,
		cost: i => building.cost.amount * (2.5 ** (i * 3)) * (i > 10 ? i ** 3 : 1),
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
		cost: i => {
			const baseCost = 10 * 2 ** (i * 5);
			return i > 8 ? baseCost * (i ** 4) : baseCost;
		},
		effects: i => [{
			type: 'click',
			description: `Multiply click power by ${i < 6 ? 1.5 : 2}`,
			apply: (currentValue) => currentValue * (i < 6 ? 1.5 : 2)
		}]
	}));

	upgrades.push(...createUpgrades({
		count: 10,
		id: 'click_power_val',
		name: i => `Click Value ${i}`,
		description: i => `+${formatNumber(Math.ceil(10 ** i / 10))} base value per click`,
		cost: i => {
			const baseCost = 5 ** (i * 2) * 10;
			return i > 6 ? baseCost * (i ** 3) : baseCost;
		},
		effects: i => [{
			type: 'click',
			description: `Add ${Math.ceil(10 ** i / 10)} base value per click`,
			apply: (currentValue) => currentValue + Math.ceil(10 ** i / 10)
		}]
	}));

	upgrades.push(...createUpgrades({
		count: 6,
		id: 'click_power_aps',
		name: i => `Global Click Power ${Math.ceil(i / 2)}`,
		description: i => `+${Math.ceil(i / 2)}% of your Atoms per second per click`,
		cost: i => {
			const baseCost = 20 * 2 ** (i * 8);
			return i > 3 ? baseCost * (i ** 5) : baseCost;
		},
		effects: i => [{
			type: 'click' as const,
			description: `Add ${Math.ceil(i / 2)}% of APS to click power`,
			apply: (currentValue) => currentValue + Math.ceil(i / 2) / 100 * get(atomsPerSecond)
		}]
	}));

	return upgrades;
}

function createGlobalUpgrades() {
	const upgrades = createUpgrades({
		id: 'global_boost',
		name: i => `Global Boost ${i}`,
		description: i => `${formatNumber(1 + i/100)}x all production`,
		cost: i => {
			const baseCost = 10 ** i;
			return i > 20 ? baseCost * (i ** 4) : baseCost;
		},
		count: 40,
		effects: i => [{
			type: 'global',
			description: `Multiply all production by ${1 + i/100}`,
			apply: (currentValue) => currentValue * (1 + i/100)
		}]
	});

	upgrades.push(...createUpgrades({
		id: 'global_achievements_mul',
		count: 11,
		condition: (i, state) => i > 1 ? state.achievements.length > 10 * i : true,
		name: i => `Atom Soup ${i}`,
		description: i => `+${(Math.ceil(i / 5))}% production per achievement`,
		cost: i => {
			const baseCost = 1000 * 2 ** (i * 7);
			return i > 5 ? baseCost * (i ** 4) : baseCost;
		},
		effects: i => [{
			type: 'global',
			description: `Add ${(Math.ceil(i / 5))}% production per achievement`,
				apply: (currentValue, state) => {
					const perAchievement = Math.ceil(i / 5);
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
		cost: i => {
			const baseCost = 10_000 * 2 ** (i * 10);
			return i > 5 ? baseCost * (i ** 3) : baseCost;
		},
		effects: i => [{
			type: 'power_up_interval',
			description: `Multiply power up interval by ${i > 5 ? 0.9 : 0.8}`,
			apply: (currentValue) => currentValue * (i > 5 ? 0.9 : 0.8)
		}]
	});
}

function createLevelBoostUpgrades() {
	const upgrades: Upgrade[] = [];
	const count = 5;
	for (let i = 1; i <= count; i++) {
		upgrades.push({
			id: `level_boost_${i}`,
			name: `Level Boost ${i}`,
			description: `+${1 + Math.ceil(i / 2)}% production per level`,
			cost: {
				amount: 5 ** (i * 4) * (i > 3 ? i ** 4 : 1),
				currency: 'Atoms',
			},
			effects: [
				{
					type: 'global',
					description: `Add ${1 + Math.ceil(i / 2)}% production per level`,
					apply: (currentValue) => {
						const level = get(playerLevel);
						return currentValue * (1 + (level * (1 + Math.ceil(i / 2)) / 100));
					},
				},
			],
		});
	}
	return upgrades;
}

function createProtonUpgrades() {
	const upgrades: Upgrade[] = [];

	// Global production multiplier from protons
	upgrades.push(...createUpgrades({
		id: 'proton_boost',
		count: 10,
		currency: CurrenciesTypes.PROTONS,
		name: i => `Proton Boost ${i}`,
		description: i => `${2 + i}x all production`,
		cost: i => {
			const baseCost = Math.ceil(2 ** (i - 1));
			return i > 5 ? baseCost * (i ** 3) : baseCost;
		},
		effects: i => [{
			type: 'global',
			description: `Multiply all production by ${2 + i}`,
			apply: (currentValue) => currentValue * (2 + i)
		}]
	}));

	// Proton boost based on total protonises
	upgrades.push(...createUpgrades({
		id: 'protonise_boost',
		count: 5,
		currency: CurrenciesTypes.PROTONS,
		name: i => `Protonise Master ${i}`,
		description: i => `+${50 * i}% production per protonise`,
		cost: i => {
			const baseCost = Math.ceil(5 * 2 ** (i - 1));
			return i > 3 ? baseCost * (i ** 4) : baseCost;
		},
		effects: i => [{
			type: 'global',
			description: `Add ${50 * i}% production per protonise`,
			apply: (currentValue, state) => {
				const boost = (state.totalProtonises || 0) * (0.5 * i);
				return currentValue * (1 + boost);
			}
		}]
	}));

	// Starting atoms after protonise
	upgrades.push(...createUpgrades({
		id: 'protonise_start',
		count: 3,
		currency: CurrenciesTypes.PROTONS,
		name: i => `Quick Start ${i}`,
		description: i => `Start with ${formatNumber(10 ** (3 + i))} atoms after protonising`,
		cost: i => {
			const baseCost = Math.ceil(3 * 2 ** (i - 1));
			return i > 2 ? baseCost * (i ** 3) : baseCost;
		},
		effects: i => [{
			type: 'global',
			description: `Start with ${formatNumber(10 ** (3 + i))} atoms`,
			apply: (currentValue) => currentValue
		}]
	}));

	return upgrades;
}

const upgrades = [
	...SPECIAL_UPGRADES,
	...BUILDING_TYPES.map(createBuildingUpgrades).flat(),
	...createClickPowerUpgrades(),
	...createGlobalUpgrades(),
	...createPowerUpIntervalUpgrades(),
	...createLevelBoostUpgrades(),
	...createProtonUpgrades(),
];

export const UPGRADES = Object.fromEntries(upgrades.map(upgrade => [
	upgrade.id,
	upgrade,
]));
