<script lang="ts">
	import APSBreakdownChart from '$lib/components/benchmark/APSBreakdownChart.svelte';
	import Chart from '$lib/components/benchmark/Chart.svelte';
	import type { ChartSeries } from '$lib/components/benchmark/BaseChart.svelte';
	import type { SimulationSnapshot } from '$lib/simulation/types';

	interface SeriesDef {
		color: string;
		fillOpacity?: number;
		getValue: (s: SimulationSnapshot, intervalMin: number) => number;
		label: string;
	}

	interface ChartDef {
		height?: number;
		series: SeriesDef[];
		title: string;
		useLog?: boolean;
		yAxisSuffix?: string;
	}

	const CHART_DEFS: ChartDef[] = [
		{
			height: 360,
			series: [
				{ color: '#4ade80', fillOpacity: 0.1, getValue: s => s.atoms, label: 'Atoms' },
				{ color: '#fbbf24', fillOpacity: 0.1, getValue: s => s.protons, label: 'Protons' },
				{ color: '#60a5fa', fillOpacity: 0.1, getValue: s => s.electrons, label: 'Electrons' },
				{ color: '#c084fc', fillOpacity: 0.1, getValue: s => s.photons, label: 'Photons' },
			],
			title: 'All Currencies (Log Scale)',
			useLog: true,
		},
		{
			height: 360,
			series: [
				{ color: '#f472b6', fillOpacity: 0.3, getValue: s => s.atomsPerSecond, label: 'APS' },
				{ color: '#38bdf8', fillOpacity: 0.1, getValue: s => s.atomsPerClick, label: 'APC' },
			],
			title: 'Atoms Per Second & Per Click (Log Scale)',
			useLog: true,
		},
		{
			series: [
				{ color: '#facc15', fillOpacity: 0.08, getValue: s => s.globalMultiplier, label: 'Global' },
				{ color: '#f87171', fillOpacity: 0.08, getValue: s => s.baseGlobalMultiplier, label: 'Upgrades Only' },
				{ color: '#fb923c', fillOpacity: 0.08, getValue: s => s.radiationMultiplier, label: 'Radiation' },
				{ color: '#34d399', fillOpacity: 0.08, getValue: s => s.stabilityMultiplier, label: 'Stability' },
				{ color: '#c084fc', fillOpacity: 0.08, getValue: s => s.bonusMultiplier, label: 'Power-Up' },
				{ color: '#38bdf8', fillOpacity: 0.08, getValue: s => s.atomsCurrencyBoost, label: 'Atoms Boost' },
			],
			title: 'Multipliers Stack (Log Scale)',
			useLog: true,
		},
		{
			series: [
				{ color: '#4ade80', fillOpacity: 0.05, getValue: s => s.buildings.molecule ?? 0, label: 'Molecule' },
				{ color: '#60a5fa', fillOpacity: 0.05, getValue: s => s.buildings.crystal ?? 0, label: 'Crystal' },
				{ color: '#f472b6', fillOpacity: 0.05, getValue: s => s.buildings.nanostructure ?? 0, label: 'Nanostructure' },
				{ color: '#a78bfa', fillOpacity: 0.05, getValue: s => s.buildings.microorganism ?? 0, label: 'Microorganism' },
				{ color: '#fb923c', fillOpacity: 0.05, getValue: s => s.buildings.rock ?? 0, label: 'Rock' },
				{ color: '#34d399', fillOpacity: 0.05, getValue: s => s.buildings.planet ?? 0, label: 'Planet' },
				{ color: '#fbbf24', fillOpacity: 0.05, getValue: s => s.buildings.star ?? 0, label: 'Star' },
				{ color: '#38bdf8', fillOpacity: 0.05, getValue: s => s.buildings.neutronStar ?? 0, label: 'Neutron Star' },
				{ color: '#e879f9', fillOpacity: 0.05, getValue: s => s.buildings.blackHole ?? 0, label: 'Black Hole' },
			],
			title: 'Building Counts per Type (Log Scale)',
			useLog: true,
		},
		{
			series: [
				{ color: '#fbbf24', fillOpacity: 0, getValue: s => s.achievements, label: 'Achievements' },
				{ color: '#a78bfa', fillOpacity: 0, getValue: s => s.upgrades, label: 'Upgrades Owned' },
				{ color: '#6366f1', fillOpacity: 0, getValue: s => s.totalUpgrades, label: 'Upgrades All-Time' },
				{ color: '#34d399', fillOpacity: 0, getValue: s => s.skillPointsUsed, label: 'Currency Boosts' },
				{ color: '#818cf8', fillOpacity: 0, getValue: s => s.skills, label: 'Skills' },
			],
			title: 'Progression (Achievements, Upgrades, Boosts, Skills)',
		},
		{
			series: [
				{ color: '#f59e0b', fillOpacity: 0.2, getValue: s => s.playerLevel, label: 'Player Level' },
				{ color: '#10b981', fillOpacity: 0.1, getValue: s => s.buildingLevels, label: 'Currency Boost Points' },
				{ color: '#f472b6', fillOpacity: 0.1, getValue: s => s.photonUpgradeLevels, label: 'Photon Upgrades' },
			],
			title: 'Levels',
		},
		{
			series: [
				{ color: '#f59e0b', fillOpacity: 0.15, getValue: s => s.totalXP, label: 'Total XP' },
				{ color: '#60a5fa', fillOpacity: 0.1, getValue: s => s.clicks, label: 'Total Clicks' },
				{ color: '#4ade80', fillOpacity: 0.1, getValue: s => s.totalBuildings, label: 'Total Buildings' },
				{ color: '#c084fc', fillOpacity: 0.1, getValue: s => s.buildingsPurchased, label: 'Buildings All-Time' },
			],
			title: 'Activity (XP, Clicks, Buildings, Log Scale)',
			useLog: true,
		},
		{
			series: [
				{ color: '#f87171', fillOpacity: 0.4, getValue: (s, iMin) => s.actions.length / iMin, label: 'Actions / min' },
			],
			title: 'Game Pace (Actions per Minute)',
			yAxisSuffix: '/m',
		},
		{
			series: [
				{ color: '#f59e0b', fillOpacity: 0.2, getValue: s => s.protonises, label: 'Protonizes' },
				{ color: '#06b6d4', fillOpacity: 0.2, getValue: s => s.electronizes, label: 'Electronizes' },
			],
			title: 'Protonises & Electronizes',
		},
	];

	interface Props {
		comparisonName?: string;
		comparisonSnapshots: SimulationSnapshot[];
		currentSnapshots: SimulationSnapshot[];
		hasComparison: boolean;
		simulationDurationHours: number;
		snapshotInterval: number;
	}

	let { comparisonName, comparisonSnapshots, currentSnapshots, hasComparison, simulationDurationHours, snapshotInterval }: Props =
		$props();

	const comparisonDurationHours = $derived(
		comparisonSnapshots.length > 0 ? comparisonSnapshots[comparisonSnapshots.length - 1].timestamp / 3_600_000 : 0,
	);

	const primaryIntervalMin = $derived(snapshotInterval / 60);
	const cmpIntervalMin = $derived(
		comparisonSnapshots.length > 1 ? (comparisonSnapshots[1].timestamp - comparisonSnapshots[0].timestamp) / 60_000 : primaryIntervalMin,
	);

	function buildSeries(defs: SeriesDef[], snapshots: SimulationSnapshot[], intervalMin: number): ChartSeries[] {
		if (snapshots.length === 0) return [];
		return defs.map(d => ({
			color: d.color,
			data: snapshots.map(s => d.getValue(s, intervalMin)),
			fillOpacity: d.fillOpacity,
			label: d.label,
		}));
	}

	const allChartData = $derived.by(() =>
		CHART_DEFS.map(def => ({
			comparison: hasComparison ? buildSeries(def.series, comparisonSnapshots, cmpIntervalMin) : [],
			def,
			primary: buildSeries(def.series, currentSnapshots, primaryIntervalMin),
		})),
	);
</script>

<section class="flex flex-col gap-6">
	{#each allChartData as { def, primary, comparison } (def.title)}
		<div
			class="backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center p-6 rounded-2xl"
			style="min-height: {def.height ?? 340}px"
		>
			<Chart
				{comparisonDurationHours}
				comparisonSeries={comparison}
				comparisonTitle={comparisonName?.slice(0, 20) ?? 'Comparison'}
				height={def.height ?? 340}
				primarySeries={primary}
				title={def.title}
				totalHours={simulationDurationHours}
				useLog={def.useLog}
				yAxisSuffix={def.yAxisSuffix}
			/>
		</div>
	{/each}

	<APSBreakdownChart
		snapshots={currentSnapshots}
		totalHours={simulationDurationHours}
	/>
</section>
