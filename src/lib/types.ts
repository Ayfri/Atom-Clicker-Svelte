import type {BuildingType} from '$data/buildings';
import type {CurrencyName} from '$data/currencies';
import type {SAVE_VERSION} from '$helpers/saves';

export interface Building {
	count: number;
	cost: Price;
	level: number;
	rate: number;
	unlocked: boolean;
}

export interface Upgrade {
	id: string;
	name: string;
	condition?: (state: GameState) => boolean;
	description: string;
	effects: Effect[];
	cost: Price;
}

export interface Effect {
	target?: string;
	type: 'auto_click' | 'building' | 'click' | 'global' | 'power_up_interval' | 'power_up_duration' | 'power_up_multiplier' | 'xp_gain';
	apply: (currentValue: number, state: GameState) => number;
	description: string;
}

export interface Achievement {
	condition: (state: GameState) => boolean;
	description: string;
	hiddenCondition?: (state: GameState) => boolean;
	id: string;
	name: string;
}

export interface PowerUp {
	description: string;
	duration: number;
	id: string;
	multiplier: number;
	name: string;
	startTime: number;
}

export interface GameState {
	achievements: string[];
	activePowerUps: PowerUp[];
	atoms: number;
	protons: number;
	buildings: {
		[key in BuildingType]?: Building;
	}
	lastSave: number;
	skillUpgrades: string[];
	startDate: number;
	totalClicks: number;
	totalXP: number;
	upgrades: string[];
	version: typeof SAVE_VERSION;
	totalProtonises: number;
}

export type Range = [number, number];

export interface SkillUpgrade {
	id: string;
	name: string;
	description: string;
	position: { x: number; y: number };
	condition?: (state: GameState) => boolean;
	effects: Effect[];
	requires?: string[];
}

export interface Currency {
	color: string;
	name: string;
	icon: string;
}

export interface Price {
	amount: number;
	currency: CurrencyName;
}
