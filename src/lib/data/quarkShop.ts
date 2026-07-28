import type { Effect } from '$lib/types';

export interface SkinDefinition {
	/** Optional icon id override, resolved at render time. Undefined keeps the default icon. */
	iconId?: string;
	palette: string[];
}

export interface QuarkShopItem {
	cost: number;
	description: string;
	effects?: Effect[]; // boosts and convenience items only
	id: string;
	name: string;
	skin?: SkinDefinition; // skins only
	type: 'boost' | 'convenience' | 'skin';
}

export const QUARK_SHOP: Record<string, QuarkShopItem> = {
	boost_click_power: {
		cost: 60,
		description: 'Permanently doubles click power.',
		effects: [
			{
				apply: currentValue => currentValue * 2,
				description: 'Double click power',
				type: 'click',
			},
		],
		id: 'boost_click_power',
		name: 'Heavy Click Boost',
		type: 'boost',
	},
	boost_global_production: {
		cost: 120,
		description: 'Permanently increases all production by 10%.',
		effects: [
			{
				apply: currentValue => currentValue * 1.1,
				description: '+10% global production',
				type: 'global',
			},
		],
		id: 'boost_global_production',
		name: 'Global Production Boost',
		type: 'boost',
	},
	boost_xp_gain: {
		cost: 50,
		description: 'Permanently increases XP gain by 25%.',
		effects: [
			{
				apply: currentValue => currentValue * 1.25,
				description: '+25% XP gain',
				type: 'xp_gain',
			},
		],
		id: 'boost_xp_gain',
		name: 'Experience Boost',
		type: 'boost',
	},
	convenience_auto_buy_speed: {
		cost: 80,
		description: 'Permanently increases auto-buyer speed by 20%.',
		effects: [
			{
				apply: currentValue => currentValue * 1.2,
				description: '+20% auto-buy speed',
				type: 'auto_speed',
			},
		],
		id: 'convenience_auto_buy_speed',
		name: 'Faster Auto-Buyers',
		type: 'convenience',
	},
	convenience_power_up_duration: {
		cost: 70,
		description: 'Permanently increases power-up duration by 20%.',
		effects: [
			{
				apply: currentValue => currentValue * 1.2,
				description: '+20% power-up duration',
				type: 'power_up_duration',
			},
		],
		id: 'convenience_power_up_duration',
		name: 'Extended Power-Ups',
		type: 'convenience',
	},
	skin_nebula: {
		cost: 15,
		description: 'A cool blue and violet nebula palette.',
		id: 'skin_nebula',
		name: 'Nebula',
		skin: {
			palette: ['#4a9eff', '#8b5cf6'],
		},
		type: 'skin',
	},
	skin_solar: {
		cost: 15,
		description: 'A warm gold and orange solar palette.',
		id: 'skin_solar',
		name: 'Solar Flare',
		skin: {
			palette: ['#fbbf24', '#ff7849'],
		},
		type: 'skin',
	},
	skin_toxic: {
		cost: 20,
		description: 'A striking green and black toxic palette.',
		id: 'skin_toxic',
		name: 'Toxic',
		skin: {
			palette: ['#3ddc84', '#1a1a1a'],
		},
		type: 'skin',
	},
	skin_void: {
		cost: 25,
		description: 'A deep red and black void palette.',
		id: 'skin_void',
		name: 'Void',
		skin: {
			palette: ['#ff4d4d', '#0f0f0f'],
		},
		type: 'skin',
	},
};

export function getQuarkShopItem(itemId: string): QuarkShopItem | undefined {
	return QUARK_SHOP[itemId];
}
