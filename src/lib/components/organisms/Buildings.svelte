<script lang="ts">
	import { gameManager } from '$helpers/gameManager';
	import { getCurrentState } from '$stores/gameStore';
	import { BUILDING_COLORS, type BuildingData, BUILDINGS, type BuildingType } from '$data/buildings';
	import { buildingProductions, buildings, currentUpgradesBought, globalMultiplier, bonusMultiplier, settings } from '$stores/gameStore';
	import type { Building, Price } from '$lib/types';
	import AutoButton from '@components/atoms/AutoButton.svelte';
	import Value from '@components/atoms/Value.svelte';
	import { fade } from 'svelte/transition';
	import { BUILDING_COST_MULTIPLIER } from '@/lib/constants';
	import { getUpgradesWithEffects } from '$lib/helpers/effects';
	const buildingsEntries = Object.entries(BUILDINGS) as [BuildingType, BuildingData][];
	let unaffordableRootBuildings: [BuildingType, BuildingData][] = [];
	let affordableBuildings: [BuildingType, Building][] = [];
	let unlockedBuildings: [BuildingType, Building][] = [];
	let hiddenBuildings: [BuildingType, BuildingData][] = [];

	const PurchaseModes = {
		x1: 1,
		x5: 5,
		x25: 25,
		max: Infinity,
	} as const;
	const purchaseModes = Object.keys(PurchaseModes) as (keyof typeof PurchaseModes)[];
	let purchaseAmounts: Record<BuildingType, number> = Object.fromEntries(
		buildingsEntries.map(([type]) => [type, 0])
	) as Record<BuildingType, number>;

	type PurchaseMode = keyof typeof PurchaseModes;
	let selectedPurchaseMode: PurchaseMode = 'x1';

	function handlePurchase(type: BuildingType) {
		if (!affordableBuildings.some(([t]) => t === type)) return;
		const amount = purchaseAmounts[type];
		if (amount > 0) {
			gameManager.purchaseBuilding(type, amount);
		}
	}

	$: if ($buildings) {
		unaffordableRootBuildings = buildingsEntries.filter(([type, building]) => gameManager.canAfford(building.cost) === false);
		unlockedBuildings = Object.entries($buildings).filter(([, { unlocked }]) => unlocked) as [BuildingType, Building][];
		hiddenBuildings = buildingsEntries.filter(
			([type]) =>
				unlockedBuildings.map((u) => u[0]).indexOf(type) === -1 && unaffordableRootBuildings.map((u) => u[0]).indexOf(type) !== -1,
		);

		buildingsEntries
			.filter(
				([type]) =>
					unlockedBuildings.map((u) => u[0]).indexOf(type) === -1 &&
					unaffordableRootBuildings.map((u) => u[0]).indexOf(type) === -1,
			)
			.forEach(([type]) => gameManager.unlockBuilding(type));

		affordableBuildings = Object.entries($buildings).filter(([type, building]) => {
			const bulkCost = {
				amount: getBulkBuyCost(type as BuildingType, purchaseAmounts[type as BuildingType]),
				currency: building.cost.currency
			};
			return gameManager.canAfford(bulkCost);
		}) as [BuildingType, Building][];
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

	$: if (selectedPurchaseMode && $buildings) {
		purchaseAmounts = Object.fromEntries(
			buildingsEntries.map(([type]) => [type, getPurchaseAmount(type)])
		) as Record<BuildingType, number>;
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
</script>

<div class="bg-black/10 backdrop-blur-sm rounded-lg p-4 buildings">
	<h2>Buildings</h2>
	<div class="flex items-center gap-2 my-2">
		{#each purchaseModes as mode}
			<button
				class="bg-white/5 hover:bg-white/10 rounded px-2 py-1 text-sm text-white transition-all duration-200 cursor-pointer {selectedPurchaseMode === mode ? '!bg-white/20' : ''}"
				on:click={() => selectedPurchaseMode = mode}
			>
				{mode === 'max' ? 'Max' : mode}
			</button>
		{/each}
	</div>

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

		<div
			class="bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer mt-2 p-3 transition-all duration-200 {unaffordable ? 'opacity-50 cursor-not-allowed' : ''}"
			style="--color: {color};"
			on:click={() => handlePurchase(type)}
			transition:fade
			{hidden}
		>
			<div>
				<h3 class="text-base m-0" style="color: var(--color);">
					{obfuscated ? '???' : building.name}
					{saveData?.count ? `(${saveData.count})` : ''}
					{#if level > 0}
						<span>⇮{level}</span>
					{/if}
				</h3>
				<p class="text-sm my-1">
					{saveData && saveData.count > 0 ? '' : 'Will produce'}
					<Value value={$buildingProductions[type] || building.rate * $globalMultiplier * $bonusMultiplier} currency="Atoms" postfix="/s" class="text-accent-300"/>
					{#if $buildingProductions[type]}
						<span class="opacity-60 text-[0.7rem] leading-3">
							<Value value={$buildingProductions[type] / (saveData?.count ?? 1)} prefix="(" />
							× {saveData?.count ?? 1})
						</span>
					{/if}
				</p>
			</div>
			<div class="text-sm mt-2 flex justify-between items-center" style="color: var(--color);">
				<div>
					Cost: <Value value={totalCost} currency={saveData?.cost?.currency ?? building.cost.currency} />
					{#if selectedPurchaseMode === 'max' && purchaseAmount > 0}
						<span class="opacity-60 text-[0.7rem] leading-3 ml-1">(×{purchaseAmount})</span>
					{/if}
				</div>
				{#if hasAutomation}
					<AutoButton
						onClick={() => gameManager.toggleAutomation(type)}
						toggled={isAutomated}
					/>
				{/if}
			</div>
		</div>
	{/each}
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
