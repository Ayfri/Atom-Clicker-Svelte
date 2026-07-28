import { CurrenciesTypes, type CurrencyName } from '$data/currencies';

let selected = $state<CurrencyName>(CurrenciesTypes.PHOTONS);

export const photonUpgradesTab = {
	get selected() {
		return selected;
	},
	set selected(value: CurrencyName) {
		selected = value;
	},
};
