import type {BuildingType} from '$data/buildings';
import type {CurrencyName} from '$data/currencies';
import type {GameManager} from '$helpers/GameManager.svelte';

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
	condition?: (state: GameManager) => boolean;
	description: string;
	effects: Effect[];
	cost: Price;
}

export interface Effect {
	target?: string;
	type: 'auto_buy' | 'auto_click' | 'auto_speed' | 'auto_upgrade' | 'building' | 'click' | 'electron_gain' | 'global' | 'power_up_duration' | 'power_up_interval' | 'power_up_multiplier' | 'proton_gain' | 'xp_gain';
	apply: (currentValue: number, manager: GameManager) => number;
	description: string;
}

export interface Achievement {
	condition: (manager: GameManager) => boolean;
	description: string;
	hiddenCondition?: (manager: GameManager) => boolean;
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
		autoClick: boolean;
		autoClickPhotons: boolean;
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
	highestAPS: number;
	inGameTime: number;
	lastSave: number;
	photons: number;
	photonUpgrades: Record<string, number>;
	powerUpsCollected: number;
	protons: number;
	purpleRealmUnlocked: boolean;
	settings: Settings;
	skillUpgrades: string[];
	startDate: number;
	totalAtomsEarned: number;
	totalAtomsEarnedAllTime: number;
	totalBonusPhotonsClicked: number;
	totalBuildingsPurchased: number;
	totalClicks: number;
	totalClicksAllTime: number;
	totalElectronizes: number;
	totalElectronsEarned: number;
	totalProtonises: number;
	totalProtonsEarned: number;
	totalUpgradesPurchased: number;
	totalUsers: number;
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
	condition?: (manager: GameManager) => boolean;
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
