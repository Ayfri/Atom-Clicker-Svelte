<script lang="ts">
	import type { BenchmarkConfig } from '$lib/simulation/types';
	import { formatNumber } from '$lib/utils';
	import {
		clearAllReports,
		deleteReport,
		listReports,
		renameReport,
		type BenchmarkReportSummary,
	} from '$lib/stores/benchmarkHistory.svelte';
	import { Check, ClipboardList, FolderOpen, GitCompare, History, Pencil, Search, Target, Trash2, X, Zap, Clock } from '@lucide/svelte';

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
	let searchQuery = $state('');
	let sortBy = $state<'date' | 'aps' | 'milestones'>('date');
	let editingId = $state<string | null>(null);
	let editingName = $state('');
	let deletingId = $state<string | null>(null);
	let clearConfirm = $state(false);

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

	const filteredReports = $derived.by(() => {
		let list = reports;
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter(r => r.name.toLowerCase().includes(q));
		}
		if (sortBy === 'aps') return [...list].sort((a, b) => b.finalAPS - a.finalAPS);
		if (sortBy === 'milestones') return [...list].sort((a, b) => b.milestoneCount - a.milestoneCount);
		return list; // 'date' already newest-first from listReports
	});

	async function handleDelete(id: string) {
		if (deletingId !== id) {
			deletingId = id;
			return;
		}
		try {
			await deleteReport(id);
			if (comparisonId === id) onCompare(null);
			deletingId = null;
			await loadReports();
		} catch (e) {
			console.error('Failed to delete report:', e);
		}
	}

	async function handleClearAll() {
		if (!clearConfirm) {
			clearConfirm = true;
			return;
		}
		try {
			await clearAllReports();
			if (comparisonId) onCompare(null);
			clearConfirm = false;
			await loadReports();
		} catch (e) {
			console.error('Failed to clear all reports:', e);
		}
	}

	function handleCompare(id: string) {
		onCompare(comparisonId === id ? null : id);
	}

	function startEdit(report: BenchmarkReportSummary) {
		editingId = report.id;
		editingName = report.name;
		deletingId = null;
	}

	async function commitEdit() {
		if (!editingId || !editingName.trim()) { editingId = null; return; }
		try {
			await renameReport(editingId, editingName.trim());
			await loadReports();
		} catch (e) {
			console.error('Failed to rename:', e);
		}
		editingId = null;
	}

	function onEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') commitEdit();
		else if (e.key === 'Escape') editingId = null;
	}

	function formatRelativeTime(ts: number): string {
		const diff = ts - Date.now();
		const abs = Math.abs(diff);
		const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
		if (abs < 60_000) return rtf.format(Math.round(diff / 1000), 'second');
		if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
		if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour');
		return rtf.format(Math.round(diff / 86_400_000), 'day');
	}

	function formatAbsoluteDate(ts: number): string {
		return new Date(ts).toLocaleString('en-US', {
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			month: 'short',
			year: 'numeric',
		});
	}
</script>

<div class="backdrop-blur-xl bg-slate-900/95 border border-white/10 flex flex-col h-full overflow-hidden rounded-2xl">
	<!-- Header -->
	<div class="border-b border-white/10 flex items-center justify-between px-4 py-3 shrink-0">
		<div class="flex gap-2.5 items-center">
			<History
				class="text-gray-400"
				size={18}
			/>
			<h2 class="font-semibold text-gray-200">Benchmark History</h2>
			{#if reports.length > 0}
				<span class="bg-white/10 font-mono px-1.5 py-0.5 rounded text-gray-400 text-[10px]">{reports.length}</span>
			{/if}
		</div>
		<div class="flex gap-1 items-center">
			{#if reports.length > 0}
				<button
					onclick={handleClearAll}
					class="cursor-pointer px-2 py-1.5 rounded-lg text-xs transition-colors {clearConfirm
						? 'bg-red-500/20 text-red-400'
						: 'hover:bg-white/10 text-gray-500 hover:text-gray-300'}"
					title={clearConfirm ? 'Click again to confirm' : 'Clear all history'}
				>
					{clearConfirm ? 'Confirm clear?' : 'Clear all'}
				</button>
			{/if}
			<button
				onclick={() => { clearConfirm = false; onClose(); }}
				class="cursor-pointer hover:bg-white/10 hover:text-white p-1.5 rounded-lg text-gray-500 transition-colors"
				aria-label="Close"
			>
				<X size={18} />
			</button>
		</div>
	</div>

	<!-- Search + Sort -->
	{#if reports.length > 0}
		<div class="border-b border-white/5 flex gap-2 items-center px-3 py-2.5 shrink-0">
			<div class="bg-white/5 flex flex-1 gap-2 items-center px-2.5 py-1.5 rounded-lg">
				<Search
					class="shrink-0 text-gray-600"
					size={13}
				/>
				<input
					bind:value={searchQuery}
					placeholder="Search runs…"
					class="bg-transparent flex-1 min-w-0 outline-none placeholder-gray-600 text-gray-200 text-xs"
				/>
				{#if searchQuery}
					<button
						onclick={() => (searchQuery = '')}
						class="cursor-pointer shrink-0 text-gray-600 hover:text-gray-400"
					>
						<X size={12} />
					</button>
				{/if}
			</div>

			<div class="flex gap-0.5">
				<button
					onclick={() => (sortBy = 'date')}
					title="Sort by date"
					class="cursor-pointer p-1.5 rounded transition-colors {sortBy === 'date'
						? 'bg-white/10 text-gray-200'
						: 'text-gray-600 hover:text-gray-400'}"
				>
					<Clock size={13} />
				</button>
				<button
					onclick={() => (sortBy = 'aps')}
					title="Sort by APS"
					class="cursor-pointer p-1.5 rounded transition-colors {sortBy === 'aps'
						? 'bg-white/10 text-gray-200'
						: 'text-gray-600 hover:text-gray-400'}"
				>
					<Zap size={13} />
				</button>
				<button
					onclick={() => (sortBy = 'milestones')}
					title="Sort by milestones"
					class="cursor-pointer p-1.5 rounded transition-colors {sortBy === 'milestones'
						? 'bg-white/10 text-gray-200'
						: 'text-gray-600 hover:text-gray-400'}"
				>
					<Target size={13} />
				</button>
			</div>
		</div>
	{/if}

	<!-- List -->
	<div class="flex-1 overflow-y-auto px-3 py-3">
		{#if loading}
			<div class="flex flex-col gap-2 pt-2">
				{#each Array(3) as _}
					<div class="animate-pulse bg-white/5 h-24 rounded-xl"></div>
				{/each}
			</div>
		{:else if reports.length === 0}
			<div class="flex flex-col gap-2 items-center justify-center py-16 text-center text-gray-600">
				<History
					class="opacity-20"
					size={40}
				/>
				<p class="text-sm">No saved benchmarks yet.</p>
				<p class="text-xs">Run a simulation to save a report.</p>
			</div>
		{:else if filteredReports.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-center text-gray-600">
				<p class="text-sm">No runs match "<span class="text-gray-400">{searchQuery}</span>"</p>
			</div>
		{:else}
			<div class="flex flex-col gap-2">
				{#each filteredReports as report (report.id)}
					{@const isLoaded = loadedId === report.id}
					{@const isCompared = comparisonId === report.id}
					{@const isDeleting = deletingId === report.id}
					{@const isEditing = editingId === report.id}
					<div
						class="border flex flex-col gap-2.5 p-3 rounded-xl transition-all {isLoaded
							? 'bg-amber-500/8 border-amber-500/40'
							: isCompared
								? 'bg-cyan-500/8 border-cyan-500/40'
								: 'bg-white/4 border-white/8 hover:border-white/15'}"
					>
						<!-- Name row -->
						<div class="flex gap-2 items-start justify-between min-w-0">
							<div class="flex-1 min-w-0">
								{#if isEditing}
									<div class="flex gap-1.5 items-center">
										<input
											bind:value={editingName}
											onkeydown={onEditKeydown}
											onblur={commitEdit}
											class="bg-white/10 border border-white/20 flex-1 min-w-0 outline-none px-2 py-0.5 rounded text-gray-100 text-sm"
											autofocus
										/>
										<button
											onclick={commitEdit}
											class="cursor-pointer shrink-0 text-green-400 hover:text-green-300"
										>
											<Check size={14} />
										</button>
									</div>
								{:else}
									<div class="flex gap-1.5 items-center group/name min-w-0">
										<span
											class="leading-snug text-gray-200 text-sm truncate"
											title={report.name}
										>{report.name}</span>
										<button
											onclick={() => startEdit(report)}
											class="cursor-pointer opacity-0 group-hover/name:opacity-100 shrink-0 text-gray-600 hover:text-gray-300 transition-opacity"
										>
											<Pencil size={11} />
										</button>
									</div>
								{/if}

								<div class="flex gap-2 items-center mt-0.5">
									{#if !report.wasCompleted}
										<span class="bg-amber-500/20 px-1.5 py-px rounded text-amber-400 text-[9px] font-medium">Cancelled</span>
									{:else}
										<span class="bg-green-500/15 px-1.5 py-px rounded text-green-500 text-[9px] font-medium">Done</span>
									{/if}
									<span
										class="text-gray-600 text-[10px]"
										title={formatAbsoluteDate(report.createdAt)}
									>{formatRelativeTime(report.createdAt)}</span>
									<span class="text-gray-700 text-[10px]">{report.config.targetHours}h</span>
								</div>
							</div>

							<!-- Action buttons -->
							<div class="flex gap-0.5 shrink-0">
								<button
									onclick={() => onApplyConfig(report.config)}
									class="cursor-pointer hover:bg-green-500/20 hover:text-green-400 p-1.5 rounded text-gray-600 transition-colors"
									title="Apply this config"
								>
									<ClipboardList size={14} />
								</button>
								<button
									onclick={() => onLoad(report.id)}
									class="cursor-pointer p-1.5 rounded transition-colors {isLoaded
										? 'bg-amber-500/25 text-amber-400'
										: 'hover:bg-amber-500/20 text-gray-600 hover:text-amber-400'}"
									title={isLoaded ? 'Currently viewing' : 'View this run'}
								>
									<FolderOpen size={14} />
								</button>
								<button
									onclick={() => handleCompare(report.id)}
									class="cursor-pointer p-1.5 rounded transition-colors {isCompared
										? 'bg-cyan-500/25 text-cyan-400'
										: 'hover:bg-cyan-500/20 text-gray-600 hover:text-cyan-400'}"
									title={isCompared ? 'Remove comparison' : 'Compare with current'}
								>
									<GitCompare size={14} />
								</button>
								{#if isDeleting}
									<button
										onclick={() => handleDelete(report.id)}
										class="cursor-pointer bg-red-500/25 px-1.5 py-1 rounded text-red-400 text-[10px] font-medium transition-colors hover:bg-red-500/40"
										title="Click again to confirm"
									>
										Sure?
									</button>
									<button
										onclick={() => (deletingId = null)}
										class="cursor-pointer hover:bg-white/10 p-1.5 rounded text-gray-600 transition-colors"
									>
										<X size={12} />
									</button>
								{:else}
									<button
										onclick={() => handleDelete(report.id)}
										class="cursor-pointer hover:bg-red-500/20 hover:text-red-400 p-1.5 rounded text-gray-600 transition-colors"
										title="Delete"
									>
										<Trash2 size={14} />
									</button>
								{/if}
							</div>
						</div>

						<!-- Stats row -->
						<div class="gap-1.5 grid grid-cols-4 text-[10px]">
							<div class="bg-black/20 flex flex-col items-center py-1.5 rounded-lg">
								<span class="font-mono text-pink-400 truncate max-w-full px-1 text-center">{formatNumber(report.finalAPS)}/s</span>
								<span class="text-gray-600 mt-0.5">APS</span>
							</div>
							<div class="bg-black/20 flex flex-col items-center py-1.5 rounded-lg">
								<span class="font-mono text-green-400 truncate max-w-full px-1 text-center">{formatNumber(report.finalAtoms)}</span>
								<span class="text-gray-600 mt-0.5">Atoms</span>
							</div>
							<div class="bg-black/20 flex flex-col items-center py-1.5 rounded-lg">
								<span class="font-mono text-amber-400">Lv.{report.finalLevel}</span>
								<span class="text-gray-600 mt-0.5">Level</span>
							</div>
							<div class="bg-black/20 flex flex-col items-center py-1.5 rounded-lg">
								<span class="font-mono text-cyan-400">{report.milestoneCount}</span>
								<span class="text-gray-600 mt-0.5">MS</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
