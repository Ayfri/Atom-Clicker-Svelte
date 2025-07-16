import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { statManager, upgrades } from '$stores/gameStore';
import { CURRENCIES, CurrenciesTypes } from '$data/currencies';
import { STATS } from '$helpers/statConstants';
import type { Currency } from '$lib/types';
import type { ComponentType } from 'svelte';
import AtomRealm from '@components/organisms/AtomRealm.svelte';
import PhotonRealm from '@components/organisms/PhotonRealm.svelte';

export interface RealmConfig {
	id: string;
	currency: Currency;
	store: Writable<number>;
	title: string;
	activeClasses: string;
	isUnlocked: (upgrades: string[]) => boolean;
	component: ComponentType;
	props?: Record<string, unknown>;
}

interface RealmManagerStore {
	availableRealms: RealmConfig[];
	realmValues: Record<string, number>;
	selectedRealm: string;
}

class RealmManager implements Readable<RealmManagerStore> {
	public readonly realms: RealmConfig[];
	private readonly _selectedRealm: Writable<string>;
	private readonly _availableRealms: Readable<RealmConfig[]>;
	private readonly _realmValues: Readable<Record<string, number>>;
	public readonly subscribe: (
		this: void,
		run: (value: RealmManagerStore) => void,
		invalidate?: (value?: RealmManagerStore) => void
	) => () => void;

	constructor() {
		this.realms = [
			{
				id: 'atoms',
				currency: CURRENCIES[CurrenciesTypes.ATOMS],
				store: statManager.getNumber(STATS.ATOMS)!.store,
				title: 'Atoms Realm',
				activeClasses: 'bg-accent-500/60 border-accent-400/50',
				isUnlocked: () => true,
				component: AtomRealm
			},
			{
				id: 'photons',
				currency: CURRENCIES[CurrenciesTypes.PHOTONS],
				store: statManager.getNumber(STATS.PHOTONS)!.store,
				title: 'Purple Realm',
				activeClasses: 'bg-realm-500/60 border-realm-400/50',
				isUnlocked: (upgrades) => upgrades.includes('feature_purple_realm'),
				component: PhotonRealm
			}
		];

		this._selectedRealm = writable(this.realms[0].id);

		this._availableRealms = derived(upgrades, ($upgrades) => {
			return this.realms.filter((r) => r.isUnlocked($upgrades));
		});

		const storesToWatch = this.realms.map((r) => r.store);
		this._realmValues = derived(storesToWatch, ($values) => {
			return this.realms.reduce(
				(acc, screen, index) => {
					acc[screen.id] = $values[index];
					return acc;
				},
				{} as Record<string, number>
			);
		});

		const combinedStore = derived(
			[this._selectedRealm, this._availableRealms, this._realmValues],
			([$selectedRealm, $availableRealms, $realmValues]) => ({
				selectedRealm: $selectedRealm,
				availableRealms: $availableRealms,
				realmValues: $realmValues
			})
		);

		this.subscribe = combinedStore.subscribe;
	}

	selectRealm(realmId: string) {
		this._selectedRealm.set(realmId);
	}
}

export const realmManager = new RealmManager();
