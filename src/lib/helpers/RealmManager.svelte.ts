import { gameManager } from '$helpers/GameManager.svelte';
import { CURRENCIES, CurrenciesTypes } from '$data/currencies';
import type { Currency } from '$lib/types';
import type { Component } from 'svelte';
import AtomRealm from '@components/prestige/AtomRealm.svelte';
import PhotonRealm from '@components/prestige/PhotonRealm.svelte';

export interface RealmConfig {
	component: Component;
	activeClasses: string;
	currency: Currency;
	footerTheme: RealmFooterTheme;
	id: string;
	isUnlocked: () => boolean;
	props?: Record<string, unknown>;
	title: string;
	getValue: () => number;
}

export interface RealmFooterTheme {
	baseClass: string;
	hoverClass: string;
	mutedClass: string;
	mutedHoverClass: string;
}

class RealmManager {
	selectedRealmId = $state('atoms');

	realms: RealmConfig[] = [
		{
			activeClasses: 'bg-accent-500/60 border-accent-400/50',
			component: AtomRealm,
			currency: CURRENCIES[CurrenciesTypes.ATOMS],
			footerTheme: {
				baseClass: 'text-white/60',
				hoverClass: 'hover:text-white',
				mutedClass: 'text-white/40',
				mutedHoverClass: 'hover:text-white'
			},
			id: 'atoms',
			title: 'Atoms Realm',
			isUnlocked: () => true,
			getValue: () => gameManager.atoms
		},
		{
			activeClasses: 'bg-realm-500/60 border-realm-400/50',
			component: PhotonRealm,
			currency: CURRENCIES[CurrenciesTypes.PHOTONS],
			footerTheme: {
				baseClass: 'text-white/85',
				hoverClass: 'hover:text-purple-200',
				mutedClass: 'text-white/70',
				mutedHoverClass: 'hover:text-purple-200'
			},
			id: 'photons',
			title: 'Purple Realm',
			isUnlocked: () => gameManager.purpleRealmUnlocked,
			getValue: () => gameManager.photons
		}
	];

	get availableRealms() {
		return this.realms.filter((r) => r.isUnlocked());
	}

	get selectedRealm() {
		return this.realms.find((r) => r.id === this.selectedRealmId) || this.realms[0];
	}

	get realmValues() {
		return this.realms.reduce(
			(acc, realm) => {
				acc[realm.id] = realm.getValue();
				return acc;
			},
			{} as Record<string, number>
		);
	}

	selectRealm(id: string) {
		if (this.realms.find((r) => r.id === id && r.isUnlocked())) {
			this.selectedRealmId = id;
		}
	}
}

export const realmManager = new RealmManager();
