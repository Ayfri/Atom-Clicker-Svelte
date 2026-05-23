<script lang="ts">
	import BaseChart, { type ChartSeries } from '$lib/components/benchmark/BaseChart.svelte';
	import type { BuildingType } from '$data/buildings';
	import type { SimulationSnapshot } from '$lib/simulation/types';

	interface Props {
		snapshots: SimulationSnapshot[];
		totalHours: number;
	}

	let { snapshots, totalHours }: Props = $props();

	const BUILDING_COLORS: Record<string, string> = {
		blackHole: '#e879f9',
		crystal: '#60a5fa',
		microorganism: '#a78bfa',
		molecule: '#4ade80',
		nanostructure: '#f472b6',
		neutronStar: '#38bdf8',
		planet: '#34d399',
		rock: '#fb923c',
		star: '#fbbf24',
	};

	const BUILDING_LABELS: Record<string, string> = {
		blackHole: 'Black Hole',
		crystal: 'Crystal',
		microorganism: 'Microorganism',
		molecule: 'Molecule',
		nanostructure: 'Nanostructure',
		neutronStar: 'Neutron Star',
		planet: 'Planet',
		rock: 'Rock',
		star: 'Star',
	};

	// Chart 1 - final APS per building (all mults applied)
	const buildingApsSeries = $derived.by<ChartSeries[]>(() => {
		if (snapshots.length === 0) return [];
		return (Object.keys(BUILDING_COLORS) as BuildingType[])
			.map(key => ({
				color: BUILDING_COLORS[key],
				data: snapshots.map(s => s.buildingProductions[key] ?? 0),
				fillOpacity: 0.05,
				label: BUILDING_LABELS[key] ?? key,
			}))
			.filter(s => s.data.some(v => v > 0));
	});

	// Chart 2 - upgrade factor per building (how much upgrades multiply above base rate)
	const buildingUpgradeFactorSeries = $derived.by<ChartSeries[]>(() => {
		if (snapshots.length === 0) return [];
		return (Object.keys(BUILDING_COLORS) as BuildingType[])
			.map(key => ({
				color: BUILDING_COLORS[key],
				data: snapshots.map(s => s.buildingUpgradeFactors[key] ?? 0),
				fillOpacity: 0,
				label: BUILDING_LABELS[key] ?? key,
			}))
			.filter(s => s.data.some(v => v > 1));
	});

	// Chart 3 - level multiplier per building
	const buildingLevelFactorSeries = $derived.by<ChartSeries[]>(() => {
		if (snapshots.length === 0) return [];
		return (Object.keys(BUILDING_COLORS) as BuildingType[])
			.map(key => ({
				color: BUILDING_COLORS[key],
				data: snapshots.map(s => s.buildingLevelFactors[key] ?? 0),
				fillOpacity: 0,
				label: BUILDING_LABELS[key] ?? key,
			}))
			.filter(s => s.data.some(v => v > 1));
	});

	// Chart 4 - global multiplier stack (all ×factors isolated)
	const multiplierStackSeries = $derived.by<ChartSeries[]>(() => {
		if (snapshots.length === 0) return [];

		const series: ChartSeries[] = [
			{
				color: '#facc15',
				data: snapshots.map(s => s.globalMultiplier),
				fillOpacity: 0.1,
				label: 'Total ×',
			},
			{
				color: '#f9a8d4',
				data: snapshots.map(s => s.globalSkillsMultiplier),
				fillOpacity: 0.05,
				label: 'Skills ×',
			},
			{
				color: '#fcd34d',
				data: snapshots.map(s => s.globalFlatMultiplier),
				fillOpacity: 0.05,
				label: 'Flat Upgrades ×',
			},
			{
				color: '#f87171',
				data: snapshots.map(s => s.globalProtonBoostMultiplier),
				fillOpacity: 0.05,
				label: 'Proton Boosts ×',
			},
			{
				color: '#fb923c',
				data: snapshots.map(s => s.globalProtoniseMultiplier),
				fillOpacity: 0.05,
				label: 'Protonise Upgrades ×',
			},
			{
				color: '#a78bfa',
				data: snapshots.map(s => s.globalAchievementMultiplier),
				fillOpacity: 0.05,
				label: 'Achievement Upgrades ×',
			},
			{
				color: '#86efac',
				data: snapshots.map(s => s.globalLevelMultiplier),
				fillOpacity: 0.05,
				label: 'Level Upgrades ×',
			},
			{
				color: '#34d399',
				data: snapshots.map(s => s.stabilityMultiplier),
				fillOpacity: 0.08,
				label: 'Stability ×',
			},
			{
				color: '#c084fc',
				data: snapshots.map(s => s.bonusMultiplier),
				fillOpacity: 0.08,
				label: 'Power-Up Bonus ×',
			},
			{
				color: '#38bdf8',
				data: snapshots.map(s => s.atomsCurrencyBoost),
				fillOpacity: 0.08,
				label: 'Atoms Currency Boost ×',
			},
		];

		return series.filter(s => s.data.some(v => v > 1));
	});
</script>

<section class="flex flex-col gap-4">
	<h3 class="font-semibold text-gray-200 text-base px-1">APS Breakdown</h3>

	<!-- APS per building (final) -->
	<div class="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl">
		<BaseChart
			series={buildingApsSeries}
			title="APS by Building - final output (Log Scale)"
			{totalHours}
			useLog={true}
			height={360}
		/>
	</div>

	<div class="gap-4 grid grid-cols-1 lg:grid-cols-2">
		<!-- Upgrade factor per building -->
		<div class="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl">
			<BaseChart
				series={buildingUpgradeFactorSeries}
				title="Upgrade Multiplier per Building ×"
				{totalHours}
				useLog={true}
				height={300}
			/>
		</div>

		<!-- Level factor per building -->
		<div class="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl">
			<BaseChart
				series={buildingLevelFactorSeries}
				title="Level Multiplier per Building ×"
				{totalHours}
				useLog={true}
				height={300}
			/>
		</div>
	</div>

	<!-- Multiplier stack -->
	{#if multiplierStackSeries.length > 0}
		<div class="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl">
			<BaseChart
				series={multiplierStackSeries}
				title="Global Multiplier Stack - each factor isolated (Log Scale)"
				{totalHours}
				useLog={true}
				height={300}
			/>
		</div>
	{/if}
</section>
