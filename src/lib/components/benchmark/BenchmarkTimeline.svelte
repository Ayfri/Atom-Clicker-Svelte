<script lang="ts">
	import { RotateCcw, Target } from '@lucide/svelte';
	import { formatDuration, formatNumber } from '$lib/utils';
	import type { MilestoneHit } from '$lib/simulation/types';
	import type { SimulationProgress } from '$lib/simulation/engine';

	let { isRunning, elapsedTime, progress, milestones, targetHours } = $props<{
		isRunning: boolean;
		elapsedTime: number;
		progress: SimulationProgress | null;
		milestones: MilestoneHit[];
		targetHours: number;
	}>();

	function getMilestonePosition(milestone: MilestoneHit): number {
		const totalMs = targetHours * 3600 * 1000;
		return (milestone.timeReached / totalMs) * 100;
	}

	// Group milestones close in time (5% of run), then assign offset so labels stack and don’t overlap.
	const milestonesWithOffsets = $derived.by(() => {
		const sorted = [...milestones].sort((a, b) => a.timeReached - b.timeReached);
		const groups: MilestoneHit[][] = [];
		const totalMs = targetHours * 3600 * 1000;
		const proximityThreshold = totalMs * 0.05;

		sorted.forEach(m => {
			const lastGroup = groups[groups.length - 1];
			if (lastGroup && Math.abs(m.timeReached - lastGroup[lastGroup.length - 1].timeReached) < proximityThreshold) {
				lastGroup.push(m);
			} else {
				groups.push([m]);
			}
		});

		return groups.flatMap(group =>
			group.map((m, i) => ({
				...m,
				offset: i % 15,
			})),
		);
	});

	// Alternate labels above/below bar by offset to avoid overlap.
	function getLabelStyle(offset: number): string {
		const isAbove = offset % 3 === 0;
		const rowSpacing = 14;
		const baseMargin = 10;

		if (isAbove) {
			const row = Math.floor(offset / 3);
			const distance = baseMargin + row * rowSpacing;
			return `bottom: calc(100% + ${distance}px)`;
		} else {
			const belowIndex = offset - Math.floor(offset / 3) - 1;
			const row = belowIndex;
			const distance = baseMargin + row * rowSpacing;
			return `top: calc(100% + ${distance}px)`;
		}
	}
</script>

<section class="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl">
	<div class="flex gap-3 items-center mb-8 text-gray-400">
		{#if isRunning}
			<RotateCcw
				class="animate-spin text-cyan-400"
				size={20}
			/>
			<div class="flex flex-col">
				<h2 class="font-semibold text-gray-200 text-xl tracking-tight">Simulating...</h2>
				<span class="font-mono text-cyan-400/80 text-xs">{formatDuration(elapsedTime)} elapsed</span>
			</div>
		{:else}
			<Target
				class="text-green-400"
				size={20}
			/>
			<h2 class="font-semibold text-gray-200 text-xl">Progress Timeline</h2>
		{/if}
	</div>

	<div class="mb-40 mt-20 relative">
		<!-- Visual Progress Bar with Milestone markers -->
		<div class="bg-black/30 h-6 overflow-visible relative rounded">
			<div
				class="bg-linear-to-r cyan-400 duration-100 from-green-400 h-full rounded to-cyan-400 transition-all"
				style="width: {isRunning ? (progress?.percent ?? 0) : 100}%"
			></div>

			{#each milestonesWithOffsets as milestone (milestone.milestone.id)}
				{@const pos = getMilestonePosition(milestone)}
				<div
					class="-translate-x-1/2 absolute top-0 z-10"
					style="left: {pos}%"
				>
					<div class="bg-amber-400 h-6 shadow-[0_0_8px] shadow-amber-400/50 w-0.5"></div>
					<div
						class="-translate-x-1/2 absolute font-semibold left-1/2 opacity-90 pointer-events-none text-amber-400 text-[8.5px] whitespace-nowrap"
						style={getLabelStyle(milestone.offset)}
					>
						{milestone.milestone.name}
					</div>
				</div>
			{/each}
		</div>
	</div>

	{#if isRunning && progress}
		<div class="gap-4 grid grid-cols-2 md:grid-cols-5">
			<div class="flex flex-col items-center text-center">
				<span class="text-gray-500 text-xs">Progress</span>
				<span class="font-mono font-semibold text-cyan-400 text-lg">{progress.percent.toFixed(1)}%</span>
			</div>
			<div class="flex flex-col items-center text-center">
				<span class="text-gray-500 text-xs">Hour</span>
				<span class="font-mono font-semibold text-cyan-400 text-lg">{progress.currentHour.toFixed(2)} / {progress.totalHours}</span>
			</div>
			<div class="flex flex-col items-center text-center">
				<span class="text-gray-500 text-xs">Speed</span>
				<span class="font-mono font-semibold text-cyan-400 text-lg">{formatNumber(progress.ticksPerSecond, 0)} ticks/s</span>
			</div>
			<div class="flex flex-col items-center text-center">
				<span class="text-gray-500 text-xs">ETA</span>
				<span class="font-mono font-semibold text-cyan-400 text-lg">{formatDuration(progress.estimatedTimeLeft)}</span>
			</div>
			<div class="flex flex-col items-center text-center">
				<span class="text-gray-500 text-xs">Milestones</span>
				<span class="font-mono font-semibold text-cyan-400 text-lg">{progress.milestoneCount}</span>
			</div>
		</div>
	{/if}
</section>
