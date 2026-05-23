<script lang="ts">
	import type { BenchmarkConfig } from '$lib/simulation/types';
	import { formatDuration, formatNumber } from '$lib/utils';
	import { deleteReport, listReports, type BenchmarkReportSummary } from '$lib/stores/benchmarkHistory.svelte';
	import { ClipboardList, Clock, FolderOpen, GitCompare, History, Trash2, X } from '@lucide/svelte';

	interface Props {
		comparisonId: string | null;
		loadedId: string | null;
		onApplyConfig: (config: BenchmarkConfig) => void;
		onClose: () => void;
		onCompare: (id: string | null) => void;
		onLoad: (id: string) => void | Promise<void>;
	}

	let { comparisonId, loadedId = null, onApplyConfig, onClose, onCompare, onLoad }: Props = $props();

	let reports = $state<BenchmarkReportSummary[]>([]);
	let loading = $state(true);

	$effect(() => {
		loadReports();
	});

	async function loadReports() {
		loading = true;
		try {
			reports = await listReports();
		} catch (e) {
			console.error('Failed to load reports:', e);
		}
		loading = false;
	}

	async function handleDelete(id: string) {
		if (!confirm('Delete this benchmark report?')) return;
		try {
			await deleteReport(id);
			if (comparisonId === id) {
				onCompare(null);
			}
			await loadReports();
		} catch (e) {
			console.error('Failed to delete report:', e);
		}
	}

	function handleCompare(id: string) {
		if (comparisonId === id) {
			onCompare(null);
		} else {
			onCompare(id);
		}
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('en-US', {
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			month: 'short',
		});
	}
</script>

<div class="backdrop-blur-xl bg-slate-900/95 border border-white/10 flex flex-col h-full overflow-hidden rounded-2xl">
	<!-- Header -->
	<div class="border-b border-white/10 flex items-center justify-between px-5 py-4">
		<div class="flex gap-3 items-center text-gray-400">
			<History size={20} />
			<h2 class="font-semibold text-gray-200 text-lg">Benchmark History</h2>
		</div>
		<button
			onclick={onClose}
			class="cursor-pointer hover:bg-white/10 hover:text-white p-2 rounded-lg text-gray-500 transition-colors"
			aria-label="Close history panel"
		>
			<X size={20} />
		</button>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto px-4 py-5">
		{#if loading}
			<div class="flex items-center justify-center py-12 text-gray-500">
				<div class="animate-spin h-6 mr-3 rounded-full border-2 border-t-transparent border-cyan-400 w-6"></div>
				Loading reports...
			</div>
		{:else if reports.length === 0}
			<div class="flex flex-col gap-2 items-center justify-center py-12 text-center text-gray-500">
				<History
					class="opacity-30"
					size={48}
				/>
				<p>No saved benchmarks yet.</p>
				<p class="text-sm">Run a simulation to save a report.</p>
			</div>
		{:else}
			<div class="flex flex-col gap-4">
				{#each reports as report (report.id)}
					{@const isSelected = comparisonId === report.id}
					{@const isLoaded = loadedId === report.id}
					<div
						class="bg-white/5 border flex flex-col gap-4 p-5 rounded-xl transition-all {isLoaded
							? 'border-amber-500/50 shadow-lg shadow-amber-500/10'
							: isSelected
								? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10'
								: 'border-white/10'}"
					>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1 flex flex-col gap-1.5">
								<h3 class="font-medium text-gray-200 text-sm truncate" title={report.name}>{report.name}</h3>
								<div class="flex flex-wrap gap-2 items-center text-gray-500 text-xs">
									<span class="flex gap-1.5 items-center">
										<Clock size={12} />
										{formatDate(report.createdAt)}
									</span>
									{#if !report.wasCompleted}
										<span class="bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-400 text-[10px]">Cancelled</span>
									{/if}
								</div>
							</div>
							<div class="flex shrink-0 gap-1">
								<button
									onclick={() => onApplyConfig(report.config)}
									class="cursor-pointer hover:bg-green-500/20 hover:text-green-400 p-2 rounded-lg text-gray-500 transition-colors"
									title="Copy and apply this config"
								>
									<ClipboardList size={16} />
								</button>
								<button
									onclick={() => onLoad(report.id)}
									class="cursor-pointer p-2 rounded-lg transition-colors {isLoaded
										? 'bg-amber-500/30 text-amber-400'
										: 'hover:bg-amber-500/20 text-gray-500'}"
									title={isLoaded ? 'Currently displayed' : 'Load and view graphs'}
								>
									<FolderOpen size={16} />
								</button>
								<button
									onclick={() => handleCompare(report.id)}
									class="cursor-pointer p-2 rounded-lg transition-colors {isSelected
										? 'bg-cyan-500/30 text-cyan-400'
										: 'hover:bg-cyan-500/20 text-gray-500'}"
									title={isSelected ? 'Remove from comparison' : 'Compare with current'}
								>
									<GitCompare size={16} />
								</button>
								<button
									onclick={() => handleDelete(report.id)}
									class="cursor-pointer hover:bg-red-500/20 hover:text-red-400 p-2 rounded-lg text-gray-500 transition-colors"
									title="Delete report"
								>
									<Trash2 size={16} />
								</button>
							</div>
						</div>

						<!-- Stats Grid: min-w-0 + truncate to avoid overflow -->
						<div class="gap-2 grid grid-cols-4 text-xs">
							<div class="bg-black/20 flex min-w-0 flex-col items-center justify-center overflow-hidden p-3 rounded-lg">
								<span class="font-mono max-w-full truncate text-center text-green-400" title={formatNumber(report.finalAtoms)}>
									{formatNumber(report.finalAtoms)}
								</span>
								<span class="mt-0.5 text-gray-500 text-[10px]">Atoms</span>
							</div>
							<div class="bg-black/20 flex min-w-0 flex-col items-center justify-center overflow-hidden p-3 rounded-lg">
								<span class="font-mono max-w-full truncate text-center text-pink-400" title={formatNumber(report.finalAPS) + '/s'}>
									{formatNumber(report.finalAPS)}/s
								</span>
								<span class="mt-0.5 text-gray-500 text-[10px]">APS</span>
							</div>
							<div class="bg-black/20 flex min-w-0 flex-col items-center justify-center overflow-hidden p-3 rounded-lg">
								<span class="font-mono text-amber-400">Lv.{report.finalLevel}</span>
								<span class="mt-0.5 text-gray-500 text-[10px]">Level</span>
							</div>
							<div class="bg-black/20 flex min-w-0 flex-col items-center justify-center overflow-hidden p-3 rounded-lg">
								<span class="font-mono text-cyan-400">{report.milestoneCount}</span>
								<span class="mt-0.5 text-gray-500 text-[10px]">Milestones</span>
							</div>
						</div>

						<!-- Config Summary -->
						<div class="flex flex-wrap gap-2 text-[10px]">
							<span class="bg-white/5 px-2.5 py-1 rounded text-gray-400">
								{report.config.targetHours}h target
							</span>
							<span class="bg-white/5 px-2.5 py-1 rounded text-gray-400">
								{formatDuration(report.durationMs)} real time
							</span>
							<span class="bg-white/5 px-2.5 py-1 rounded text-gray-400">
								{report.config.botBehavior.buyStrategy}
							</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if comparisonId}
		<div class="border-t border-white/10 px-5 py-4">
			<div class="bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between p-3 rounded-lg text-sm">
				<div class="flex gap-2 items-center text-cyan-400">
					<GitCompare size={16} />
					<span>Comparison mode active</span>
				</div>
				<button
					onclick={() => onCompare(null)}
					class="cursor-pointer hover:bg-cyan-500/20 px-3 py-1 rounded text-cyan-400 text-xs transition-colors"
				>
					Clear
				</button>
			</div>
		</div>
	{/if}
</div>
