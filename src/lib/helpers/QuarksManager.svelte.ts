import { browser } from '$app/environment';
import { type DailyQuest, getQuestTarget, QUEST_POOL } from '$data/dailyQuests';
import { getQuarkShopItem, QUARK_SHOP } from '$data/quarkShop';
import type { Effect } from '$lib/types';
import { obfuscateClientData } from '$lib/utils/obfuscation';
import { gameManager } from '$helpers/GameManager.svelte';
import { supabaseAuth } from '$stores/supabaseAuth.svelte';
import { toastStore } from '$stores/toasts.svelte';

// NOTE: this manager may read `gameManager`, but `gameManager` never imports this module.
// src/lib/simulation/engine.ts and simulation.worker.ts import GameManager and run in a Web
// Worker with no auth context and no DOM - if QuarksManager got pulled into that import graph
// it would attempt to fetch() from inside the worker. GameManager instead exposes a plain
// `quarkBoostEffects` field that this manager pushes into, see GameManager.svelte.ts.

interface QuarksApiState {
	balance: number;
	claimedQuestIds: string[];
	dailyCap: number;
	dayKey: string;
	entitlements: string[];
	equippedSkin: string | null;
	quests: DailyQuest[];
}

export class QuarksManager {
	balance = $state(0);
	claimedQuestIds = $state<string[]>([]);
	dayKey = $state('');
	entitlements = $state<string[]>([]);
	equippedSkin = $state<string | null>(null);
	lastSyncError = $state<string | null>(null);
	loading = $state(false);
	quests = $state<DailyQuest[]>(QUEST_POOL.slice(0, 3));

	ownedBoostEffects = $derived.by<Effect[]>(() => {
		return this.entitlements
			.map(id => getQuarkShopItem(id))
			.filter(item => item?.type === 'boost' || item?.type === 'convenience')
			.flatMap(item => item?.effects ?? []);
	});

	hasClaimableQuest = $derived.by(() => {
		return this.quests.some(quest => !this.claimedQuestIds.includes(quest.id) && this.isQuestComplete(quest));
	});

	/** Pushes owned boost/convenience effects into GameManager. Called whenever `entitlements` changes. */
	private applyBoostEffects() {
		gameManager.quarkBoostEffects = this.ownedBoostEffects;
	}

	isQuestComplete(quest: DailyQuest): boolean {
		return this.getProgress(quest) >= this.getTarget(quest);
	}

	getTarget(quest: DailyQuest): number {
		const frozen = gameManager.dailyStats.questTargets[quest.id];
		if (typeof frozen === 'number') return frozen;
		// Not frozen yet (e.g. before the first sync), fall back to a live estimate.
		return getQuestTarget(quest, {
			atomsEarned: gameManager.highestAPS,
			buildingsPurchased: 0,
			clicks: 0,
			powerUpsCollected: 0,
			protonises: 0,
			upgradesPurchased: 0,
		});
	}

	getProgress(quest: DailyQuest): number {
		return gameManager.dailyStats[quest.metric] ?? 0;
	}

	private async authHeaders(): Promise<Record<string, string> | null> {
		if (!browser || !supabaseAuth.isAuthenticated) return null;
		const accessToken = await supabaseAuth.getAccessToken();
		if (!accessToken) return null;
		return { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
	}

	private rolloverDailyStatsIfNeeded(serverDayKey: string) {
		if (gameManager.dailyStats.dayKey === serverDayKey) return;

		const questTargets: Record<string, number> = {};
		for (const quest of this.quests) {
			questTargets[quest.id] = this.getTarget(quest);
		}

		gameManager.dailyStats = {
			atomsEarned: 0,
			buildingsPurchased: 0,
			clicks: 0,
			dayKey: serverDayKey,
			powerUpsCollected: 0,
			protonises: 0,
			questTargets,
			upgradesPurchased: 0,
		};
	}

	async sync() {
		if (!browser) return;

		this.loading = true;
		try {
			const headers = await this.authHeaders();
			const response = await fetch('/api/quarks', { headers: headers ?? undefined });
			if (!response.ok) throw new Error(`Sync failed with status ${response.status}`);

			const data: QuarksApiState = await response.json();
			this.balance = data.balance;
			this.claimedQuestIds = data.claimedQuestIds;
			this.dayKey = data.dayKey;
			this.entitlements = data.entitlements;
			this.equippedSkin = data.equippedSkin;
			this.quests = data.quests;
			this.lastSyncError = null;
			this.applyBoostEffects();

			this.rolloverDailyStatsIfNeeded(data.dayKey);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown sync error';
			this.lastSyncError = message;
			toastStore.error({ message: 'Could not sync Quarks with the server.', title: 'Quarks sync failed' });
		} finally {
			this.loading = false;
		}
	}

	private async postAction<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
		const headers = await this.authHeaders();
		if (!headers) {
			toastStore.error({ message: 'Sign in to use Quarks.', title: 'Not signed in' });
			return null;
		}

		try {
			const response = await fetch(path, {
				body: JSON.stringify(obfuscateClientData(body)),
				headers,
				method: 'POST',
			});
			const result = await response.json();
			if (!response.ok) {
				toastStore.error({ message: result.error ?? 'Request failed.', title: 'Quarks' });
				return null;
			}
			return result as T;
		} catch (error) {
			toastStore.error({ message: 'Network error while talking to Quarks.', title: 'Quarks' });
			return null;
		}
	}

	async claimQuest(questId: string) {
		const result = await this.postAction<{ balance: number; status: string }>('/api/quarks/claim', { questId });
		if (!result) return;

		if (result.status === 'ok') {
			this.balance = result.balance;
			this.claimedQuestIds = [...this.claimedQuestIds, questId];
			const quest = this.quests.find(q => q.id === questId);
			toastStore.info({ message: quest ? quest.description(this.getTarget(quest)) : 'Quest claimed.', title: '+1 Quark' });
		} else if (result.status === 'already_claimed') {
			this.claimedQuestIds = [...new Set([...this.claimedQuestIds, questId])];
		}
	}

	async claimAchievement(achievementId: string) {
		// Opportunistic, fired automatically on every unlock: fail silently while signed out
		// rather than surfacing a "sign in" toast for something the player didn't initiate.
		// It is retried by the retroactive backfill on the next sync() after signing in.
		if (!supabaseAuth.isAuthenticated) return;

		const result = await this.postAction<{ balance: number; granted: number }>('/api/quarks/achievement', {
			achievementIds: [achievementId],
		});
		if (!result) return;

		this.balance = result.balance;
		if (result.granted > 0) {
			toastStore.info({ message: 'Achievement reward claimed.', title: '+1 Quark' });
		}
	}

	/** Retroactive backfill for already-unlocked achievements. Safe to call repeatedly, idempotent via the ledger ref. */
	async claimAchievements(achievementIds: string[]) {
		if (!supabaseAuth.isAuthenticated) return;

		const result = await this.postAction<{ balance: number; granted: number }>('/api/quarks/achievement', { achievementIds });
		if (!result) return;

		this.balance = result.balance;
	}

	async purchase(itemId: string) {
		const result = await this.postAction<{ balance: number; status: string }>('/api/quarks/purchase', { itemId });
		if (!result) return;

		if (result.status === 'ok') {
			this.balance = result.balance;
			this.entitlements = [...this.entitlements, itemId];
			this.applyBoostEffects();
		} else {
			toastStore.error({ message: result.status.replaceAll('_', ' '), title: 'Purchase failed' });
		}
	}

	async refund(itemId: string) {
		const item = getQuarkShopItem(itemId);
		if (item?.type === 'skin') return;

		const result = await this.postAction<{ balance: number; refunded?: number; status: string }>('/api/quarks/refund', { itemId });
		if (!result) return;

		if (result.status === 'ok') {
			this.balance = result.balance;
			this.entitlements = this.entitlements.filter(id => id !== itemId);
			this.applyBoostEffects();
		} else {
			toastStore.error({ message: result.status.replaceAll('_', ' '), title: 'Refund failed' });
		}
	}

	async equipSkin(itemId: string | null) {
		const result = await this.postAction<{ equippedSkin: string | null }>('/api/quarks/equip', { itemId });
		if (!result) return;

		this.equippedSkin = result.equippedSkin;
	}
}

export const quarksManager = new QuarksManager();

export const QUARK_SHOP_ITEMS = Object.values(QUARK_SHOP);
