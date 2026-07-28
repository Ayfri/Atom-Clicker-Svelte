<script lang="ts">
	import { getQuestTarget, pickDailyQuests } from '$data/dailyQuests';
	import { QUARK_SHOP } from '$data/quarkShop';
	import { gameManager } from '$helpers/GameManager.svelte';
	import { quarksManager } from '$helpers/QuarksManager.svelte';
	import { supabaseAuth } from '$stores/supabaseAuth.svelte';
	import { Calendar, Gem, ShoppingBag, Sparkles, Target, Wifi, WifiOff } from '@lucide/svelte';

	const shopItems = Object.values(QUARK_SHOP);

	let inspectorDate = $state(new Date().toISOString().slice(0, 10));
	const inspectorQuests = $derived(pickDailyQuests(inspectorDate));

	function completeQuest(questId: string) {
		const quest = quarksManager.quests.find(q => q.id === questId);
		if (!quest) return;
		const target = quarksManager.getTarget(quest);
		gameManager.dailyStats = { ...gameManager.dailyStats, [quest.metric]: target };
	}

	function resetDailyStats() {
		gameManager.dailyStats = {
			atomsEarned: 0,
			buildingsPurchased: 0,
			clicks: 0,
			dayKey: gameManager.dailyStats.dayKey,
			powerUpsCollected: 0,
			protonises: 0,
			questTargets: gameManager.dailyStats.questTargets,
			upgradesPurchased: 0,
		};
	}

	function simulateDayRollover() {
		const [year, month, day] = quarksManager.dayKey.split('-').map(Number);
		const nextDate = new Date(Date.UTC(year || new Date().getUTCFullYear(), (month || 1) - 1, (day || 1) + 1));
		quarksManager.dayKey = nextDate.toISOString().slice(0, 10);
		quarksManager.quests = pickDailyQuests(quarksManager.dayKey);
		quarksManager.claimedQuestIds = [];
		resetDailyStats();
	}
</script>

<div class="space-y-6">
	<!-- Summary Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
			<div class="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
				{#if supabaseAuth.isAuthenticated}<Wifi size={12} />{:else}<WifiOff size={12} />{/if}
				Status
			</div>
			<div class="text-xl font-bold {supabaseAuth.isAuthenticated ? 'text-green-400' : 'text-red-400'}">
				{supabaseAuth.isAuthenticated ? 'Signed in' : 'Signed out'}
			</div>
			<label class="flex items-center gap-1.5 text-[10px] font-bold text-white/60 cursor-pointer">
				<input type="checkbox" checked={quarksManager.devOverride} onchange={e => quarksManager.setDevOverride(e.currentTarget.checked)} />
				Local override mode
			</label>
			{#if quarksManager.lastSyncError}
				<div class="text-[10px] text-red-400">{quarksManager.lastSyncError}</div>
			{/if}
			<button class="text-[10px] font-bold text-accent-400 hover:underline cursor-pointer" onclick={() => quarksManager.sync()}>
				Sync now
			</button>
		</div>

		<div class="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
			<div class="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
				<Gem size={12} />
				Balance
			</div>
			<div class="text-xl font-bold text-white font-mono">{quarksManager.balance}</div>
			{#if quarksManager.devOverride}
				<div class="flex gap-1">
					<button class="text-[10px] bg-white/5 px-2 py-0.5 rounded hover:bg-white/10" onclick={() => (quarksManager.balance += 1)}>+1</button>
					<button class="text-[10px] bg-white/5 px-2 py-0.5 rounded hover:bg-white/10" onclick={() => (quarksManager.balance += 5)}>+5</button>
					<button class="text-[10px] bg-white/5 px-2 py-0.5 rounded hover:bg-white/10" onclick={() => (quarksManager.balance += 25)}>+25</button>
					<button class="text-[10px] bg-white/5 px-2 py-0.5 rounded hover:bg-white/10" onclick={() => (quarksManager.balance = 0)}>Reset</button>
				</div>
			{/if}
		</div>

		<div class="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
			<div class="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
				<Calendar size={12} />
				Day Key
			</div>
			<div class="text-xl font-bold text-blue-400 font-mono">{quarksManager.dayKey || '-'}</div>
			<button class="text-[10px] font-bold text-accent-400 hover:underline cursor-pointer" onclick={simulateDayRollover}>
				Simulate day rollover
			</button>
		</div>

		<div class="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
			<div class="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
				<Sparkles size={12} />
				Entitlements
			</div>
			<div class="text-xl font-bold text-white font-mono">{quarksManager.entitlements.length}</div>
			<button class="text-[10px] font-bold text-accent-400 hover:underline cursor-pointer" onclick={resetDailyStats}>
				Reset daily stats
			</button>
		</div>
	</div>

	<!-- Quests -->
	<section class="space-y-2">
		<h3 class="text-sm font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
			<Target size={14} /> Today's Quests
		</h3>
		<div class="space-y-1">
			{#each quarksManager.quests as quest (quest.id)}
				{@const target = quarksManager.getTarget(quest)}
				{@const progress = gameManager.dailyStats[quest.metric] ?? 0}
				<div class="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-2 text-xs">
					<span class="text-white/70">{quest.description(target)}</span>
					<span class="font-mono text-white/40">{progress} / {target}</span>
					<button
						class="text-[10px] bg-white/5 px-2 py-0.5 rounded hover:bg-white/10 shrink-0"
						onclick={() => completeQuest(quest.id)}
					>
						Complete
					</button>
				</div>
			{/each}
		</div>
	</section>

	<!-- Shop -->
	<section class="space-y-2">
		<h3 class="text-sm font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
			<ShoppingBag size={14} /> Shop
		</h3>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-1">
			{#each shopItems as item (item.id)}
				{@const owned = quarksManager.entitlements.includes(item.id)}
				<div class="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-2 text-xs">
					<span class="text-white/70">{item.name} <span class="text-white/30">({item.cost})</span></span>
					<div class="flex gap-1 shrink-0">
						{#if item.type === 'skin'}
							<button
								class="text-[10px] bg-white/5 px-2 py-0.5 rounded hover:bg-white/10"
								onclick={() => quarksManager.equipSkin(quarksManager.equippedSkin === item.id ? null : item.id)}
							>
								{quarksManager.equippedSkin === item.id ? 'Unequip' : 'Equip'}
							</button>
						{/if}
						{#if owned}
							<button
								class="text-[10px] bg-white/5 px-2 py-0.5 rounded hover:bg-white/10"
								onclick={() => (quarksManager.entitlements = quarksManager.entitlements.filter(id => id !== item.id))}
							>
								Revoke
							</button>
						{:else}
							<button
								class="text-[10px] bg-white/5 px-2 py-0.5 rounded hover:bg-white/10"
								onclick={() => (quarksManager.entitlements = [...quarksManager.entitlements, item.id])}
							>
								Grant
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Quest pool inspector -->
	<section class="space-y-2">
		<h3 class="text-sm font-black uppercase tracking-widest text-white/40">Quest Pool Inspector</h3>
		<input type="date" bind:value={inspectorDate} class="bg-white/5 rounded-lg px-3 py-1 text-xs text-white" />
		<div class="space-y-1">
			{#each inspectorQuests as quest (quest.id)}
				{@const anchors = { atomsEarned: gameManager.highestAPS, buildingsPurchased: 0, clicks: 0, powerUpsCollected: 0, protonises: 0, upgradesPurchased: 0 }}
				<div class="bg-white/5 rounded-lg px-3 py-2 text-xs text-white/70">
					{quest.id} - target {getQuestTarget(quest, anchors)}
				</div>
			{/each}
		</div>
	</section>
</div>
