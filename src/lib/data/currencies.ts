import { LAYERS } from '$helpers/statConstants';
import type { Currency } from '$lib/types';

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
		achievementTiers: [100, 1000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000],
		color: '#4a90e2',
		id: 'atom',
		layer: LAYERS.PROTONIZER,
		name: 'Atoms',
		stat: CurrenciesTypes.ATOMS,
	},
	[CurrenciesTypes.ELECTRONS]: {
		color: '#45d945',
		id: 'electron',
		layer: LAYERS.SPECIAL,
		name: 'Electrons',
		stat: CurrenciesTypes.ELECTRONS,
	},
	[CurrenciesTypes.EXCITED_PHOTONS]: {
		achievementTiers: [1, 20, 1000, 400_000],
		color: '#FFD700',
		id: 'excited-photon',
		layer: LAYERS.PHOTON_REALM,
		name: 'Excited Photons',
		stat: CurrenciesTypes.EXCITED_PHOTONS,
	},
	[CurrenciesTypes.HIGGS_BOSON]: {
		achievementTiers: [1, 10, 64, 512, 4096],
		color: '#fbbf24',
		id: 'higgs-boson',
		name: 'Higgs Boson',
		stat: CurrenciesTypes.HIGGS_BOSON,
	},
	[CurrenciesTypes.PHOTONS]: {
		achievementTiers: [1, 100, 1000, 10_000, 100_000, 1_000_000],
		color: '#9966cc',
		id: 'photon',
		layer: LAYERS.PHOTON_REALM,
		name: 'Photons',
		stat: CurrenciesTypes.PHOTONS,
	},
	[CurrenciesTypes.PROTONS]: {
		color: '#ffd700',
		id: 'proton',
		layer: LAYERS.ELECTRONIZE,
		name: 'Protons',
		stat: CurrenciesTypes.PROTONS,
	},
} as Record<CurrencyName, Currency>;
