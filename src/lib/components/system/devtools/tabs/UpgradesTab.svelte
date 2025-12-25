<script lang="ts">
	import { gameManager } from '$helpers/GameManager.svelte';
	import { UPGRADES } from '$data/upgrades';
	import { PHOTON_UPGRADES } from '$data/photonUpgrades';
	import { BUILDING_TYPES, BUILDINGS } from '$data/buildings';
	import { Target, MousePointer, Globe, Building2, Sparkles, Check, X as XIcon, type Icon as IconType } from 'lucide-svelte';
	import Tooltip from '@components/ui/Tooltip.svelte';
	import type { Upgrade } from '$lib/types';

	let searchQuery = $state('');
	let upgradeFilter = $state<'all' | 'owned' | 'not-owned'>('all');

	const upgradeCategories = {
		special: ['feature_levels', 'feature_purple_realm'],
		click: (id: string) => id.startsWith('click_power'),
		global: (id: string) => id.startsWith('global_boost')
	};

	const categorizedUpgrades = $derived.by(() => {
		const categories: Record<string, { icon: typeof IconType; subcategories: Record<string, Array<[string, Upgrade]>> }> = {
			'Special Features': { icon: Target as typeof IconType, subcategories: { 'General': [] } },
			'Click Power': { icon: MousePointer as typeof IconType, subcategories: {} },
			'Global Boosts': { icon: Globe as typeof IconType, subcategories: { 'General': [] } }
		};

		Object.entries(UPGRADES).forEach(([id, upgrade]) => {
			const query = searchQuery.toLowerCase();
			const matchesSearch = !query ||
				id.toLowerCase().includes(query) ||
				upgrade.name.toLowerCase().includes(query) ||
				upgrade.description.toLowerCase().includes(query);

			const isOwned = gameManager.upgrades.includes(id);
			const matchesFilter = upgradeFilter === 'all' ||
				(upgradeFilter === 'owned' && isOwned) ||
				(upgradeFilter === 'not-owned' && !isOwned);

			if (!matchesSearch || !matchesFilter) return;

			if (upgradeCategories.special.includes(id)) {
				categories['Special Features'].subcategories['General'].push([id, upgrade]);
			} else if (upgradeCategories.click(id)) {
				let sub = 'Other';
				if (id.includes('mul')) sub = 'Multipliers';
				else if (id.includes('val')) sub = 'Base Value';
				else if (id.includes('aps')) sub = 'APS %';

				if (!categories['Click Power'].subcategories[sub]) categories['Click Power'].subcategories[sub] = [];
				categories['Click Power'].subcategories[sub].push([id, upgrade]);
			} else if (upgradeCategories.global(id)) {
				categories['Global Boosts'].subcategories['General'].push([id, upgrade]);
			} else {
				// Check for building upgrades
				for (const buildingId of BUILDING_TYPES) {
					if (id.startsWith(buildingId.toLowerCase())) {
						const categoryName = BUILDINGS[buildingId].name + ' Upgrades';
						if (!categories[categoryName]) {
							categories[categoryName] = { icon: Building2, subcategories: { 'General': [] } };
						}
						categories[categoryName].subcategories['General'].push([id, upgrade]);
						break;
					}
				}
			}
		});

		return categories;
	});

	function toggleUpgrade(id: string) {
		if (gameManager.upgrades.includes(id)) {
			gameManager.upgrades = gameManager.upgrades.filter(u => u !== id);
		} else {
			gameManager.upgrades = [...gameManager.upgrades, id];
		}
	}

	function toggleAllUpgrades() {
		const allIds = Object.keys(UPGRADES);
		if (gameManager.upgrades.length === allIds.length) {
			gameManager.upgrades = [];
		} else {
			gameManager.upgrades = allIds;
		}
	}
</script>



<div class="space-y-4">
	<!-- Search and Filters -->
	<div class="bg-white/5 rounded-xl p-3 border border-white/5">
		<div class="flex flex-wrap gap-2 mb-2">
			<input
				type="text"
				class="flex-1 min-w-48 bg-black/20 rounded-lg px-3 py-1.5 text-sm border border-white/5 focus:border-accent-500/50 focus:outline-none transition-colors text-white placeholder:text-white/40"
				placeholder="Search upgrades..."
				bind:value={searchQuery}
			/>
			<select
				class="bg-black/20 rounded-lg px-3 py-1.5 text-sm border border-white/5 focus:border-accent-500/50 focus:outline-none transition-colors text-white cursor-pointer"
				bind:value={upgradeFilter}
			>
				<option value="all">All</option>
				<option value="owned">Owned</option>
				<option value="not-owned">Not Owned</option>
			</select>
			<button
				class="flex items-center gap-2 bg-realm-600/80 hover:bg-realm-600 px-3 py-1.5 rounded text-sm font-semibold transition-all cursor-pointer shadow-lg"
				onclick={toggleAllUpgrades}
			>
				{#if gameManager.upgrades.length === Object.keys(UPGRADES).length}
					<XIcon size={14} />
					<span>Clear</span>
				{:else}
					<Check size={14} />
					<span>All</span>
				{/if}
			</button>
		</div>
		<div class="text-xs text-white/40 flex items-center gap-3">
			<span>Total: {Object.keys(UPGRADES).length}</span>
			<span>Owned: {gameManager.upgrades.length}</span>
		</div>
	</div>

	<!-- Normal Upgrades by Category -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		{#each Object.entries(categorizedUpgrades) as [category, { icon, subcategories }] (category)}
			{#if Object.values(subcategories).some(items => items.length > 0)}
				{@const Icon = icon}
				<div class="bg-white/5 rounded-lg p-3 border border-white/5 flex flex-col gap-4">
					<h3 class="text-sm font-bold flex items-center gap-2 text-accent-300 border-b border-white/10 pb-2">
						<Icon size={16} />
						<span class="truncate">{category}</span>
					</h3>

					<div class="space-y-4">
						{#each Object.entries(subcategories) as [subName, items]}
							{#if items.length > 0}
								<div class="space-y-1.5">
									{#if subName !== 'General'}
										<h4 class="text-[10px] uppercase tracking-widest text-white/40 font-bold">{subName}</h4>
									{/if}

									{#if category === 'Special Features'}
										<div class="flex flex-col gap-1">
											{#each items as [id, upgrade] (id)}
												{@const isOwned = gameManager.upgrades.includes(id)}
												<Tooltip size="sm">
													{#snippet children()}
														<button
															class="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer border
															{isOwned
																? 'bg-green-500/10 text-green-300 border-green-500/40 hover:bg-green-500/20'
																: 'bg-white/5 text-white/50 border-white/10 hover:border-white/20 hover:bg-white/10'}"
															onclick={() => toggleUpgrade(id)}
														>
															<span>{upgrade.name}</span>
															<div class="size-1.5 rounded-full {isOwned ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 'bg-white/20'}"></div>
														</button>
													{/snippet}
													{#snippet content()}
														<div class="space-y-1">
															<div class="flex items-center justify-between gap-4">
																<span class="font-bold text-accent-300">{upgrade.name}</span>
																<span class="text-[10px] font-mono text-white/40">{id}</span>
															</div>
															<p class="text-xs text-white/70 leading-relaxed">{upgrade.description}</p>
															<div class="pt-1 flex items-center gap-1.5">
																<div class="size-1.5 rounded-full {isOwned ? 'bg-green-500' : 'bg-red-500'}"></div>
																<span class="text-[10px] uppercase tracking-wider font-bold {isOwned ? 'text-green-400' : 'text-red-400'}">
																	{isOwned ? 'Owned' : 'Not Owned'}
																</span>
															</div>
														</div>
													{/snippet}
												</Tooltip>
											{/each}
										</div>
									{:else}
										<div class="flex flex-wrap gap-1.5">
											{#each items as [id, upgrade] (id)}
												{@const isOwned = gameManager.upgrades.includes(id)}
												{@const index = id.includes('_') ? id.split('_').pop() : ''}
												{@const displayIndex = isNaN(Number(index)) ? '★' : index}
												<Tooltip size="sm">
													{#snippet children()}
														<button
															class="size-7 rounded-lg flex items-center justify-center text-[10px] font-black transition-all cursor-pointer border-2
															{isOwned
																? 'bg-green-500/20 text-green-400 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
																: 'bg-white/5 text-white/20 border-white/10 hover:border-white/30 hover:bg-white/10'}"
															onclick={() => toggleUpgrade(id)}
															aria-label={upgrade.name}
														>
															{displayIndex}
														</button>
													{/snippet}
													{#snippet content()}
														<div class="space-y-1">
															<div class="flex items-center justify-between gap-4">
																<span class="font-bold text-accent-300">{upgrade.name}</span>
																<span class="text-[10px] font-mono text-white/40">{id}</span>
															</div>
															<p class="text-xs text-white/70 leading-relaxed">{upgrade.description}</p>
															<div class="pt-1 flex items-center gap-1.5">
																<div class="size-1.5 rounded-full {isOwned ? 'bg-green-500' : 'bg-red-500'}"></div>
																<span class="text-[10px] uppercase tracking-wider font-bold {isOwned ? 'text-green-400' : 'text-red-400'}">
																	{isOwned ? 'Owned' : 'Not Owned'}
																</span>
															</div>
														</div>
													{/snippet}
												</Tooltip>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	</div>

	<!-- Photon Upgrades -->
	<div class="bg-realm-900/10 rounded-lg p-4 border border-realm-600/20">
		<h3 class="text-base font-bold mb-4 flex items-center gap-2 text-realm-300 border-b border-realm-600/20 pb-2">
			<Sparkles size={18} />
			Photon Upgrades
		</h3>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
			{#each Object.entries(PHOTON_UPGRADES) as [id, upgrade]}
				<div class="bg-realm-900/20 p-3 rounded-lg border border-realm-700/30 flex flex-col gap-2 hover:border-realm-500/50 transition-colors group">
					<div class="flex items-start justify-between gap-2">
						<div class="font-bold text-sm text-realm-200 group-hover:text-realm-100 transition-colors">{upgrade.name}</div>
						<div class="text-[10px] font-mono text-white/20">{id}</div>
					</div>
					<div class="text-xs text-white/50 line-clamp-2 leading-tight min-h-[2.5em]">{upgrade.description}</div>
					<div class="flex items-center gap-3 mt-1">
						<div class="relative flex-1">
							<input
								type="number"
								min="0"
								value={gameManager.photonUpgrades[id] || 0}
								onchange={(e) => {
									const val = parseInt(e.currentTarget.value);
									if (!isNaN(val) && val >= 0) {
										gameManager.photonUpgrades[id] = val;
									}
								}}
								class="w-full bg-black/40 rounded-md px-2 py-1.5 text-sm border border-realm-500/30 focus:border-realm-400/60 focus:outline-none text-white font-bold transition-all"
							/>
						</div>
						<span class="text-[10px] uppercase tracking-widest font-black text-white/30">Level</span>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
