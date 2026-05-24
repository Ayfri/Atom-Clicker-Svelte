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
		buildCustomSeries?: (snapshots: SimulationSnapshot[], intervalMin: number) => ChartSeries[];
		description?: string;
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
			description: 'Each line is one multiplier category. Total × = product of all. Click legend items to isolate a line.',
			series: [
				{ color: '#facc15', fillOpacity: 0.1, getValue: s => s.globalMultiplier, label: 'Total ×' },
				{ color: '#f9a8d4', fillOpacity: 0.05, getValue: s => s.globalSkillsMultiplier, label: 'Skills ×' },
				{ color: '#fcd34d', fillOpacity: 0.05, getValue: s => s.globalFlatMultiplier, label: 'Flat Upgrades ×' },
				{ color: '#f87171', fillOpacity: 0.05, getValue: s => s.globalProtonBoostMultiplier, label: 'Proton Boosts ×' },
				{ color: '#fb923c', fillOpacity: 0.05, getValue: s => s.globalProtoniseMultiplier, label: 'Protonise Upgrades ×' },
				{ color: '#a78bfa', fillOpacity: 0.05, getValue: s => s.globalAchievementMultiplier, label: 'Achievement Upgrades ×' },
				{ color: '#86efac', fillOpacity: 0.1, getValue: s => s.globalLevelMultiplier, label: 'Level Upgrades ×' },
				{ color: '#fb923c', fillOpacity: 0.08, getValue: s => s.radiationMultiplier, label: 'Radiation ×' },
				{ color: '#34d399', fillOpacity: 0.08, getValue: s => s.stabilityMultiplier, label: 'Stability ×' },
				{ color: '#c084fc', fillOpacity: 0.08, getValue: s => s.bonusMultiplier, label: 'Power-Up ×' },
				{ color: '#38bdf8', fillOpacity: 0.08, getValue: s => s.atomsCurrencyBoost, label: 'Atoms Boost ×' },
			],
			title: 'Multipliers Stack (Log Scale)',
			useLog: true,
		},
		{
			buildCustomSeries: (snapshots) => {
				const TIER_COLORS = ['#fde68a', '#fbbf24', '#f59e0b', '#d97706', '#b45309'];
				return TIER_COLORS.map((color, tier) => ({
					color,
					data: snapshots.map(s => s.groupContributions.globalBoostTiers[tier]),
					fillOpacity: 0,
					label: `Tier ${tier * 10 + 1}–${tier * 10 + 10} ×`,
				}));
			},
			description: 'global_boost_1..50 grouped into tiers of 10. Each line = product of owned upgrades in that range. Jumps = upgrade purchased.',
			series: [],
			title: 'Global Boost Upgrades — Tier Products (Log Scale)',
			useLog: true,
		},
		{
			buildCustomSeries: (snapshots) => {
				const COLORS = ['#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#a3e635', '#65a30d'];
				return Array.from({ length: 10 }, (_, i) => ({
					color: COLORS[i],
					data: snapshots.map(s => s.groupContributions.levelBoost[i]),
					fillOpacity: 0,
					label: `level_boost_${i + 1} ×`,
				}));
			},
			description: 'Isolated contribution of each level_boost_N upgrade. Value = 1 until purchased, then grows with player level. Steep slope = player is leveling fast.',
			series: [],
			title: 'Level Boost Upgrades — Per Upgrade (Log Scale)',
			useLog: true,
		},
		{
			buildCustomSeries: (snapshots) => {
				const COLORS = ['#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#8b5cf6', '#7c3aed'];
				return Array.from({ length: 11 }, (_, i) => ({
					color: COLORS[i],
					data: snapshots.map(s => s.groupContributions.achievementMul[i]),
					fillOpacity: 0,
					label: `achievement_mul_${i + 1} ×`,
				}));
			},
			description: 'Isolated contribution of each global_achievements_mul_N upgrade. Value scales with achievement count — buying the upgrade AND earning achievements both push the line up.',
			series: [],
			title: 'Achievement Multiplier Upgrades — Per Upgrade (Log Scale)',
			useLog: true,
		},
		{
			buildCustomSeries: (snapshots) => {
				const PROTON_COLORS = ['#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#fda4af', '#fb7185'];
				const PROTONISE_COLORS = ['#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c'];
				return [
					...Array.from({ length: 10 }, (_, i) => ({
						color: PROTON_COLORS[i],
						data: snapshots.map(s => s.groupContributions.protonBoost[i]),
						fillOpacity: 0,
						label: `proton_boost_${i + 1} ×`,
					})),
					...Array.from({ length: 5 }, (_, i) => ({
						color: PROTONISE_COLORS[i],
						data: snapshots.map(s => s.groupContributions.protoniseBoost[i]),
						fillOpacity: 0,
						label: `protonise_boost_${i + 1} ×`,
					})),
				];
			},
			description: 'proton_boost_N = fixed multiplier unlocked on purchase (costs protons). protonise_boost_N = scales with total protonises run.',
			series: [],
			title: 'Proton & Protonise Boost Upgrades — Per Upgrade (Log Scale)',
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

	function buildChartSeries(def: ChartDef, snapshots: SimulationSnapshot[], intervalMin: number): ChartSeries[] {
		if (snapshots.length === 0) return [];
		if (def.buildCustomSeries) return def.buildCustomSeries(snapshots, intervalMin);
		return buildSeries(def.series, snapshots, intervalMin);
	}

	const allChartData = $derived.by(() =>
		CHART_DEFS.map(def => ({
			comparison: hasComparison ? buildChartSeries(def, comparisonSnapshots, cmpIntervalMin) : [],
			def,
			primary: buildChartSeries(def, currentSnapshots, primaryIntervalMin),
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
				description={def.description}
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
