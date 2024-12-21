import type {Currency} from '$lib/types';

export const CurrenciesTypes = {
	ATOMS: 'Atoms',
	PROTONS: 'Protons',
} as const;

export type CurrencyName = typeof CurrenciesTypes[keyof typeof CurrenciesTypes];

export const CURRENCIES = {
	[CurrenciesTypes.ATOMS]: {
		color: '#4a90e2',
		name: 'Atoms',
		icon: 'atom',
	},
	[CurrenciesTypes.PROTONS]: {
		color: '#ffd700',
		name: 'Protons',
		icon: 'proton',
	},
} as Record<CurrencyName, Currency>;
