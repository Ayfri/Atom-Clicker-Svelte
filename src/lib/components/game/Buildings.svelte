<script lang="ts">
	import { gameManager } from '$helpers/gameManager';
	import { BUILDING_COLORS, type BuildingData, BUILDINGS, type BuildingType } from '$data/buildings';
	import { buildingProductions, buildings, currentUpgradesBought, globalMultiplier, bonusMultiplier, settings, atoms, electrons, protons } from '$stores/gameStore';
	import type { Building, Price } from '$lib/types';
	import AutoButton from '@components/ui/AutoButton.svelte';
	import Value from '@components/ui/Value.svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { BUILDING_COST_MULTIPLIER } from '$lib/constants';
	import { getUpgradesWithEffects } from '$lib/helpers/effects';
	import { recentlyAutoPurchasedBuildings } from '$stores/autoBuy';

	const buildingsEntries = Object.entries(BUILDINGS) as [BuildingType, BuildingData][];

	const PurchaseModes = {
		x1: 1,
		x5: 5,
		x25: 25,
		max: Infinity,
	} as const;
	type PurchaseMode = keyof typeof PurchaseModes;

	const purchaseModes = Object.keys(PurchaseModes) as PurchaseMode[];

	let selectedPurchaseMode: PurchaseMode = $state('x1');

	// Use $derived for computed values instead of $effect with state updates
	const unaffordableRootBuildings = $derived(
		buildingsEntries.filter(([type, building]) => gameManager.canAfford(building.cost) === false)
	);
	
	const unlockedBuildings = $derived(
		Object.entries($buildings).filter(([, { unlocked }]) => unlocked) as [BuildingType, Building][]
	);
	
	const hiddenBuildings = $derived(
		buildingsEntries.filter(
			([type]) =>
				unlockedBuildings.map((u) => u[0]).indexOf(type) === -1 && 
				unaffordableRootBuildings.map((u) => u[0]).indexOf(type) !== -1,
		)
	);

	const purchaseAmounts = $derived(
		Object.fromEntries(
			buildingsEntries.map(([type]) => [type, getPurchaseAmount(type)])
		) as Record<BuildingType, number>
	);

	const affordableBuildings = $derived(
		Object.entries($buildings).filter(([type, building]) => {
			const bulkCost = {
				amount: getBulkBuyCost(type as BuildingType, purchaseAmounts[type as BuildingType]),
				currency: building.cost.currency
			};
			return gameManager.canAfford(bulkCost);
		}) as [BuildingType, Building][]
	);

	function handlePurchase(type: BuildingType) {
		if (!affordableBuildings.some(([t]) => t === type)) return;
		const amount = purchaseAmounts[type];
		if (amount > 0) {
			gameManager.purchaseBuilding(type, amount);
		}
	}

	function getMaxAffordable(price: Price, type: BuildingType): number {
		const currency = gameManager.getCurrency(price);
		const baseCost = price.amount;

		if (currency < baseCost) return 1;

		// Binary search for max affordable amount
		let left = 1;
		let right = 1000; // Reasonable upper limit

		while (left <= right) {
			const mid = Math.floor((left + right) / 2);
			const cost = getBulkBuyCost(type, mid);

			if (cost <= currency) {
				left = mid + 1;
			} else {
				right = mid - 1;
			}
		}

		return right;
	}

	function getPurchaseAmount(type: BuildingType): number {
		if (selectedPurchaseMode !== 'max') {
			return PurchaseModes[selectedPurchaseMode];
		}

		const building = BUILDINGS[type];
		const baseCost = structuredClone($buildings[type]?.cost ?? building.cost);
		return getMaxAffordable(baseCost, type);
	}


	function getBulkBuyCost(type: BuildingType, amount: number): number {
		const currentCount = $buildings[type]?.count ?? 0;
		const baseCost = BUILDINGS[type].cost.amount;

		let totalCost = 0;
		for (let i = 0; i < amount; i++) {
			totalCost += baseCost * (BUILDING_COST_MULTIPLIER ** (currentCount + i));
		}

		return Math.round(totalCost);
	}


	$effect(() => {
		buildingsEntries
			.filter(
				([type]) =>
					unlockedBuildings.map((u) => u[0]).indexOf(type) === -1 &&
					unaffordableRootBuildings.map((u) => u[0]).indexOf(type) === -1,
			)
			.forEach(([type]) => gameManager.unlockBuilding(type));
	});
</script>

<div class="bg-black/10 backdrop-blur-xs rounded-lg p-3 buildings flex flex-col gap-2">
	<h2 class="text-lg">Buildings</h2>
	<div class="flex items-center gap-1 my-1">
		{#each purchaseModes as mode}
			<button
				class="bg-white/5 hover:bg-white/10 rounded-sm px-2 py-0.5 text-xs text-white transition-all duration-200 cursor-pointer {selectedPurchaseMode === mode ? 'bg-white/20!' : ''}"
				onclick={() => selectedPurchaseMode = mode}
			>
				{mode === 'max' ? 'Max' : mode}
			</button>
		{/each}
	</div>

	<div class="flex flex-col gap-1.5 overflow-y-auto">
		{#each buildingsEntries as [type, building], i}
			{@const saveData = $buildings[type]}
			{@const unaffordable = !affordableBuildings.some(([t]) => t === type)}
			{@const obfuscated = hiddenBuildings.some(([t]) => t === type)}
			{@const hidden = hiddenBuildings.slice(1).some(([t]) => t === type)}
			{@const level = saveData?.level ?? 0}
			{@const color = BUILDING_COLORS[level]}
			{@const purchaseAmount = purchaseAmounts[type]}
			{@const totalCost = getBulkBuyCost(type, purchaseAmount)}
			{@const isAutomated = $settings.automation.buildings.includes(type)}
			{@const hasAutomation = getUpgradesWithEffects($currentUpgradesBought, { type: 'auto_buy', target: type }).length > 0}
			{@const autoPurchasedCount = $recentlyAutoPurchasedBuildings.get(type) || 0}

			<div
				class="relative bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer p-2 transition-all duration-200 {unaffordable ? 'opacity-50 cursor-not-allowed' : ''}"
				style="--color: {color};"
				onclick={() => handlePurchase(type)}
				transition:fade
				{hidden}
			>
				{#if autoPurchasedCount > 0}
					<div
						class="absolute top-1 right-1 bg-blue-500/20 text-blue-300 font-medium text-[0.65rem] px-1 py-0.5 rounded border border-blue-500/30 z-10 pointer-events-none"
						in:scale={{ duration: 150, start: 0.5 }}
						out:fly={{ y: -20, duration: 300, opacity: 0, delay: 200 }}
					>
						+{autoPurchasedCount}
					</div>
				{/if}
				<div>
					<h3 class="text-sm m-0" style="color: var(--color);">
						{obfuscated ? '???' : building.name}
						{saveData?.count ? `(${saveData.count})` : ''}
						{#if level > 0}
							<span class="text-xs">⇮{level}</span>
						{/if}
					</h3>
					<p class="text-xs my-0.5">
						{saveData && saveData.count > 0 ? '' : 'Will produce'}
						<Value value={$buildingProductions[type] || building.rate * $globalMultiplier * $bonusMultiplier} currency="Atoms" postfix="/s" class="text-accent-300"/>
						{#if $buildingProductions[type]}
							<span class="opacity-60 text-[0.6rem] leading-3">
								<Value value={$buildingProductions[type] / (saveData?.count ?? 1)} prefix="(" />
								× {saveData?.count ?? 1})
							</span>
						{/if}
					</p>
				</div>
				<div class="text-xs mt-1 flex justify-between items-center" style="color: var(--color);">
					<div>
						Cost: <Value value={totalCost} currency={saveData?.cost?.currency ?? building.cost.currency} />
						{#if selectedPurchaseMode === 'max' && purchaseAmount > 0}
							<span class="opacity-60 text-[0.6rem] leading-3 ml-1">(×{purchaseAmount})</span>
						{/if}
					</div>
					{#if hasAutomation}
						<AutoButton
							onClick={(e) => {
								e.stopPropagation();
								gameManager.toggleAutomation(type);
							}}
							toggled={isAutomated}
						/>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.buildings {
		grid-area: buildings;
	}

	:global(.skill-tree-icon) {
		cursor: pointer;
		float: right;
	}
</style>
