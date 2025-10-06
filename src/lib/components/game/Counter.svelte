<script lang="ts">
	import {atomsPerSecond, atoms, electrons, hasBonus, protons, buildingProductions, buildings} from '$stores/gameStore';
	import {formatNumber} from '$lib/utils';
	import {BUILDINGS, BuildingTypes, type BuildingType} from '$data/buildings';
	import {Info} from 'lucide-svelte';
	import Tooltip from '@components/ui/Tooltip.svelte';

	// Get buildings with their production sorted by production value (highest first)
	const buildingsWithProduction = $derived(Object.entries($buildingProductions)
		.filter(([type, production]) => production > 0)
		.map(([type, production]) => ({
			type: type as BuildingType,
			name: BUILDINGS[type as BuildingType].name,
			production: production,
			count: $buildings[type as BuildingType]?.count ?? 0
		}))
		.sort((a, b) => Object.values(BuildingTypes).indexOf(a.type) - Object.values(BuildingTypes).indexOf(b.type)));
</script>

<div class="mb-8 text-center z-1 sm:mb-4">
	<div class="mb-2">
		{#if $electrons > 0}
			<div>
				<span id="electrons-value" class="text-2xl font-bold text-green-400">{formatNumber($electrons)}</span>
				<span class="font-bold text-lg opacity-80">electrons</span>
			</div>
		{/if}
		{#if $protons > 0}
			<div>
				<span id="protons-value" class="text-2xl font-bold text-yellow-400">{formatNumber($protons)}</span>
				<span class="font-bold text-lg opacity-80">protons</span>
			</div>
		{/if}
		<span id="atoms-value" class=" sm:text-[2.75rem] sm:leading-[1.35] text-5xl font-bold text-accent-500 transition-[filter] duration-200 {$hasBonus ? 'drop-shadow-[0_0_10px_#4a90e2]' : ''}">{formatNumber($atoms)}</span>
		<span class="font-bold text-2xl opacity-80">atoms</span>
	</div>
	<div class="text-lg relative flex justify-center items-center">
		<div class="mr-2">
			<span
				id="atoms-per-second-value"
				class="{$hasBonus ? 'opacity-100' : 'opacity-80'} font-bold transition-[filter] duration-200 {$hasBonus ? 'drop-shadow-[0_0_7px_currentColor]' : ''}"
			>
				{formatNumber($atomsPerSecond)}
			</span> atoms per second
		</div>

		{#if buildingsWithProduction.length > 0}
			<Tooltip position="bottom" size="md">
				<Info size={16} class="inline cursor-help text-white/60 hover:text-white/80 transition-colors" />

				{#snippet content()}
					<div class="text-xs font-semibold mb-2">Buildings Production:</div>
					<div class="space-y-1">
						{#each buildingsWithProduction as building}
							<div class="flex justify-between items-center text-xs">
								<span class="text-white/80">{building.name} (×{building.count})</span>
								<span class="text-accent-300 font-medium">{formatNumber(building.production)}/s ({Math.round(building.production / $atomsPerSecond * 100)}%)</span>
							</div>
						{/each}
					</div>
				{/snippet}
			</Tooltip>
		{/if}
	</div>
</div>
