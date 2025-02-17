import { BUILDING_TYPES, BUILDINGS, type BuildingType } from '$data/buildings';
import { CurrenciesTypes, type CurrencyName } from '$data/currencies';
import type { Effect, GameState, Upgrade } from '$lib/types';
import { capitalize, formatNumber, shortNumberText } from '$lib/utils';
import { atomsPerSecond, playerLevel, totalProtonises } from '$stores/gameStore';
import { get } from 'svelte/store';

export const SPECIAL_UPGRADES: Upgrade[] = [
	{
		id: 'feature_levels',
		name: 'Unlock Levels',
		description: 'Unlock the leveling system',
		cost: {
			amount: 10_000,
			currency: CurrenciesTypes.ATOMS,
		},
		effects: [],
	},
];

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
				currency: options.currency ?? CurrenciesTypes.ATOMS,
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
		count: 20,
		id: buildingType.toLowerCase(),
		name: i => `${building.name} Boost ${i}`,
		description: i => `${capitalize(shortNumberText(1 + Math.ceil(i / 5)))} ${building.name} production`,
		cost: i => building.cost.amount * 2.5 ** (i * 3) * (i > 10 ? i ** 3 : 1),
		effects: i => [
			{
				type: 'building',
				target: buildingType,
				description: `Multiply ${building.name} production by ${1 + Math.ceil(i / 5)}`,
				apply: currentValue => currentValue * (1 + Math.ceil(i / 5)),
			},
		],
	});
}

function createClickPowerUpgrades() {
	const upgrades: Upgrade[] = [];
	upgrades.push(
		...createUpgrades({
			count: 15,
			id: 'click_power_mul',
			name: i => `Click Power ${i}`,
			description: i => `${i < 6 ? '1.5x' : '2x'} click power`,
			cost: i => {
				const baseCost = 10 * 2 ** (i * 5);
				return i > 8 ? baseCost * i ** 4 : baseCost;
			},
			effects: i => [
				{
					type: 'click',
					description: `Multiply click power by ${i < 6 ? 1.5 : 2}`,
					apply: currentValue => currentValue * (i < 6 ? 1.5 : 2),
				},
			],
		}),
	);

	upgrades.push(
		...createUpgrades({
			count: 15,
			id: 'click_power_val',
			name: i => `Click Value ${i}`,
			description: i => `+${formatNumber(Math.ceil(10 ** i / 10))} base value per click`,
			cost: i => {
				const baseCost = 5 ** (i * 2) * 10;
				return i > 6 ? baseCost * i ** 3 * 1.1 : baseCost * 1.1;
			},
			effects: i => [
				{
					type: 'click',
					description: `Add ${Math.ceil(10 ** i / 10)} base value per click`,
					apply: currentValue => currentValue + Math.ceil(10 ** i / 10),
				},
			],
		}),
	);

	upgrades.push(
		...createUpgrades({
			count: 7,
			id: 'click_power_aps',
			name: i => `Global Click Power ${Math.ceil(i / 2)}`,
			description: i => `+${Math.ceil(i / 2)}% of your Atoms per second per click`,
			cost: i => {
				const baseCost = 20 * 2 ** (i * 8);
				return i > 3 ? baseCost * i ** 5 * 1.1 : baseCost * 1.1;
			},
			effects: i => [
				{
					type: 'click' as const,
					description: `Add ${Math.ceil(i / 2)}% of APS to click power`,
					apply: currentValue => currentValue + (Math.ceil(i / 2) / 100) * get(atomsPerSecond),
				},
			],
		}),
	);

	return upgrades;
}

function createGlobalUpgrades() {
	const upgrades = createUpgrades({
		id: 'global_boost',
		name: i => `Global Boost ${i}`,
		description: i => `${formatNumber(1 + i / 100)}x all production`,
		cost: i => {
			const baseCost = 10 ** i;
			return i > 20 ? baseCost * i ** 4 : baseCost;
		},
		count: 50,
		effects: i => [
			{
				type: 'global',
				description: `Multiply all production by ${1 + i / 100}`,
				apply: currentValue => currentValue * (1 + i / 100),
			},
		],
	});

	upgrades.push(
		...createUpgrades({
			id: 'global_achievements_mul',
			count: 11,
			condition: (i, state) => (i > 1 ? state.achievements.length > 10 * i : true),
			name: i => `Atom Soup ${i}`,
			description: i => `+${Math.ceil(i / 5)}% production per achievement`,
			cost: i => {
				const baseCost = 1000 * 2 ** (i * 7);
				return i > 5 ? baseCost * i ** 4 : baseCost;
			},
			effects: i => [
				{
					type: 'global',
					description: `Add ${Math.ceil(i / 5)}% production per achievement`,
					apply: (currentValue, state) => {
						const perAchievement = Math.ceil(i / 5);
						const achievements = state.achievements.length;
						const boost = (achievements * perAchievement) / 100;
						return currentValue * (1 + boost);
					},
				},
			],
		}),
	);

	return upgrades;
}

function createPowerUpIntervalUpgrades() {
	return createUpgrades({
		id: 'power_up_interval',
		count: 15,
		name: i => `Power Up Interval ${i + 1}`,
		description: i => `${i > 5 ? '0.9x' : '0.8x'} power up interval`,
		cost: i => {
			const baseCost = 10_000 * 2 ** (i * 10);
			return i > 5 ? baseCost * i ** 3 * 1.1 : baseCost * 1.1;
		},
		effects: i => [
			{
				type: 'power_up_interval',
				description: `Multiply power up interval by ${i > 5 ? 0.9 : 0.8}`,
				apply: currentValue => currentValue * (i > 5 ? 0.9 : 0.8),
			},
		],
	});
}

function createLevelBoostUpgrades() {
	const upgrades: Upgrade[] = [];
	const count = 10;
	for (let i = 1; i <= count; i++) {
		upgrades.push({
			id: `level_boost_${i}`,
			name: `Level Boost ${i}`,
			description: `+${1 + Math.ceil(i / 2)}% production per level`,
			cost: {
				amount: i === 1 ? Math.ceil(15000 * 1.1) : Math.ceil(5 ** (i * 4) * (i > 3 ? i ** 4 : 1) * 1.1),
				currency: 'Atoms',
			},
			condition: state => state.upgrades.includes('feature_levels') || i === 1,
			effects: [
				{
					type: 'global',
					description: `Add ${1 + Math.ceil(i / 2)}% production per level`,
					apply: currentValue => {
						const level = get(playerLevel);
						return currentValue * (1 + (level * (1 + Math.ceil(i / 2))) / 100);
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
	upgrades.push(
		...createUpgrades({
			id: 'proton_boost',
			count: 10,
			currency: CurrenciesTypes.PROTONS,
			name: i => `Proton Boost ${i}`,
			description: i => `${2 + i}x all production`,
			cost: i => {
				const baseCost = Math.ceil(2 ** (i * 2));
				return i > 2 ? baseCost * i ** 4 : baseCost;
			},
			effects: i => [
				{
					type: 'global',
					description: `Multiply all production by ${2 + i}`,
					apply: currentValue => currentValue * (2 + i),
				},
			],
		}),
	);

	// Electron gain multiplier upgrades
	upgrades.push(
		{
			id: 'proton_electron_boost_1',
			name: 'Double Electrons',
			description: '2x electrons gained from electronize',
			cost: {
				amount: 7_500_000_000,
				currency: CurrenciesTypes.PROTONS,
			},
			effects: [
				{
					type: 'electron_gain',
					description: 'Double electrons gained from electronize',
					apply: currentValue => currentValue * 2,
				},
			],
		},
		{
			id: 'proton_electron_boost_2',
			name: 'Double Electrons II',
			description: '2x electrons gained from electronize',
			condition: state => state.upgrades.includes('proton_electron_boost_1'),
			cost: {
				amount: 300_000_000_000,
				currency: CurrenciesTypes.PROTONS,
			},
			effects: [
				{
					type: 'electron_gain',
					description: 'Double electrons gained from electronize',
					apply: currentValue => currentValue * 2,
				},
			],
		},
		{
			id: 'proton_electron_boost_3',
			name: 'Triple Electrons',
			description: '3x electrons gained from electronize',
			cost: {
				amount: 15_000_000_000_000,
				currency: CurrenciesTypes.PROTONS,
			},
			effects: [
				{
					type: 'electron_gain',
					description: 'Triple electrons gained from electronize',
					apply: currentValue => currentValue * 3,
				},
			],
		},
		{
			id: 'proton_electron_boost_total_protonises',
			name: 'Total Protonises',
			description: '+1 electron per protonise',
			cost: {
				amount: 100_000_000_000_000,
				currency: CurrenciesTypes.PROTONS,
			},
			effects: [
				{
					type: 'electron_gain',
					description: '+1 electron per protonise',
					apply: currentValue => currentValue + get(totalProtonises),
				},
			],
		},
	);

	// Proton boost based on total protonises
	upgrades.push(
		...createUpgrades({
			id: 'protonise_boost',
			count: 5,
			currency: CurrenciesTypes.PROTONS,
			name: i => `Protonise Master ${i}`,
			description: i => `+${25 * i}% production per protonise`,
			cost: i => {
				const baseCost = Math.ceil(5 * 3 ** (i + 2));
				return i > 3 ? baseCost * i ** 5 : baseCost;
			},
			effects: i => [
				{
					type: 'global',
					description: `Add ${25 * i}% production per protonise`,
					apply: (currentValue, state) => {
						const boost = (state.totalProtonises || 0) * (0.25 * i);
						return currentValue * (1 + boost);
					},
				},
			],
		}),
	);

	// Starting atoms after protonise
	upgrades.push(
		...createUpgrades({
			id: 'protonise_start',
			count: 3,
			currency: CurrenciesTypes.PROTONS,
			name: i => `Quick Start ${i}`,
			description: i => `Start with ${formatNumber(10 ** (3 + i))} atoms after protonising`,
			cost: i => {
				const baseCost = Math.ceil(3 * 2 ** (i + 1));
				return i > 2 ? baseCost * i ** 3 : baseCost;
			},
			effects: i => [
				{
					type: 'global',
					description: `Start with ${formatNumber(10 ** (3 + i))} atoms`,
					apply: currentValue => currentValue,
				},
			],
		}),
	);

	// Auto-clicker upgrade
	upgrades.push(
		...createUpgrades({
			id: 'proton_auto_click',
			count: 5,
			currency: CurrenciesTypes.PROTONS,
			name: i => `Auto Clicker ${i}`,
			description: i => `Automatically clicks ${Math.ceil(i / 2)} time${Math.ceil(i / 2) > 1 ? 's' : ''} per second`,
			cost: i => {
				const baseCost = Math.ceil(3 * 3 ** (i + 1));
				return i > 1 ? baseCost * i ** 4 : baseCost;
			},
			effects: i => [
				{
					type: 'auto_click',
					description: `Clicks ${Math.ceil(i / 2)} time${Math.ceil(i / 2) > 1 ? 's' : ''} per second automatically`,
					apply: currentValue => currentValue + Math.ceil(i / 2),
				},
			],
		}),
	);

	return upgrades;
}

function createElectronUpgrades() {
	const upgrades: Upgrade[] = [];

	// Auto-buy upgrades for each building
	upgrades.push(
		...BUILDING_TYPES.map((buildingType, index) => {
			const building = BUILDINGS[buildingType];
			return {
				id: `electron_auto_buy_${buildingType}`,
				name: `Auto ${building.name}`,
				description: `Automatically buys 1 ${building.name} every 30 seconds`,
				cost: {
					amount: 1 + index,
					currency: CurrenciesTypes.ELECTRONS,
				},
				effects: [
					{
						type: 'auto_buy',
						target: buildingType,
						description: `Auto-buy 1 ${building.name} every 30 seconds`,
						apply: currentValue => 30000, // 30 seconds in milliseconds
					},
				],
			} as Upgrade;
		}),
	);

	// Auto-buy speed upgrades for each building
	upgrades.push(
		...BUILDING_TYPES.map((buildingType, index) => {
			const building = BUILDINGS[buildingType];
			return {
				id: `electron_auto_buy_speed_${buildingType}`,
				name: `Faster Auto ${building.name}`,
				description: `Reduces ${building.name} auto-buy interval by 5 seconds`,
				condition: state => state.upgrades.includes(`electron_auto_buy_${buildingType}`),
				cost: {
					amount: 2 + index,
					currency: CurrenciesTypes.ELECTRONS,
				},
				effects: [
					{
						type: 'auto_buy',
						target: buildingType,
						description: `Reduce auto-buy interval by 5 seconds`,
						apply: currentValue => Math.max(1000, currentValue - 5000), // Minimum 1 second
					},
				],
			} as Upgrade;
		}),
	);

	// Auto-upgrade system
	upgrades.push(
		...createUpgrades({
			id: 'electron_auto_upgrade',
			count: 4,
			currency: CurrenciesTypes.ELECTRONS,
			name: i => `${i === 1 ? 'Auto' : 'Faster Auto'} Upgrade ${i > 1 ? i : ''}`,
			description: i =>
				`${i === 1 ? 'Automatically buys' : 'Reduces auto-upgrade interval by'} ${
					i === 1 ? 'the cheapest available upgrade every 30 seconds' : '5 seconds'
				}`,
			condition: (i, state) => i === 1 || state.upgrades.includes(`electron_auto_upgrade_${i - 1}`),
			cost: i => 20 + (i - 1) * 10,
			effects: i => [
				{
					type: 'auto_upgrade',
					description: i === 1 ? 'Auto-buy upgrades every 30 seconds' : 'Reduce auto-upgrade interval by 5 seconds',
					apply: currentValue => (i === 1 ? 30000 : Math.max(1000, currentValue - 5000)),
				},
			],
		}),
	);

	// Power-up interval reduction
	upgrades.push(
		...createUpgrades({
			id: 'electron_power_up_interval',
			count: 4,
			currency: CurrenciesTypes.ELECTRONS,
			name: i => `${i === 1 ? 'Faster' : 'Even Faster'} Power-ups ${i > 1 ? i : ''}`,
			description: i => `Reduces power-up spawn interval by ${i * 10}%`,
			condition: (i, state) => i === 1 || state.upgrades.includes(`electron_power_up_interval_${i - 1}`),
			cost: i => 5 * i,
			effects: i => [
				{
					type: 'power_up_interval',
					description: `Multiply power-up interval by ${1 - i * 0.1}`,
					apply: currentValue => currentValue * (1 - i * 0.1),
				},
			],
		}),
	);

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
	...createElectronUpgrades(),
];

export const UPGRADES = Object.fromEntries(upgrades.map(upgrade => [upgrade.id, upgrade]));
