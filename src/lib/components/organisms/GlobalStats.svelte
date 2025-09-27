<script lang="ts">
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
	import StatItem from '@components/atoms/StatItem.svelte';
	import { POWER_UP_DEFAULT_INTERVAL } from '$data/powerUp';
	import Modal from '@components/atoms/Modal.svelte';

	export let onClose: () => void;

	$: powerUpIntervalReduction = (1 - ($powerUpInterval[0] / POWER_UP_DEFAULT_INTERVAL[0])) * 100;
</script>

<Modal title="Global Statistics" {onClose}>
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
</Modal>
