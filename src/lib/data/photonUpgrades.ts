import { CurrenciesTypes } from '$data/currencies';
import type { Effect, GameState, Upgrade } from '$lib/types';
import { formatNumber } from '$lib/utils';

export interface PhotonUpgrade {
	id: string;
	name: string;
	description: (level: number) => string;
	baseCost: number;
	costMultiplier: number;
	maxLevel: number;
	effects: (level: number) => Effect[];
	condition?: (state: GameState) => boolean;
}

export const PHOTON_UPGRADES: Record<string, PhotonUpgrade> = {
	photon_spawn_rate: {
		id: 'photon_spawn_rate',
		name: 'Faster Circles',
		description: (level: number) => `Spawn circles ${formatNumber(5 * level)}% faster`,
		baseCost: 10,
		costMultiplier: 1.5,
		maxLevel: 20,
		effects: (level: number) => [
			{
				type: 'power_up_interval',
				description: `Reduce circle spawn interval by ${5 * level}%`,
				apply: (currentValue) => currentValue * (1 - (0.05 * level)),
			},
		],
	},
	photon_value: {
		id: 'photon_value',
		name: 'Photon Value',
		description: (level: number) => `+${level} photons per circle`,
		baseCost: 25,
		costMultiplier: 2,
		maxLevel: 15,
		effects: (level: number) => [
			{
				type: 'click',
				description: `Add ${level} photons per circle`,
				apply: (currentValue) => currentValue + level,
			},
		],
	},
	circle_lifetime: {
		id: 'circle_lifetime',
		name: 'Circle Duration',
		description: (level: number) => `Circles last ${formatNumber(0.25 * level)}s longer`,
		baseCost: 15,
		costMultiplier: 1.8,
		maxLevel: 10,
		effects: (level: number) => [
			{
				type: 'power_up_duration',
				description: `Increase circle lifetime by ${0.25 * level} seconds`,
				apply: (currentValue) => currentValue + (250 * level), // 250ms per level
			},
		],
	},
	circle_size: {
		id: 'circle_size',
		name: 'Bigger Circles',
		description: (level: number) => `Circles are ${formatNumber(5 * level)}% bigger`,
		baseCost: 30,
		costMultiplier: 1.6,
		maxLevel: 12,
		effects: (level: number) => [
			{
				type: 'global',
				description: `Increase circle size by ${5 * level}%`,
				apply: (currentValue) => currentValue * (1 + (0.05 * level)),
			},
		],
	},
	double_chance: {
		id: 'double_chance',
		name: 'Double Photons',
		description: (level: number) => `${formatNumber(level * 2)}% chance for double photons`,
		baseCost: 100,
		costMultiplier: 2.5,
		maxLevel: 25,
		effects: (level: number) => [
			{
				type: 'power_up_multiplier',
				description: `${level * 2}% chance for double photons`,
				apply: (currentValue) => currentValue,
			},
		],
	},
	auto_clicker: {
		id: 'auto_clicker',
		name: 'Auto Clicker',
		description: (level: number) => `Auto-click ${level} circle${level > 1 ? 's' : ''} every 5 seconds`,
		baseCost: 500,
		costMultiplier: 3,
		maxLevel: 3,
		effects: (level: number) => [
			{
				type: 'auto_click',
				description: `Auto-click ${level} circles every 5 seconds`,
				apply: (currentValue) => currentValue + level,
			},
		],
	},
};

export function getPhotonUpgradeCost(upgrade: PhotonUpgrade, level: number): number {
	return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
}

export function canAffordPhotonUpgrade(upgrade: PhotonUpgrade, level: number, photons: number): boolean {
	return photons >= getPhotonUpgradeCost(upgrade, level);
}
