<script lang="ts">
	import { X } from 'lucide-svelte';
	import {
		atomsPerSecond,
		bonusMultiplier,
		clickPower,
		globalMultiplier,
		powerUpDurationMultiplier,
		powerUpEffectMultiplier,
		xpGainMultiplier,
		totalClicks,
		totalXP,
		playerLevel,
	} from '$stores/gameStore';
	import { formatNumber } from '$lib/utils';
	import { onMount } from 'svelte';
	import StatItem from '$lib/components/atoms/StatItem.svelte';

	export let onClose: () => void;
	let dialog: HTMLDialogElement;

	onMount(() => {
		dialog?.showModal();
	});

	function handleClose() {
		dialog?.close();
		onClose();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === dialog) {
			handleClose();
		}
	}
</script>

<svelte:window on:keydown={onKeydown} />

<dialog
	bind:this={dialog}
	class="h-[90vh] w-[90vw] max-w-3xl rounded-2xl bg-gradient-to-br from-accent-900 to-accent-800 p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:w-screen"
	on:click={handleBackdropClick}
>
	<div class="flex h-full flex-col">
		<div class="flex items-center justify-between gap-4 border-b border-white/10 bg-black/40 p-6 sm:px-8">
			<h2 class="flex-1 text-2xl font-bold text-white">Global Statistics</h2>
			<button
				class="flex h-10 w-10 items-center justify-center rounded-l transition-colors hover:*:stroke-[3]"
				on:click={handleClose}
			>
				<X class="transition-all duration-300" />
			</button>
		</div>

		<div class="flex-1 overflow-y-auto p-4 sm:p-8">
			<div class="flex flex-col gap-8 md:flex-row md:gap-12">
				<div class="flex-1 flex flex-col gap-6">
					<h3 class="border-b border-accent/50 pb-2 text-lg font-bold text-accent">Player Stats</h3>
					<div class="flex flex-col gap-2 xl:gap-4">
						<StatItem label="Total Clicks" value={formatNumber($totalClicks)} />
						<StatItem label="Total XP" value={formatNumber($totalXP)} />
						<StatItem label="Player Level" value={$playerLevel} />
						<StatItem label="Atoms per Second" value={formatNumber($atomsPerSecond)} />
						<StatItem label="Click Power" value={formatNumber($clickPower)} />
					</div>
				</div>

				<div class="flex-1 flex flex-col gap-6">
					<h3 class="border-b border-accent/50 pb-2 text-lg font-bold text-accent">Active Multipliers</h3>
					<div class="flex flex-col gap-2 xl:gap-4">
						<StatItem label="Global Multiplier" value={formatNumber($globalMultiplier)} prefix="×" />
						<StatItem label="Bonus Multiplier" value={formatNumber($bonusMultiplier)} prefix="×" />
						<StatItem label="Power-up Duration" value={formatNumber($powerUpDurationMultiplier)} prefix="×" />
						<StatItem label="Power-up Effect" value={formatNumber($powerUpEffectMultiplier)} prefix="×" />
						<StatItem label="XP Gain" value={formatNumber($xpGainMultiplier)} prefix="×" />
					</div>
				</div>
			</div>
		</div>
	</div>
</dialog>

<style lang="postcss">
	dialog::backdrop {
		@apply bg-black/70 backdrop-blur-sm;
	}

	dialog {
		@apply text-white;
	}

	dialog[open] {
		animation: zoom 300ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	@keyframes zoom {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(-40px);
		}

		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}
</style>
