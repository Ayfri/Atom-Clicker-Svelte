<script lang="ts">
	import Quark from '@components/icons/Quark.svelte';
	import HelpIcon from '@components/ui/HelpIcon.svelte';
	import Modal from '@components/ui/Modal.svelte';
	import QuarkLabel from '@components/ui/QuarkLabel.svelte';
	import { getQuestTarget } from '$data/dailyQuests';
	import { QUARK_SHOP } from '$data/quarkShop';
	import { gameManager } from '$helpers/GameManager.svelte';
	import { quarksManager } from '$helpers/QuarksManager.svelte';
	import { formatNumber } from '$lib/utils';
	import { supabaseAuth } from '$stores/supabaseAuth.svelte';
	import { Check, Lock, RotateCcw, ShoppingBag, Sparkles, Target } from '@lucide/svelte';
	import { onMount } from 'svelte';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let activeTab = $state<'quests' | 'shop' | 'skins'>('quests');

	const shopItems = Object.values(QUARK_SHOP);
	const boostItems = shopItems.filter(item => item.type === 'boost' || item.type === 'convenience');
	const skinItems = shopItems.filter(item => item.type === 'skin');

	onMount(() => {
		quarksManager.sync();
	});

	function questTarget(quest: (typeof quarksManager.quests)[number]) {
		const frozen = gameManager.dailyStats.questTargets[quest.id];
		return typeof frozen === 'number' ?
			frozen
		:	getQuestTarget(quest, {
				atomsEarned: gameManager.highestAPS,
				buildingsPurchased: 0,
				clicks: 0,
				powerUpsCollected: 0,
				protonises: 0,
				upgradesPurchased: 0,
			});
	}
</script>

{#snippet quarkAmount(amount: number)}
	<span class="inline-flex items-center gap-1 font-mono">
		<Quark size={14} class="shrink-0" />
		{formatNumber(amount)}
	</span>
{/snippet}

<Modal {onClose} width="lg">
	{#snippet header()}
		<div class="flex flex-1 items-center gap-3">
			<Quark size={28} color="white" mono />
			<div class="flex flex-col">
				<h2 class="text-2xl font-bold text-white"><QuarkLabel icon={false} size={20} /></h2>
				<span class="text-sm text-white/60">Balance: {@render quarkAmount(quarksManager.balance)}</span>
			</div>
		</div>
	{/snippet}

	<div class="flex flex-col gap-6">
		{#if !supabaseAuth.isAuthenticated}
			<div class="rounded-lg bg-black/20 p-3 text-sm text-white/60">
				Sign in to claim quests, buy items and equip skins. Progress is still tracked while signed out.
			</div>
		{/if}

		<div class="flex gap-2 border-b border-white/10 pb-2">
			<button
				class="cursor-pointer flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors {activeTab === 'quests' ? 'bg-accent-700 text-white' : 'text-white/60 hover:text-white'}"
				onclick={() => (activeTab = 'quests')}
			>
				<Target size={16} /> Quests
			</button>
			<button
				class="cursor-pointer flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors {activeTab === 'shop' ? 'bg-accent-700 text-white' : 'text-white/60 hover:text-white'}"
				onclick={() => (activeTab = 'shop')}
			>
				<ShoppingBag size={16} /> Shop
			</button>
			<button
				class="cursor-pointer flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors {activeTab === 'skins' ? 'bg-accent-700 text-white' : 'text-white/60 hover:text-white'}"
				onclick={() => (activeTab = 'skins')}
			>
				<Sparkles size={16} /> Skins
			</button>
		</div>

		{#if activeTab === 'quests'}
			<section class="flex flex-col gap-3">
				<h3 class="flex items-center gap-1 text-lg font-bold text-white/80">
					Daily Quests
					<HelpIcon>
						{#snippet content()}
							Three quests are picked for you every UTC day, worth 1 <QuarkLabel /> each. Targets scale with your best-ever
							production so they stay reasonable at any stage.
						{/snippet}
					</HelpIcon>
				</h3>

				{#each quarksManager.quests as quest (quest.id)}
					{@const target = questTarget(quest)}
					{@const progress = gameManager.dailyStats[quest.metric] ?? 0}
					{@const claimed = quarksManager.claimedQuestIds.includes(quest.id)}
					{@const complete = progress >= target}
					<div class="flex flex-col gap-2 rounded-lg bg-accent-800/50 p-3">
						<div class="flex items-center justify-between gap-3">
							<span class="text-white">{quest.description(target)}</span>
							<span class="flex items-center gap-1 text-sm text-white/60">
								+{@render quarkAmount(quest.reward)}
							</span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-black/30">
							<div
								class="h-full bg-linear-to-r from-[#4a9eff] via-[#3ddc84] to-[#ff4d4d] transition-all"
								style:width="{Math.min(100, (progress / target) * 100)}%"
							></div>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-xs text-white/50">{formatNumber(Math.min(progress, target))} / {formatNumber(target)}</span>
							{#if claimed}
								<span class="flex cursor-default items-center gap-1 rounded-lg bg-white/10 px-3 py-1 text-sm text-white/50">
									<Check size={14} /> Claimed
								</span>
							{:else}
								<button
									class="cursor-pointer rounded-lg bg-accent-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-30"
									disabled={!complete || !supabaseAuth.isAuthenticated}
									onclick={() => quarksManager.claimQuest(quest.id)}
								>
									{supabaseAuth.isAuthenticated ? 'Claim' : 'Sign in to claim'}
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</section>
		{:else if activeTab === 'shop'}
			<section class="flex flex-col gap-3">
				<h3 class="flex items-center gap-1 text-lg font-bold text-white/80">
					Boosts & Convenience
					<HelpIcon>
						{#snippet content()}
							Permanent boosts and convenience unlocks refund at 100%, so your balance is really a limit on how many you can
							equip at once.
						{/snippet}
					</HelpIcon>
				</h3>
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{#each boostItems as item (item.id)}
						{@const owned = quarksManager.entitlements.includes(item.id)}
						<div class="flex flex-col gap-2 rounded-lg bg-accent-800/50 p-3">
							<div class="flex items-center justify-between">
								<span class="font-medium text-white">{item.name}</span>
								<span class="flex items-center gap-1 text-sm text-white/60">{@render quarkAmount(item.cost)}</span>
							</div>
							<p class="text-sm text-white/60">{item.description}</p>
							{#if owned}
								<button
									class="cursor-pointer flex items-center justify-center gap-1 rounded-lg bg-white/10 px-3 py-1 text-sm text-white/70 transition-colors hover:bg-white/20"
									onclick={() => quarksManager.refund(item.id)}
								>
									<RotateCcw size={14} /> Refund
								</button>
							{:else}
								<button
									class="cursor-pointer rounded-lg bg-accent-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-30"
									disabled={quarksManager.balance < item.cost || !supabaseAuth.isAuthenticated}
									onclick={() => quarksManager.purchase(item.id)}
								>
									Buy
								</button>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{:else if activeTab === 'skins'}
			<section class="flex flex-col gap-3">
				<h3 class="flex items-center gap-1 text-lg font-bold text-white/80">
					Skins
					<HelpIcon>
						{#snippet content()}
							Cosmetic only, no gameplay effect. Skins are permanent once bought and show on the leaderboard.
						{/snippet}
					</HelpIcon>
				</h3>
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{#each skinItems as item (item.id)}
						{@const owned = quarksManager.entitlements.includes(item.id)}
						{@const equipped = quarksManager.equippedSkin === item.id}
						<div class="flex flex-col gap-2 rounded-lg bg-accent-800/50 p-3">
							<div
								class="h-12 rounded-lg"
								style="background: linear-gradient(135deg, {item.skin?.palette?.[0]}, {item.skin?.palette?.[1] ?? item.skin?.palette?.[0]})"
							></div>
							<span class="font-medium text-white">{item.name}</span>
							<p class="text-sm text-white/60">{item.description}</p>
							<div class="flex items-center justify-between">
								<span class="flex items-center gap-1 text-sm text-white/60">{@render quarkAmount(item.cost)}</span>
								{#if owned}
									<button
										class="cursor-pointer rounded-lg px-3 py-1 text-sm font-medium transition-colors {equipped ? 'bg-white/10 text-white/50' : 'bg-accent-600 text-white hover:bg-accent-500'}"
										onclick={() => quarksManager.equipSkin(equipped ? null : item.id)}
									>
										{equipped ? 'Equipped' : 'Equip'}
									</button>
								{:else}
									<button
										class="cursor-pointer flex items-center gap-1 rounded-lg bg-accent-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-30"
										disabled={quarksManager.balance < item.cost || !supabaseAuth.isAuthenticated}
										onclick={() => quarksManager.purchase(item.id)}
									>
										{supabaseAuth.isAuthenticated ? 'Buy' : ''}
										{#if !supabaseAuth.isAuthenticated}<Lock size={14} />{/if}
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
				<p class="text-xs text-white/40">Skins are permanent and cannot be refunded.</p>
			</section>
		{/if}
	</div>
</Modal>
