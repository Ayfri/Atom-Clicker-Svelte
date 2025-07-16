import type {BuildingType} from '$data/buildings';
import type {CurrencyName} from '$data/currencies';

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
	type: 'auto_buy' | 'auto_click' | 'auto_speed' | 'auto_upgrade' | 'building' | 'click' | 'electron_gain' | 'global' | 'power_up_duration' | 'power_up_interval' | 'power_up_multiplier' | 'proton_gain' | 'xp_gain';
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

export interface Settings {
	automation: {
		buildings: BuildingType[];
		upgrades: boolean;
	};
}

export interface GameState {
	achievements: string[];
	activePowerUps: PowerUp[];
	atoms: number;
	buildings: Partial<Record<BuildingType, Building>>;
	electrons: number;
	lastSave: number;
	photons: number;
	photonUpgrades: Record<string, number>;
	protons: number;
	settings: Settings;
	skillUpgrades: string[];
	startDate: number;
	totalBonusPhotonsClicked: number;
	totalClicks: number;
	totalElectronizes: number;
	totalProtonises: number;
	totalXP: number;
	upgrades: string[];
	version: number;
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
