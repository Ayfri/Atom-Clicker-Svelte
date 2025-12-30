import type {Currency} from '$lib/types';

export const CurrenciesTypes = {
	ATOMS: 'Atoms',
	ELECTRONS: 'Electrons',
	EXCITED_PHOTONS: 'Excited Photons',
	HIGGS_BOSON: 'Higgs Boson',
	PHOTONS: 'Photons',
	PROTONS: 'Protons',
} as const;

export type CurrencyName = typeof CurrenciesTypes[keyof typeof CurrenciesTypes];

export const CURRENCIES = {
	[CurrenciesTypes.ATOMS]: {
		color: '#4a90e2',
		name: 'Atoms',
		icon: 'atom',
	},
	[CurrenciesTypes.ELECTRONS]: {
		color: '#45d945',
		name: 'Electrons',
		icon: 'electron',
	},
	[CurrenciesTypes.EXCITED_PHOTONS]: {
		color: '#FFD700',
		name: 'Excited Photons',
		icon: 'excited-photon',
	},
	[CurrenciesTypes.HIGGS_BOSON]: {
		color: '#fbbf24',
		name: 'Higgs Boson',
		icon: 'higgs-boson',
	},
	[CurrenciesTypes.PHOTONS]: {
		color: '#9966cc',
		name: 'Photons',
		icon: 'photon',
	},
	[CurrenciesTypes.PROTONS]: {
		color: '#ffd700',
		name: 'Protons',
		icon: 'proton',
	},
} as Record<CurrencyName, Currency>;
