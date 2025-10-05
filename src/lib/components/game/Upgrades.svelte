<script lang="ts">
	import {CURRENCIES, CurrenciesTypes, type CurrencyName} from '$data/currencies';
	import { gameManager } from '$helpers/gameManager';
	import { getCurrentState } from '$stores/gameStore';
	import { currentUpgradesBought, protons, electrons, upgrades, totalProtonises, settings, atoms } from '$stores/gameStore';
	import { UPGRADES } from '$data/upgrades';
	import type { Upgrade } from '$lib/types';
	import AutoButton from '@components/ui/AutoButton.svelte';
	import Currency from '@components/ui/Currency.svelte';
	import Value from '@components/ui/Value.svelte';
	import { getUpgradesWithEffects } from '$helpers/effects';

	let availableUpgrades: Upgrade[] = [];
	let selectedCurrency: CurrencyName = CurrenciesTypes.ATOMS;

	$: showProtons = $protons > 0 || $totalProtonises > 0;
	$: showElectrons = $electrons > 0;

	$: if ($upgrades && ($atoms || $electrons || $protons || true)) {
		const currentState = getCurrentState();
		availableUpgrades = Object.values(UPGRADES)
			.filter((upgrade) => {
				const condition = upgrade.condition?.(currentState) ?? true;
				const notPurchased = !$upgrades.includes(upgrade.id);
				const matchesCurrency = upgrade.cost.currency === selectedCurrency;
				return condition && notPurchased && matchesCurrency;
			})
			.sort((a, b) => a.cost.amount - b.cost.amount);
	}

	$: affordableUpgrades = availableUpgrades.filter((upgrade) => gameManager.canAfford(upgrade.cost));
	$: hasAutomation = getUpgradesWithEffects($currentUpgradesBought, { type: 'auto_upgrade' }).length > 0;
</script>

<div id="upgrades" class="bg-black/10 backdrop-blur-xs rounded-lg p-3 flex flex-col gap-2">
	<div class="header flex justify-between items-center gap-2">
		<div class="flex items-center gap-2 justify-between w-full">
			<h2 class="text-lg">Upgrades</h2>
			{#if hasAutomation}
				<AutoButton
					onClick={() => gameManager.toggleUpgradeAutomation()}
					toggled={$settings.automation.upgrades}
				/>
			{/if}
		</div>
	</div>

	<div class="currency-tabs flex gap-[0.35rem]">
		<button
			class="currency-tab"
			class:active={selectedCurrency === CurrenciesTypes.ATOMS}
			on:click={() => selectedCurrency = CurrenciesTypes.ATOMS}
		>
			<Currency name={CurrenciesTypes.ATOMS} />
		</button>
		{#if showProtons}
			<button
				class="currency-tab"
				class:active={selectedCurrency === CurrenciesTypes.PROTONS}
				on:click={() => selectedCurrency = CurrenciesTypes.PROTONS}
			>
				<Currency name={CurrenciesTypes.PROTONS} />
			</button>
		{/if}
		{#if showElectrons}
			<button
				class="currency-tab"
				class:active={selectedCurrency === CurrenciesTypes.ELECTRONS}
				on:click={() => selectedCurrency = CurrenciesTypes.ELECTRONS}
			>
				<Currency name={CurrenciesTypes.ELECTRONS} />
			</button>
		{/if}
	</div>

	<div class="grid gap-1.5">
		{#each availableUpgrades.slice(0, 10) as upgrade (upgrade.id)}
			{@const affordable = affordableUpgrades.includes(upgrade)}
			<div
				class="upgrade bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer p-2 transition-all duration-200 {affordable ? '' : 'opacity-50 cursor-not-allowed'}"
				on:click={() => {
					if (affordable) gameManager.purchaseUpgrade(upgrade.id);
				}}
			>
				<h3 class="text-blue-400 text-sm">{upgrade.name}</h3>
				<p class="text-xs my-0.5">{upgrade.description}</p>
				<div class="text-xs mt-1" style="color: {CURRENCIES[upgrade.cost.currency].color}">
					Cost: <Value value={upgrade.cost.amount} currency={upgrade.cost.currency}/>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.currency-tab {
		align-items: center;
		background: rgba(255, 255, 255, 0.05);
		border: none;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		padding: 0.5rem;
		transition: all 0.2s;

		& img {
			width: 1rem;
			height: 1rem;
		}
	}

	@media (width <= 1538px) {
		.currency-tab {
			padding: 0.35rem;
		}
	}

	.currency-tab:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.currency-tab.active {
		background: rgba(255, 255, 255, 0.15);
		box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
	}
</style>
