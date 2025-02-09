<script lang="ts">
	import {CURRENCIES, CurrenciesTypes, type CurrencyName} from '$data/currencies';
	import { currentState, gameManager } from '$helpers/gameManager';
	import { atoms, protons, electrons, upgrades, buildings, achievements, totalProtonises } from '$stores/gameStore';
	import { UPGRADES } from '$data/upgrades';
	import { formatNumber } from '$lib/utils';
	import type { Upgrade } from '$lib/types';
	import Value from '@components/atoms/Value.svelte';
	import Currency from '@components/atoms/Currency.svelte';

	let availableUpgrades: Upgrade[] = [];
	let selectedCurrency: CurrencyName = CurrenciesTypes.ATOMS;

	$: showProtons = $protons > 0 || $totalProtonises > 0;
	$: showElectrons = $electrons > 0;

	$: if ($currentState) {
		availableUpgrades = Object.values(UPGRADES)
			.filter((upgrade) => {
				const condition = upgrade.condition?.($currentState) ?? true;
				const notPurchased = !$upgrades.includes(upgrade.id);
				const matchesCurrency = upgrade.cost.currency === selectedCurrency;
				return condition && notPurchased && matchesCurrency;
			})
			.sort((a, b) => a.cost.amount - b.cost.amount);
	}

	$: affordableUpgrades = availableUpgrades.filter((upgrade) => gameManager.canAfford(upgrade.cost));
</script>

<div class="upgrades">
	<div class="header">
		<h2>Upgrades</h2>
		<div class="currency-tabs">
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
	</div>
	<div class="upgrade-grid">
		{#each availableUpgrades.slice(0, 10) as upgrade (upgrade.id)}
			{@const affordable = affordableUpgrades.includes(upgrade)}
			<div
				class="upgrade"
				class:disabled={!affordable}
				on:click={() => {
					if (affordable) gameManager.purchaseUpgrade(upgrade.id);
				}}
			>
				<h3>{upgrade.name}</h3>
				<p>{upgrade.description}</p>
				<div class="cost" style="color: {CURRENCIES[upgrade.cost.currency].color}">
					Cost: <Value value={upgrade.cost.amount} currency={upgrade.cost.currency}/>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.upgrades {
		background: rgba(0, 0, 0, 0.1);
		backdrop-filter: blur(3px);
		border-radius: 8px;
		padding: 1rem;
	}

	.upgrade-grid {
		display: grid;
		gap: 1rem;
		margin-top: 1rem;
	}

	.upgrade {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		cursor: pointer;
		padding: 0.75rem;
		transition: all 0.2s;
	}

	.upgrade:hover:not(.disabled) {
		background: rgba(255, 255, 255, 0.1);
	}

	.upgrade.disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.upgrade h3 {
		color: #4a90e2;
		font-size: 1rem;
		margin: 0;
	}

	.upgrade p {
		font-size: 0.8rem;
		margin: 0.25rem 0;
	}

	.cost {
		font-size: 0.9rem;
		margin-top: 0.5rem;
	}

	.header {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
	}

	.currency-tabs {
		display: flex;
		gap: 0.35rem;
	}

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
