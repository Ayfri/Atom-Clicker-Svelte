<script lang="ts">
import { BUILDING_COLORS, BUILDINGS, type BuildingData, type BuildingType } from '$data/buildings';
import { CurrenciesTypes } from '$data/currencies';
import { BUILDING_COST_MULTIPLIER } from '$lib/constants';
import { getUpgradesWithEffects } from '$lib/helpers/effects';
import type { Building, Price } from '$lib/types';
import { gameManager } from '$helpers/GameManager.svelte';
import { autoBuyManager } from '$stores/autoBuy.svelte';
import AutoButton from '@components/ui/AutoButton.svelte';
import Value from '@components/ui/Value.svelte';
import { fade, fly, scale } from 'svelte/transition';

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
		buildingsEntries.filter(([, building]) => canAfford(building.cost) === false)
	);

	const unlockedBuildings = $derived(
		Object.entries(gameManager.buildings).filter(([, { unlocked }]) => unlocked) as [BuildingType, Building][]
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
		Object.entries(gameManager.buildings).filter(([type, building]) => {
			const buildingType = type as BuildingType;

			// Check if we can afford at least 1 building
			const currentCount = building.count;
			const baseCost = BUILDINGS[buildingType].cost.amount;
			const actualCost = baseCost * (BUILDING_COST_MULTIPLIER ** currentCount);
			const canAffordOne = canAfford({
				amount: Math.round(actualCost),
				currency: building.cost.currency
			});

			if (!canAffordOne) return false;

			// For max mode, check if purchaseAmounts[type] > 0
			if (selectedPurchaseMode === 'max') {
				return purchaseAmounts[buildingType] > 0;
			}

			// For other modes, check if we can afford the bulk purchase
			const bulkCost = {
				amount: getBulkBuyCost(buildingType, purchaseAmounts[buildingType]),
				currency: building.cost.currency
			};
			return canAfford(bulkCost);
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
		const currency = getCurrencyAmount(price);
		const baseCost = price.amount;
		const currentCount = gameManager.buildings[type]?.count ?? 0;
		const actualFirstCost = baseCost * (BUILDING_COST_MULTIPLIER ** currentCount);

		// If we can't afford even one, return 0
		if (currency < actualFirstCost) return 0;

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
		return getMaxAffordable(building.cost, type);
	}


	function getBulkBuyCost(type: BuildingType, amount: number): number {
		const currentCount = gameManager.buildings[type]?.count ?? 0;
		const baseCost = BUILDINGS[type].cost.amount;

		let totalCost = 0;
		for (let i = 0; i < amount; i++) {
			totalCost += baseCost * (BUILDING_COST_MULTIPLIER ** (currentCount + i));
		}

		return Math.round(totalCost);
	}


	$effect(() => {
		// Auto-unlock buildings that are affordable but not yet unlocked
		buildingsEntries
			.filter(([type]) => {
				const isUnlocked = unlockedBuildings.some(([t]) => t === type);
				const isAffordable = !unaffordableRootBuildings.some(([t]) => t === type);
				return !isUnlocked && isAffordable;
			})
			.forEach(([type]) => gameManager.unlockBuilding(type));
	});

	function canAfford(price: Price): boolean {
		return getCurrencyAmount(price) >= price.amount;
	}

	function getCurrencyAmount(price: Price): number {
		if (price.currency === CurrenciesTypes.ATOMS) {
			return gameManager.atoms;
		}
		if (price.currency === CurrenciesTypes.ELECTRONS) {
			return gameManager.electrons;
		}
		if (price.currency === CurrenciesTypes.PHOTONS) {
			return gameManager.photons;
		}
		if (price.currency === CurrenciesTypes.PROTONS) {
			return gameManager.protons;
		}
		return 0;
	}
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
			{@const saveData = gameManager.buildings[type]}
			{@const unaffordable = !affordableBuildings.some(([t]) => t === type)}
			{@const obfuscated = hiddenBuildings.some(([t]) => t === type)}
			{@const hidden = hiddenBuildings.slice(1).some(([t]) => t === type)}
			{@const level = saveData?.level ?? 0}
			{@const color = BUILDING_COLORS[level]}
			{@const purchaseAmount = purchaseAmounts[type]}
			{@const totalCost = getBulkBuyCost(type, purchaseAmount || 1)}
			{@const isAutomated = gameManager.settings.automation.buildings.includes(type)}
			{@const hasAutomation = getUpgradesWithEffects(gameManager.currentUpgradesBought, { type: 'auto_buy', target: type }).length > 0}
			{@const autoPurchasedCount = autoBuyManager.recentlyAutoPurchasedBuildings.get(type) || 0}

			<button
				class="relative text-start bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer p-2 transition-all duration-200 {unaffordable ? 'opacity-50 cursor-not-allowed' : ''}"
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
						<Value value={gameManager.buildingProductions[type] || building.rate * gameManager.globalMultiplier * gameManager.bonusMultiplier} currency="Atoms" postfix="/s" class="text-accent-300"/>
						{#if gameManager.buildingProductions[type]}
							<span class="opacity-60 text-[0.6rem] leading-3">
								<Value value={gameManager.buildingProductions[type] / (saveData?.count ?? 1)} prefix="(" />
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
			</button>
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
