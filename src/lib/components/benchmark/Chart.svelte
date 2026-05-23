<script lang="ts">
	import BaseChart, { type ChartSeries } from '$lib/components/benchmark/BaseChart.svelte';
	import ComparisonChart from '$lib/components/benchmark/ComparisonChart.svelte';

	interface Props {
		comparisonDurationHours?: number;
		comparisonSeries?: ChartSeries[];
		comparisonTitle?: string;
		height?: number;
		primarySeries: ChartSeries[];
		primaryTitle?: string;
		title: string;
		totalHours: number;
		useLog?: boolean;
		yAxisSuffix?: string;
	}

	let {
		comparisonDurationHours = 0,
		comparisonSeries = [],
		comparisonTitle = 'Comparison',
		height = 340,
		primarySeries,
		primaryTitle = 'Current',
		title,
		totalHours,
		useLog = false,
		yAxisSuffix = '',
	}: Props = $props();

	const hasComparison = $derived(comparisonSeries.length > 0 && comparisonDurationHours > 0);
</script>

{#if hasComparison}
	<ComparisonChart
		{comparisonDurationHours}
		{comparisonSeries}
		{comparisonTitle}
		{height}
		{primarySeries}
		{primaryTitle}
		{title}
		{totalHours}
		{useLog}
		{yAxisSuffix}
	/>
{:else}
	<BaseChart
		{height}
		series={primarySeries}
		{title}
		{totalHours}
		{useLog}
		{yAxisSuffix}
	/>
{/if}
