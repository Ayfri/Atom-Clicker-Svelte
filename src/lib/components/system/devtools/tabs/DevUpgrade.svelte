<script lang="ts">
	import { gameManager } from '$helpers/GameManager.svelte';
	import type { Upgrade } from '$lib/types';
	import Tooltip from '@components/ui/Tooltip.svelte';

	interface Props {
		id: string;
		isOwned: boolean;
		isSpecial?: boolean;
		upgrade: Upgrade;
	}

	let { id, isOwned, isSpecial = false, upgrade }: Props = $props();

	function toggleUpgrade() {
		if (gameManager.upgrades.includes(id)) {
			gameManager.upgrades = gameManager.upgrades.filter(u => u !== id);
		} else {
			gameManager.upgrades = [...gameManager.upgrades, id];
		}
	}
</script>

<Tooltip size="sm">
	{#snippet children()}
		{#if isSpecial}
			<button
				class="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer border
				{isOwned
					? 'bg-green-500/10 text-green-300 border-green-500/40 hover:bg-green-500/20'
					: 'bg-white/5 text-white/50 border-white/10 hover:border-white/20 hover:bg-white/10'}"
				onclick={toggleUpgrade}
			>
				<span>{upgrade.name}</span>
				<div class="size-1.5 rounded-full {isOwned ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 'bg-white/20'}"></div>
			</button>
		{:else}
			{@const index = id.includes('_') ? id.split('_').pop() : ''}
			{@const displayIndex = isNaN(Number(index)) ? '★' : index}
			<button
				class="size-7 rounded-lg flex items-center justify-center text-[10px] font-black transition-all cursor-pointer border-2
				{isOwned
					? 'bg-green-500/20 text-green-400 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
					: 'bg-white/5 text-white/20 border-white/10 hover:border-white/30 hover:bg-white/10'}"
				onclick={toggleUpgrade}
				aria-label={upgrade.name}
			>
				{displayIndex}
			</button>
		{/if}
	{/snippet}
	{#snippet content()}
		<div class="space-y-1">
			<div class="flex items-center justify-between gap-4">
				<span class="font-bold text-accent-300">{upgrade.name}</span>
				<span class="text-[10px] font-mono text-white/40">{id}</span>
			</div>
			<p class="text-xs text-white/70 leading-relaxed">{upgrade.description}</p>
			<div class="pt-1 flex items-center gap-1.5">
				<div class="size-1.5 rounded-full {isOwned ? 'bg-green-500' : 'bg-red-500'}"></div>
				<span class="text-[10px] uppercase tracking-wider font-bold {isOwned ? 'text-green-400' : 'text-red-400'}">
					{isOwned ? 'Owned' : 'Not Owned'}
				</span>
			</div>
		</div>
	{/snippet}
</Tooltip>
