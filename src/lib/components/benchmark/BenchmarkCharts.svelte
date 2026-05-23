<script lang="ts">
	import APSBreakdownChart from '$lib/components/benchmark/APSBreakdownChart.svelte';
	import BaseChart, { type ChartSeries } from '$lib/components/benchmark/BaseChart.svelte';
	import ComparisonChart from '$lib/components/benchmark/ComparisonChart.svelte';
	import type { SimulationSnapshot } from '$lib/simulation/types';

	interface Props {
		currentSnapshots: SimulationSnapshot[];
		comparisonSnapshots: SimulationSnapshot[];
		hasComparison: boolean;
		comparisonName?: string;
		simulationDurationHours: number;
		snapshotInterval: number;
	}

	let { currentSnapshots, comparisonSnapshots, hasComparison, comparisonName, simulationDurationHours, snapshotInterval }: Props =
		$props();

	// --- Primary Series ---

	const allCurrenciesChartSeries = $derived.by<ChartSeries[]>(() => {
		if (currentSnapshots.length === 0) return [];
		return [
			{ color: '#4ade80', data: currentSnapshots.map(s => s.atoms), fillOpacity: 0.1, label: 'Atoms' },
			{ color: '#fbbf24', data: currentSnapshots.map(s => s.protons), fillOpacity: 0.1, label: 'Protons' },
			{ color: '#60a5fa', data: currentSnapshots.map(s => s.electrons), fillOpacity: 0.1, label: 'Electrons' },
			{ color: '#c084fc', data: currentSnapshots.map(s => s.photons), fillOpacity: 0.1, label: 'Photons' },
		];
	});

	const apsChartSeries = $derived.by<ChartSeries[]>(() => {
		if (currentSnapshots.length === 0) return [];
		return [
			{ color: '#f472b6', data: currentSnapshots.map(s => s.atomsPerSecond), fillOpacity: 0.3, label: 'APS' },
			{ color: '#38bdf8', data: currentSnapshots.map(s => s.atomsPerClick), fillOpacity: 0.1, label: 'APC' },
		];
	});

	const progressionChartSeries = $derived.by<ChartSeries[]>(() => {
		if (currentSnapshots.length === 0) return [];
		return [
			{ color: '#fbbf24', data: currentSnapshots.map(s => s.achievements), fillOpacity: 0, label: 'Achievements' },
			{ color: '#a78bfa', data: currentSnapshots.map(s => s.upgrades), fillOpacity: 0, label: 'Upgrades' },
			{ color: '#34d399', data: currentSnapshots.map(s => s.skillPointsUsed), fillOpacity: 0, label: 'Currency Boosts' },
			{ color: '#818cf8', data: currentSnapshots.map(s => s.skills), fillOpacity: 0, label: 'Skills' },
		];
	});

	const actionDensityChartSeries = $derived.by<ChartSeries[]>(() => {
		if (currentSnapshots.length === 0) return [];
		const intervalMinutes = snapshotInterval / 60;
		const data = currentSnapshots.map(s => s.actions.length / intervalMinutes);
		return [
			{
				color: '#f87171',
				data,
				fillOpacity: 0.4,
				label: 'Actions / min',
			},
		];
	});

	const levelChartSeries = $derived.by<ChartSeries[]>(() => {
		if (currentSnapshots.length === 0) return [];
		return [
			{ color: '#f59e0b', data: currentSnapshots.map(s => s.playerLevel), fillOpacity: 0.2, label: 'Player Level' },
			{ color: '#10b981', data: currentSnapshots.map(s => s.buildingLevels), fillOpacity: 0.1, label: 'Currency Boost Points' },
			{ color: '#f472b6', data: currentSnapshots.map(s => s.photonUpgradeLevels), fillOpacity: 0.1, label: 'Photon Upgrades' },
		];
	});

	const prestigeChartSeries = $derived.by<ChartSeries[]>(() => {
		if (currentSnapshots.length === 0) return [];
		return [
			{ color: '#f59e0b', data: currentSnapshots.map(s => s.protonises), fillOpacity: 0.2, label: 'Protonizes' },
			{ color: '#06b6d4', data: currentSnapshots.map(s => s.electronizes), fillOpacity: 0.2, label: 'Electronizes' },
		];
	});

	// --- Comparison Series ---

	const currenciesComparisonSeries = $derived.by<ChartSeries[]>(() => {
		if (!hasComparison) return [];
		return [
			{ color: '#4ade80', data: comparisonSnapshots.map(s => s.atoms), label: 'Atoms (comparison)' },
			{ color: '#fbbf24', data: comparisonSnapshots.map(s => s.protons), label: 'Protons (comparison)' },
			{ color: '#60a5fa', data: comparisonSnapshots.map(s => s.electrons), label: 'Electrons (comparison)' },
			{ color: '#c084fc', data: comparisonSnapshots.map(s => s.photons), label: 'Photons (comparison)' },
		];
	});

	const prestigeComparisonSeries = $derived.by<ChartSeries[]>(() => {
		if (!hasComparison) return [];
		return [
			{ color: '#f59e0b', data: comparisonSnapshots.map(s => s.protonises), label: 'Protonises (comparison)' },
			{ color: '#06b6d4', data: comparisonSnapshots.map(s => s.electronizes), label: 'Electronizes (comparison)' },
		];
	});

	const apsComparisonSeries = $derived.by<ChartSeries[]>(() => {
		if (!hasComparison) return [];
		return [
			{ color: '#f472b6', data: comparisonSnapshots.map(s => s.atomsPerSecond), label: 'APS (comparison)' },
			{ color: '#38bdf8', data: comparisonSnapshots.map(s => s.atomsPerClick ?? 0), label: 'APC (comparison)' },
		];
	});
</script>

<section class="flex flex-col gap-6">
	<!-- All Currencies Chart -->
	<div class="backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center min-h-[360px] p-6 rounded-2xl">
		{#if hasComparison}
			<ComparisonChart
				comparisonSeries={currenciesComparisonSeries}
				comparisonTitle={comparisonName?.slice(0, 20) ?? 'Comparison'}
				primarySeries={allCurrenciesChartSeries}
				primaryTitle="Current"
				title="All Currencies (Log Scale)"
				totalHours={simulationDurationHours}
				useLog={true}
			/>
		{:else}
			<BaseChart
				series={allCurrenciesChartSeries}
				title="All Currencies (Log Scale)"
				totalHours={simulationDurationHours}
				useLog={true}
			/>
		{/if}
	</div>

	<!-- APS Chart -->
	<div class="backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center min-h-[360px] p-6 rounded-2xl">
		{#if hasComparison}
			<ComparisonChart
				comparisonSeries={apsComparisonSeries}
				comparisonTitle={comparisonName?.slice(0, 20) ?? 'Comparison'}
				primarySeries={apsChartSeries}
				primaryTitle="Current"
				title="Atoms Per Second &amp; Per Click (Log Scale)"
				totalHours={simulationDurationHours}
				useLog={true}
			/>
		{:else}
			<BaseChart
				series={apsChartSeries}
				title="Atoms Per Second &amp; Per Click (Log Scale)"
				totalHours={simulationDurationHours}
				useLog={true}
			/>
		{/if}
	</div>

	<!-- Progression Chart -->
	<div class="backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center min-h-[340px] p-6 rounded-2xl">
		<BaseChart
			series={progressionChartSeries}
			title="Progression (Achievements, Upgrades, Boosts, Skills)"
			totalHours={simulationDurationHours}
		/>
	</div>

	<!-- Levels Chart -->
	<div class="backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center min-h-[340px] p-6 rounded-2xl">
		<BaseChart
			series={levelChartSeries}
			title="Levels"
			totalHours={simulationDurationHours}
		/>
	</div>

	<!-- Action Density Chart -->
	<div class="backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center min-h-[340px] p-6 rounded-2xl">
		<BaseChart
			series={actionDensityChartSeries}
			title="Game Pace (Actions per Minute)"
			totalHours={simulationDurationHours}
			yAxisSuffix="/m"
		/>
	</div>

	<!-- Protonises & Electronizes Chart -->
	<div class="backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center min-h-[340px] p-6 rounded-2xl">
		{#if hasComparison}
			<ComparisonChart
				comparisonSeries={prestigeComparisonSeries}
				comparisonTitle={comparisonName?.slice(0, 20) ?? 'Comparison'}
				primarySeries={prestigeChartSeries}
				primaryTitle="Current"
				title="Protonises & Electronizes"
				totalHours={simulationDurationHours}
			/>
		{:else}
			<BaseChart
				series={prestigeChartSeries}
				title="Protonises & Electronizes"
				totalHours={simulationDurationHours}
			/>
		{/if}
	</div>

	<!-- APS Breakdown Chart -->
	<APSBreakdownChart
		snapshots={currentSnapshots}
		totalHours={simulationDurationHours}
	/>
</section>
