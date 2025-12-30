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
		icon: 'atom',
		name: 'Atoms',
		stat: 'atoms',
	},
	[CurrenciesTypes.ELECTRONS]: {
		achievementIdPrefix: 'electronizes',
		achievementTiers: [1, 2, 3, 5, 10, 20, 50, 100, 250, 500, 1000],
		color: '#45d945',
		icon: 'electron',
		name: 'Electrons',
		stat: 'totalElectronizesAllTime',
	},
	[CurrenciesTypes.EXCITED_PHOTONS]: {
		achievementIdPrefix: 'excited_photons',
		achievementTiers: [1, 20, 1000, 400_000],
		color: '#FFD700',
		icon: 'excited-photon',
		name: 'Excited Photons',
		stat: 'totalExcitedPhotonsEarnedAllTime',
	},
	[CurrenciesTypes.HIGGS_BOSON]: {
		achievementIdPrefix: 'bonus_higgs_boson_clicked',
		achievementTiers: [1, 10, 64, 512, 4096],
		color: '#fbbf24',
		icon: 'higgs-boson',
		name: 'Higgs Boson',
		stat: 'totalBonusHiggsBosonClickedAllTime',
	},
	[CurrenciesTypes.PHOTONS]: {
		achievementIdPrefix: 'photons',
		achievementTiers: [1, 100, 1000, 10_000, 100_000, 1_000_000],
		color: '#9966cc',
		icon: 'photon',
		name: 'Photons',
		stat: 'totalPhotonsEarnedAllTime',
	},
	[CurrenciesTypes.PROTONS]: {
		achievementIdPrefix: 'protonises',
		achievementTiers: [1, 2, 3, 5, 10, 20, 50, 100, 250, 500, 1000],
		color: '#ffd700',
		icon: 'proton',
		name: 'Protons',
		stat: 'totalProtonisesAllTime',
	},
} as Record<CurrencyName, Currency>;
