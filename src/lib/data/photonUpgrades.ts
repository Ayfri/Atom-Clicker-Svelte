import type { Effect } from '$lib/types';
import type { GameManager } from '$helpers/GameManager.svelte';
import { formatNumber } from '$lib/utils';
import type { CurrencyName } from '$data/currencies';

export interface PhotonUpgrade {
	id: string;
	name: string;
	description: (level: number) => string;
	baseCost: number;
	costMultiplier: number;
	currency?: CurrencyName;
	maxLevel: number;
	effects: (level: number) => Effect[];
	condition?: (manager: GameManager) => boolean;
}

export const PHOTON_UPGRADES: Record<string, PhotonUpgrade> = {
	photon_spawn_rate: {
		id: 'photon_spawn_rate',
		name: 'Faster Circles',
		description: (level: number) => `Spawn circles ${formatNumber(4 * level)}% faster`,
		baseCost: 10,
		costMultiplier: 1.6,
		maxLevel: 22,
		effects: (level: number) => [
			{
				type: 'power_up_interval',
				description: `Reduce circle spawn interval by ${4 * level}%`,
				apply: (currentValue) => currentValue * (1 - (0.04 * level)),
			},
		],
	},
	photon_value: {
		id: 'photon_value',
		name: 'Photon Value',
		description: (level: number) => `+${level} photons per circle`,
		baseCost: 25,
		costMultiplier: 1.75,
		maxLevel: 20,
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
		costMultiplier: 2.25,
		maxLevel: 10,
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
		maxLevel: 5,
		effects: (level: number) => [
			{
				type: 'auto_click',
				description: `Auto-click ${level} circles every 5 seconds`,
				apply: (currentValue) => currentValue + level,
			},
		],
	},
	electron_boost: {
		id: 'electron_boost',
		name: 'Electron Amplifier',
		description: (level: number) => `${formatNumber(25 * level)}% more electrons from electronize`,
		baseCost: 2500,
		costMultiplier: 4,
		maxLevel: 8,
		effects: (level: number) => [
			{
				type: 'electron_gain',
				description: `Multiply electron gain by ${1 + (0.25 * level)}`,
				apply: (currentValue) => currentValue * (1 + (0.25 * level)),
			},
		],
		condition: (manager: GameManager) => manager.electrons > 0,
	},
	proton_boost: {
		id: 'proton_boost',
		name: 'Proton Multiplier',
		description: (level: number) => `${formatNumber(15 * level)}% more protons from protonise`,
		baseCost: 5000,
		costMultiplier: 5,
		maxLevel: 6,
		effects: (level: number) => [
			{
				type: 'proton_gain',
				description: `Multiply proton gain by ${1 + (0.15 * level)}`,
				apply: (currentValue) => currentValue * (1 + (0.15 * level)),
			},
		],
		condition: (manager: GameManager) => manager.protons > 0,
	},
	electron_super_boost: {
		id: 'electron_super_boost',
		name: 'Electron Overdrive',
		description: (level: number) => `${formatNumber(50 * level)}% more electrons from electronize`,
		baseCost: 25000,
		costMultiplier: 6,
		maxLevel: 5,
		effects: (level: number) => [
			{
				type: 'electron_gain',
				description: `Multiply electron gain by ${1 + (0.5 * level)}`,
				apply: (currentValue) => currentValue * (1 + (0.5 * level)),
			},
		],
		condition: (manager: GameManager) => manager.electrons >= 10,
	},
	proton_super_boost: {
		id: 'proton_super_boost',
		name: 'Proton Overdrive',
		description: (level: number) => `${formatNumber(40 * level)}% more protons from protonise`,
		baseCost: 50000,
		costMultiplier: 7,
		maxLevel: 4,
		effects: (level: number) => [
			{
				type: 'proton_gain',
				description: `Multiply proton gain by ${1 + (0.4 * level)}`,
				apply: (currentValue) => currentValue * (1 + (0.4 * level)),
			},
		],
		condition: (manager: GameManager) => manager.protons >= 5,
	},
	quantum_fluctuation: {
		id: 'quantum_fluctuation',
		name: 'Quantum Fluctuation',
		description: (level: number) => `Increases chance for Excited Photons to spawn (+${formatNumber(0.02 * level)}%)`,
		baseCost: 1,
		costMultiplier: 1.5,
		currency: 'Excited Photons',
		maxLevel: 20,
		effects: (level: number) => [
			{
				type: 'excited_photon_chance',
				description: `Increase excited photon chance by ${0.02 * level}%`,
				apply: (currentValue) => currentValue + (0.0002 * level),
			},
		],
	},
	energetic_decay: {
		id: 'energetic_decay',
		name: 'Energetic Decay',
		description: (level: number) => `Excited Photons stay on screen ${20 * level}% longer`,
		baseCost: 20,
		costMultiplier: 1.5,
		currency: 'Excited Photons',
		maxLevel: 5,
		effects: (level: number) => [
			{
				type: 'excited_photon_duration',
				description: `Excited Photons stay ${20 * level}% longer`,
				apply: (currentValue) => currentValue * (1 + (0.2 * level)),
			},
		],
	},
	excited_yield: {
		id: 'excited_yield',
		name: 'Excited Yield',
		description: (level: number) => `${10 * level}% chance to get double Excited Photons`,
		baseCost: 50,
		costMultiplier: 1.5,
		currency: 'Excited Photons',
		maxLevel: 10,
		effects: (level: number) => [
			{
				type: 'excited_photon_double',
				description: `${10 * level}% chance for double Excited Photons`,
				apply: (currentValue) => currentValue + (0.1 * level),
			},
		],
	},
	excited_stabilization: {
		id: 'excited_stabilization',
		name: 'Excited Stabilization',
		description: (level: number) => `Increase Stabilization field speed and bonus by ${300 * level}% but it now collapse also when you click on purple realm`,
		baseCost: 1000,
		costMultiplier: 2,
		currency: 'Excited Photons',
		maxLevel: 3,
		effects: (level: number) => [
			{
				type: 'stability_speed',
				description: `Increase stability speed by ${300 * level}%`,
				apply: (currentValue) => currentValue * (1 + (3 * level)),
			},
			{
				type: 'stability_boost',
				description: `Increase stability bonus by ${300 * level}%`,
				apply: (currentValue) => currentValue * (1 + (3 * level)),
			},
		],
	},
	excited_auto_click: {
		id: 'excited_auto_click',
		name: 'Excited Targeting',
		description: () => 'The auto-clicker can now target Excited Photons.',
		baseCost: 35,
		costMultiplier: 1.5,
		currency: 'Excited Photons',
		maxLevel: 1,
		effects: () => [
			{
				type: 'excited_auto_click',
				description: 'Enables auto-clicking on Excited Photons',
				apply: (currentValue) => currentValue,
			},
		],
		condition: (manager) => manager.totalExcitedPhotonsEarnedAllTime > 0,
	},
};

export function getPhotonUpgradeCost(upgrade: PhotonUpgrade, level: number): number {
	return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
}

export function canAffordPhotonUpgrade(upgrade: PhotonUpgrade, level: number, manager: GameManager): boolean {
	const currency = upgrade.currency || 'Photons';
	const cost = getPhotonUpgradeCost(upgrade, level);

	if (currency === 'Excited Photons') {
		return manager.excitedPhotons >= cost;
	}
	return manager.photons >= cost;
}
