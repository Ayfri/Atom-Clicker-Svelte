<script lang="ts">
	import { X } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import {
		atomsPerSecond,
		autoClicksPerSecond,
		bonusMultiplier,
		clickPower,
		globalMultiplier,
		powerUpDurationMultiplier,
		powerUpEffectMultiplier,
		powerUpInterval,
		xpGainMultiplier,
		totalBonusPhotonsClicked,
		totalClicks,
		totalXP,
		playerLevel,
	} from '$stores/gameStore';
	import { formatNumber } from '$lib/utils';
	import StatItem from '$lib/components/atoms/StatItem.svelte';
	import { POWER_UP_DEFAULT_INTERVAL } from '$data/powerUp';

	export let onClose: () => void;

	$: powerUpIntervalReduction = (1 - ($powerUpInterval[0] / POWER_UP_DEFAULT_INTERVAL[0])) * 100;

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window on:keydown={onKeydown} />

<div class="overlay" on:click={onClose} transition:fade={{ duration: 200 }}>
	<div class="modal bg-gradient-to-br from-accent-900 to-accent-800" on:click|stopPropagation transition:fly={{ y: -100, duration: 300 }}>
		<div class="flex items-center justify-between gap-4 border-b border-white/10 bg-black/40 p-6 sm:px-8">
			<h2 class="flex-1 text-2xl font-bold text-white">Global Statistics (New System)</h2>
			<button class="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:*:stroke-[3]" on:click={onClose}>
				<X class="transition-all duration-300" />
			</button>
		</div>

		<div class="flex-1 overflow-y-auto p-4 sm:p-8">
			<div class="flex flex-col gap-8 md:flex-row md:gap-12">
				<div class="flex-1 flex flex-col gap-6">
					<h3 class="border-b border-accent/50 pb-2 text-lg font-bold text-accent">Player Stats</h3>
					<div class="flex flex-col gap-2 xl:gap-4">
						<StatItem label="Total Clicks" value={formatNumber($totalClicks, 0)} />
						<StatItem label="Bonus Photons Clicked" value={formatNumber($totalBonusPhotonsClicked, 0)} />
						<StatItem label="Total XP" value={formatNumber($totalXP)} />
						<StatItem label="Player Level" value={$playerLevel} />
						<StatItem label="Atoms per Second" value={formatNumber($atomsPerSecond)} />
						<StatItem label="Click Power" value={formatNumber($clickPower)} />
						<StatItem label="Auto Clicks per Second" value={formatNumber($autoClicksPerSecond, 0)} />
					</div>
				</div>

				<div class="flex-1 flex flex-col gap-6">
					<h3 class="border-b border-accent/50 pb-2 text-lg font-bold text-accent">Active Multipliers</h3>
					<div class="flex flex-col gap-2 xl:gap-4">
						<StatItem label="Global Multiplier" value={formatNumber($globalMultiplier)} prefix="×" />
						<StatItem label="Bonus Multiplier" value={formatNumber($bonusMultiplier)} prefix="×" />
						<StatItem label="Power-up Duration" value={formatNumber($powerUpDurationMultiplier)} prefix="×" />
						<StatItem label="Power-up Effect" value={formatNumber($powerUpEffectMultiplier)} prefix="×" />
						<StatItem label="Power-up Interval Reduction" value={formatNumber(100 - powerUpIntervalReduction, 1)} suffix="%" />
						<StatItem label="XP Gain" value={formatNumber($xpGainMultiplier)} prefix="×" />
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
	.overlay {
		@apply fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm;
	}

	.modal {
		@apply flex h-[85vh] w-[85vw] max-w-4xl flex-col overflow-hidden rounded-2xl shadow-2xl;
	}

	@media (width <= 768px) {
		.modal {
			@apply h-[100dvh] w-screen rounded-none;
		}
	}
</style>
