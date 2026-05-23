<script lang="ts">
	/** Comparison chart: two runs overlaid with distinct styling. */
	import { formatNumber, formatSimTimePrecise } from '$lib/utils';

	export interface ChartSeries {
		color: string;
		dashArray?: string;
		data: number[];
		fillOpacity?: number;
		label: string;
	}

	interface Props {
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
		comparisonSeries = [],
		comparisonTitle = 'Comparison',
		height = 360,
		primarySeries,
		primaryTitle = 'Current',
		title,
		totalHours,
		useLog = false,
		yAxisSuffix = '',
	}: Props = $props();

	let containerWidth = $state(800);
	let hoveredIndex = $state<number | null>(null);

	const padding = { bottom: 35, left: 70, right: 20, top: 25 };

	function resize(node: HTMLElement) {
		const observer = new ResizeObserver(entries => {
			for (const entry of entries) {
				if (entry.contentRect.width > 0) {
					containerWidth = entry.contentRect.width;
				}
			}
		});
		observer.observe(node);
		return {
			destroy() {
				observer.disconnect();
			},
		};
	}

	const chartWidth = $derived(Math.max(0, containerWidth - padding.left - padding.right));
	const chartHeight = $derived(Math.max(0, height - padding.top - padding.bottom));

	const allSeries = $derived([...primarySeries, ...comparisonSeries]);
	const hasComparison = $derived(comparisonSeries.length > 0);

	const primaryDataLen = $derived(primarySeries[0]?.data.length ?? 0);
	const comparisonDataLen = $derived(comparisonSeries[0]?.data.length ?? 0);
	const maxDataLen = $derived(Math.max(primaryDataLen, comparisonDataLen));

	function transformValue(val: number): number {
		if (!useLog) return val;
		return Math.log10(Math.max(val, 1));
	}

	const maxVal = $derived.by(() => {
		let max = 0;
		for (const s of allSeries) {
			if (!s.data || s.data.length === 0) continue;
			for (const val of s.data) {
				const v = transformValue(val);
				if (v > max) max = v;
			}
		}
		return max * 1.1 || 1;
	});

	function getLinePath(data: number[], dataLen: number): string {
		if (data.length === 0) return '';
		const denom = dataLen > 1 ? dataLen - 1 : 1;

		return data
			.map((val, i) => {
				const x = dataLen > 1 ? (chartWidth * i) / denom : 0;
				const v = Math.max(0, transformValue(val));
				const ratio = v / maxVal;
				const y = chartHeight - chartHeight * ratio;
				return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
			})
			.join(' ');
	}

	function getAreaPath(data: number[], dataLen: number): string {
		const linePath = getLinePath(data, dataLen);
		if (!linePath) return '';
		const lastX = dataLen > 1 ? chartWidth : 0;
		return `${linePath} L ${lastX},${chartHeight} L 0,${chartHeight} Z`;
	}

	function handlePointerMove(e: PointerEvent) {
		const rect = (e.currentTarget as Element).getBoundingClientRect();
		const x = e.clientX - rect.left - padding.left;

		if (x < 0 || x > chartWidth) {
			hoveredIndex = null;
			return;
		}

		const denom = maxDataLen > 1 ? maxDataLen - 1 : 1;
		hoveredIndex = Math.min(Math.max(0, Math.round((x / chartWidth) * denom)), denom);
	}

	function handlePointerLeave() {
		hoveredIndex = null;
	}

	const primaryTooltipData = $derived.by(() => {
		if (hoveredIndex === null) return [];
		return primarySeries
			.map(s => ({ color: s.color, label: s.label, val: s.data[hoveredIndex!] ?? 0 }))
			.filter(item => item.val !== undefined);
	});

	const comparisonTooltipData = $derived.by(() => {
		if (hoveredIndex === null || !hasComparison) return [];
		return comparisonSeries
			.map(s => ({
				color: s.color,
				label: s.label.replace(' (comparison)', ''),
				val: s.data[hoveredIndex!] ?? 0,
			}))
			.filter(item => item.val !== undefined);
	});

	const tooltipX = $derived(hoveredIndex !== null ? (chartWidth * hoveredIndex) / (maxDataLen > 1 ? maxDataLen - 1 : 1) : 0);

	const tooltipStyle = $derived.by(() => {
		if (hoveredIndex === null) return '';
		const ttWidth = hasComparison ? 360 : 200;
		let ttLeft = padding.left + tooltipX + 15;
		if (ttLeft + ttWidth > containerWidth) {
			ttLeft = padding.left + tooltipX - ttWidth - 15;
		}
		return `left: ${ttLeft}px; top: ${padding.top + 10}px; width: ${ttWidth}px;`;
	});

	const primaryTimeMs = $derived(
		hoveredIndex !== null && primaryDataLen > 0 ? (totalHours * hoveredIndex * 3600000) / (primaryDataLen > 1 ? primaryDataLen - 1 : 1) : 0,
	);
	const comparisonTimeMs = $derived(
		hoveredIndex !== null && comparisonDataLen > 0 ?
			(totalHours * hoveredIndex * 3600000) / (comparisonDataLen > 1 ? comparisonDataLen - 1 : 1)
		:	0,
	);
</script>

<div class="flex flex-col gap-4 w-full">
	<div class="flex flex-wrap gap-4 items-center justify-between px-2 w-full">
		<h3 class="font-semibold text-gray-300 text-sm">{title}</h3>

		{#if hasComparison}
			<div class="flex gap-6 text-xs">
				<div class="flex gap-2 items-center">
					<span class="bg-white/20 h-0.5 w-6"></span>
					<span class="text-gray-400">{primaryTitle}</span>
				</div>
				<div class="flex gap-2 items-center">
					<span class="bg-white/20 border-dashed border-t-2 h-0 w-6"></span>
					<span class="text-gray-400">{comparisonTitle}</span>
				</div>
			</div>
		{/if}

		<div class="flex flex-wrap gap-x-4 gap-y-2 justify-end">
			{#each primarySeries as s (s.label)}
				<div class="flex gap-2 items-center text-xs">
					<span
						class="block h-2.5 rounded-full shadow-sm w-2.5"
						style="box-shadow: 0 0 8px {s.color}66; background-color: {s.color}"
					></span>
					<span class="font-medium text-gray-400">{s.label}</span>
				</div>
			{/each}
		</div>
	</div>

	<div
		use:resize
		class="bg-black/20 border border-white/5 overflow-hidden relative rounded-xl select-none w-full"
		style="height: {height}px;"
		onpointermove={handlePointerMove}
		onpointerleave={handlePointerLeave}
		role="application"
		aria-label="Interactive comparison chart"
	>
		<svg
			width={containerWidth}
			{height}
			viewBox="0 0 {containerWidth} {height}"
			class="block h-full pointer-events-none w-full"
		>
			<!-- Background -->
			<defs>
				<linearGradient
					id="chartBg"
					x1="0%"
					y1="0%"
					x2="0%"
					y2="100%"
				>
					<stop
						offset="0%"
						stop-color="#0f172a"
					></stop>
					<stop
						offset="100%"
						stop-color="#1e293b"
					></stop>
				</linearGradient>
			</defs>
			<rect
				width="100%"
				height="100%"
				fill="url(#chartBg)"
			></rect>

			<!-- Grid Lines -->
			<g
				font-family="'Inter', system-ui, sans-serif"
				font-size="10"
			>
				{#each Array(6) as _, i (i)}
					{@const y = padding.top + (chartHeight * i) / 5}
					{@const valRatio = 1 - i / 5}
					{@const valRaw = useLog ? Math.pow(10, maxVal * valRatio) : maxVal * valRatio}
					{@const text = formatNumber(valRaw < 0.0001 ? 0 : valRaw)}

					<line
						x1={padding.left}
						y1={y}
						x2={containerWidth - padding.right}
						y2={y}
						stroke={i === 5 ? '#475569' : '#334155'}
						stroke-width="1"
					></line>
					<text
						x={padding.left - 10}
						{y}
						text-anchor="end"
						dominant-baseline="middle"
						fill="#64748b">{text}{yAxisSuffix}</text
					>
				{/each}
			</g>

			<!-- X Axis -->
			<g
				font-family="'Inter', system-ui, sans-serif"
				font-size="10"
			>
				{#each Array(7) as _, i (i)}
					{@const x = padding.left + (chartWidth * i) / 6}
					{@const hour = (totalHours * i) / 6}
					<text
						{x}
						y={height - 12}
						text-anchor="middle"
						dominant-baseline="auto"
						fill="#64748b">{hour.toFixed(1)}h</text
					>
				{/each}
			</g>

			<!-- Chart Content -->
			<g transform="translate({padding.left}, {padding.top})">
				<!-- Primary Series (solid) -->
				{#each primarySeries as s, i (s.label)}
					{#if s.data?.length > 0}
						{#if s.fillOpacity && s.fillOpacity > 0 && s.data.length > 1}
							<path
								d={getAreaPath(s.data, primaryDataLen)}
								fill={s.color}
								fill-opacity={s.fillOpacity * 0.5}
							></path>
						{/if}
						{#if s.data.length > 1}
							<path
								d={getLinePath(s.data, primaryDataLen)}
								fill="none"
								stroke={s.color}
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							></path>
						{/if}
					{/if}
				{/each}

				<!-- Comparison Series (dashed) -->
				{#if hasComparison}
					{#each comparisonSeries as s (s.label)}
						{#if s.data?.length > 1}
							<path
								d={getLinePath(s.data, comparisonDataLen)}
								fill="none"
								stroke={s.color}
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-dasharray="8 4"
								stroke-opacity="0.8"
							></path>
						{/if}
					{/each}
				{/if}

				<!-- Hover Line -->
				{#if hoveredIndex !== null}
					<line
						x1={tooltipX}
						y1="0"
						x2={tooltipX}
						y2={chartHeight}
						stroke="rgba(255, 255, 255, 0.6)"
						stroke-width="1"
						stroke-dasharray="4 4"
					></line>

					<!-- Primary dots -->
					{#each primaryTooltipData as { color, label, val } (label)}
						{@const v = Math.max(0, transformValue(val))}
						{@const y = chartHeight - chartHeight * (v / maxVal)}
						<circle
							cx={tooltipX}
							cy={y}
							r="5"
							fill={color}
							stroke="#0f172a"
							stroke-width="2"
						></circle>
					{/each}

					<!-- Comparison dots -->
					{#each comparisonTooltipData as { color, label, val } (label)}
						{@const v = Math.max(0, transformValue(val))}
						{@const y = chartHeight - chartHeight * (v / maxVal)}
						<circle
							cx={tooltipX}
							cy={y}
							r="4"
							fill="none"
							stroke={color}
							stroke-width="2"
						></circle>
					{/each}
				{/if}
			</g>
		</svg>

		<!-- Tooltip -->
		{#if hoveredIndex !== null && (primaryTooltipData.length > 0 || comparisonTooltipData.length > 0)}
			<div
				class="absolute backdrop-blur-md bg-slate-900/95 border border-slate-600/50 p-4 pointer-events-none rounded-2xl shadow-2xl text-xs z-10"
				style={tooltipStyle}
			>
				{#if hasComparison}
					<div class="gap-6 grid grid-cols-2">
						<!-- Primary Column -->
						<div class="flex flex-col gap-2">
							<div
								class="border-b border-slate-700 font-bold mb-1 pb-1 text-emerald-400 text-[10px] uppercase tracking-wider"
							>
								{primaryTitle} ({formatSimTimePrecise(primaryTimeMs)})
							</div>
							{#each primaryTooltipData as { color, label, val } (label)}
								<div class="flex items-center justify-between gap-3">
									<div class="flex gap-2 items-center">
										<span
											class="h-2 rounded-full shrink-0 w-2"
											style="background-color: {color}"
										></span>
										<span class="text-slate-300">{label}</span>
									</div>
									<span class="font-mono text-white">{formatNumber(val)}{yAxisSuffix}</span>
								</div>
							{/each}
						</div>

						<!-- Comparison Column -->
						<div class="border-l border-slate-700 flex flex-col gap-2 pl-4">
							<div class="border-b border-slate-700 font-bold mb-1 pb-1 text-cyan-400 text-[10px] uppercase tracking-wider">
								{comparisonTitle} ({formatSimTimePrecise(comparisonTimeMs)})
							</div>
							{#each comparisonTooltipData as { color, label, val } (label)}
								<div class="flex items-center justify-between gap-3">
									<div class="flex gap-2 items-center">
										<span
											class="border h-2 rounded-full shrink-0 w-2"
											style="border-color: {color}"
										></span>
										<span class="text-slate-300">{label}</span>
									</div>
									<span class="font-mono text-white">{formatNumber(val)}{yAxisSuffix}</span>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<div class="font-bold mb-2 text-slate-50">Time: {formatSimTimePrecise(primaryTimeMs)}</div>
					<div class="flex flex-col gap-1.5">
						{#each primaryTooltipData as { color, label, val } (label)}
							<div class="flex items-center justify-between gap-4">
								<div class="flex gap-2 items-center">
									<span
										class="h-2 rounded-full shrink-0 w-2"
										style="background-color: {color}"
									></span>
									<span class="text-slate-300">{label}</span>
								</div>
								<span class="font-mono text-white">{formatNumber(val)}{yAxisSuffix}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
