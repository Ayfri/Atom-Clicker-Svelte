<script lang="ts">
	import { BarChart3, Check, Clock, Cog, FileBox, Sparkles, X, type Icon as IconType } from 'lucide-svelte';
	import Currency from '@components/ui/Currency.svelte';
	import Tooltip from '@components/ui/Tooltip.svelte';
	import { CURRENCIES, type CurrencyName } from '$data/currencies';
	import { gameManager, type GameManager } from '$helpers/GameManager.svelte';
	import { statsConfig, NUMBER_STATS, ARRAY_STATS, type StatConfig } from '$helpers/statConstants';
	import { formatNumberFull } from '$lib/utils';
	import { parseAtomsValue } from '$lib/utils/number-parser';

	// Group stats by type
	const statGroups = $derived.by(() => {
		const groups: Record<string, Array<{ key: string; config: StatConfig; value: unknown; icon: any; currency?: CurrencyName }>> = {
			currencies: [],
			prestige: [],
			totals: [],
			system: [],
			other: []
		};

		Object.entries(statsConfig).forEach(([key, config]) => {
			const value = gameManager[key as keyof GameManager];

			// Check if it's a currency stat
			const currencyEntry = Object.entries(CURRENCIES).find(([_, c]) => c.stat === key);
			const currency = currencyEntry ? (currencyEntry[0] as CurrencyName) : undefined;

			let icon: any = FileBox;

			if (currency) {
				icon = undefined;
			} else if (key.startsWith('total')) {
				icon = BarChart3;
			} else if (key.includes('Realm') || key.includes('protonise') || key.includes('electronize')) {
				icon = Sparkles;
			} else if (['lastSave', 'startDate', 'inGameTime'].includes(key)) {
				icon = Clock;
			} else if (key === 'settings') {
				icon = Cog;
			}

			const stat = { key, config, value, icon, currency };

			if (currency || ['atoms', 'protons', 'electrons', 'photons', 'excitedPhotons'].includes(key)) {
				groups.currencies.push(stat);
			} else if (key.startsWith('total')) {
				groups.totals.push(stat);
			} else if (['purpleRealmUnlocked', 'protoniseProtonsGain', 'electronizeElectronsGain'].includes(key)) {
				groups.prestige.push(stat);
			} else if (['lastSave', 'startDate', 'inGameTime', 'settings'].includes(key)) {
				groups.system.push(stat);
			} else {
				groups.other.push(stat);
			}
		});

		return groups;
	});

	function updateStat(key: string, value: unknown) {
		try {
			const manager = gameManager as unknown as Record<string, unknown>;
			const currentValue = manager[key];
			if (NUMBER_STATS.includes(key as any)) {
				const num = typeof value === 'string' ? parseFloat(value) : (value as number);
				manager[key] = isNaN(num) ? 0 : num;
			} else if (ARRAY_STATS.includes(key as any) || (typeof currentValue === 'object' && currentValue !== null)) {
				if (typeof value === 'string') {
					try {
						manager[key] = JSON.parse(value);
					} catch (e) {
						console.error('Failed to parse JSON for', key, ':', e);
					}
				} else {
					manager[key] = value;
				}
			} else {
				manager[key] = value;
			}
		} catch (e) {
			console.error('Failed to update stat:', e);
		}
	}

	// Stat Item State Management (for snippets)
	let editingKey = $state<string | null>(null);
	let localValue = $state<string>('');

	function startEditing(key: string, value: unknown) {
		editingKey = key;
		localValue = String(value);
	}

	function saveEdit(key: string) {
		updateStat(key, localValue);
		editingKey = null;
	}

	function cancelEdit() {
		editingKey = null;
	}
</script>

{#snippet statItem(key: string, value: unknown, icon: any, currency?: CurrencyName)}
	{@const liveValue = (gameManager as any)[key]}
	<div class="flex flex-col gap-1 p-1 rounded-lg hover:bg-white/5 transition-colors group">
		<div class="flex items-center justify-between px-1">
			<div class="flex items-center gap-1.5 min-w-0">
				{#if currency}
					<Currency name={currency} size={12} />
				{:else if icon}
					{@const Icon = icon}
					<Icon size={12} class="text-accent-400/50" />
				{/if}
				<div class="text-[11px] text-accent-200/50 font-semibold truncate" title={key}>{key}</div>
			</div>
			{#if Array.isArray(value) || (typeof value === 'object' && value !== null)}
				<div class="text-[10px] text-white/20 italic uppercase tracking-tighter shrink-0">
					{Array.isArray(value) ? 'Array' : 'Object'}
				</div>
			{/if}
		</div>

		<div class="relative">
			{#if typeof value === 'boolean'}
				<div class="flex items-center justify-between h-9 px-2 bg-black/20 rounded-lg border border-white/5">
					<span class={value ? "text-green-400 text-sm" : "text-red-400 text-sm"}>{value ? 'True' : 'False'}</span>
					<input
						type="checkbox"
						checked={value}
						onchange={(e) => updateStat(key, e.currentTarget.checked)}
						class="w-4 h-4 rounded border-white/10 bg-black/20 text-accent-500 focus:ring-accent-500/50 cursor-pointer"
					/>
				</div>
			{:else if Array.isArray(value) || (typeof value === 'object' && value !== null)}
				{@const isEditing = editingKey === key}
				<div class="flex flex-col gap-1.5">
					<div class="relative group/json">
						{#if isEditing}
							<textarea
								value={localValue as string}
								oninput={(e) => localValue = e.currentTarget.value}
								onkeydown={(e) => {
									if (e.key === 'Enter' && e.ctrlKey) saveEdit(key);
									else if (e.key === 'Escape') cancelEdit();
								}}
								class="w-full bg-black/40 rounded-lg px-3 py-2 text-[10px] border border-accent-500/50 focus:outline-none transition-colors text-accent-300 font-mono min-h-30 resize-y shadow-inner"
							></textarea>
							<div class="absolute top-2 right-2 flex gap-1">
								<button class="p-1 bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded-md transition-colors shadow-lg border border-green-500/20" onclick={() => saveEdit(key)} title="Save (Ctrl+Enter)">
									<Check size={14} />
								</button>
								<button class="p-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-md transition-colors shadow-lg border border-red-500/20" onclick={cancelEdit} title="Cancel (Esc)">
									<X size={14} />
								</button>
							</div>
						{:else}
							<div
								role="button"
								tabindex="0"
								onclick={() => startEditing(key, JSON.stringify(value, null, 2))}
								onkeydown={(e) => e.key === 'Enter' && startEditing(key, JSON.stringify(value, null, 2))}
								class="w-full bg-black/20 rounded-lg px-3 py-2 text-[10px] border border-white/5 hover:border-accent-500/30 transition-colors text-accent-300/70 font-mono max-h-40 overflow-hidden cursor-pointer break-all line-clamp-6"
							>
								<span class="text-white/40 mr-1">
									{Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}`}
								</span>
								{JSON.stringify(value)}
							</div>
						{/if}
					</div>
				</div>
			{:else}
				{@const isEditing = editingKey === key}
				<div class="flex items-center gap-2 w-full">
					<div class="relative flex-1">
						{#if isEditing}
							{#if NUMBER_STATS.includes(key as any)}
								<Tooltip position="bottom" size="md" class="w-full">
									{#snippet children()}
										<input
											type="text"
											bind:value={localValue}
											onkeydown={(e) => {
												if (e.key === 'Enter') saveEdit(key);
												else if (e.key === 'Escape') cancelEdit();
											}}
											class="w-full bg-black/40 rounded-lg px-3 py-2 text-sm border border-accent-500/50 focus:outline-none transition-colors text-white font-mono"
											autofocus
										/>
									{/snippet}
									{#snippet content()}
										<div class="flex flex-col gap-1 min-w-40">
											<div class="flex items-center justify-between border-b border-white/10 pb-1 mb-1">
												<span class="text-accent-400 text-[10px] uppercase tracking-widest">Live Value</span>
												<span class="text-[9px] text-white/30 font-medium px-1.5 py-0.5 bg-white/5 rounded">NUMBER</span>
											</div>
											<div class="text-sm font-mono text-accent-100 break-all">
												{typeof liveValue === 'number' ? formatNumberFull(liveValue) : liveValue}
											</div>

											<div class="flex items-center justify-between border-b border-white/10 pb-1 mb-1 mt-2">
												<span class="text-accent-400 text-[10px] uppercase tracking-widest">Parsed Input</span>
											</div>
											<div class="text-sm font-mono text-accent-300 break-all">
												{formatNumberFull(parseAtomsValue(localValue))}
											</div>

											<div class="mt-1.5 flex flex-col gap-1 text-[10px] text-white/40 font-medium italic">
												<div class="flex items-center gap-2">
													<span class="w-8 text-accent-500 not-italic font-black">ENTER</span>
													<span>to save changes</span>
												</div>
												<div class="flex items-center gap-2">
													<span class="w-8 text-red-500 not-italic font-black">ESC</span>
													<span>to discard</span>
												</div>
											</div>
										</div>
									{/snippet}
								</Tooltip>
							{:else}
								<input
									type="text"
									bind:value={localValue}
									onkeydown={(e) => {
										if (e.key === 'Enter') saveEdit(key);
										else if (e.key === 'Escape') cancelEdit();
									}}
									class="w-full bg-black/40 rounded-lg px-3 py-2 text-sm border border-accent-500/50 focus:outline-none transition-colors text-white font-mono"
									autofocus
								/>
							{/if}
						{:else}
							<input
								type="text"
								value={value}
								onfocus={() => startEditing(key, value)}
								class="w-full bg-black/20 rounded-lg px-3 py-2 text-sm border border-white/5 hover:border-accent-500/30 transition-colors text-white font-mono cursor-pointer"
								readonly
							/>
						{/if}
					</div>
					{#if isEditing}
						<div class="flex gap-1">
							<button class="p-1 hover:bg-green-500/20 text-green-400 rounded transition-colors" onclick={() => saveEdit(key)}>
								<Check size={14} />
							</button>
							<button class="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors" onclick={cancelEdit}>
								<X size={14} />
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/snippet}

<div class="space-y-4">
	{#each Object.entries(statGroups) as [groupName, stats]}
		{#if stats.length > 0}
			{@const Icon = stats[0].icon}
			<div class="space-y-2">
				<h3 class="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-accent-300/50 px-2">
					{#if stats[0].currency}
						<Currency name={stats[0].currency} size={16} />
					{:else if stats[0].icon}
						{@const Icon = stats[0].icon}
						<Icon size={16} />
					{/if}
					{groupName}
				</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-1 bg-white/5 rounded-xl p-1.5 border border-white/5">
					{#each stats as stat (stat.key)}
						{@render statItem(stat.key, stat.value, stat.icon, stat.currency)}
					{/each}
				</div>
			</div>
		{/if}
	{/each}
</div>
