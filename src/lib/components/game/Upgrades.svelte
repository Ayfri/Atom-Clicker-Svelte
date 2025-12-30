<script lang="ts">
	import {CURRENCIES, CurrenciesTypes, type CurrencyName} from '$data/currencies';
	import { gameManager } from '$helpers/GameManager.svelte';
	import { UPGRADES } from '$data/upgrades';
	import type { Upgrade } from '$lib/types';
	import AutoButton from '@components/ui/AutoButton.svelte';
	import Currency from '@components/ui/Currency.svelte';
	import Value from '@components/ui/Value.svelte';
	import { getUpgradesWithEffects } from '$helpers/effects';
	import { autoUpgradeManager } from '$stores/autoUpgrade.svelte';
	import { fly, scale } from 'svelte/transition';

	let selectedCurrency: CurrencyName = $state(CurrenciesTypes.ATOMS);

	// Show proton upgrades if player has protons, has protonised before, or has purchased any proton upgrade
	const hasProtonUpgrades = $derived(gameManager.upgrades.some(id => id.startsWith('proton')));
	const showProtons = $derived(gameManager.protons > 0 || gameManager.totalProtonisesAllTime > 0 || hasProtonUpgrades);

	// Show electron upgrades if player has electrons or has purchased any electron upgrade
	const hasElectronUpgrades = $derived(gameManager.upgrades.some(id => id.startsWith('electron')));
	const showElectrons = $derived(gameManager.electrons > 0 || gameManager.totalElectronizesAllTime > 0 || hasElectronUpgrades);

	const boughtUpgrades = $derived(new Set(gameManager.upgrades));

	const availableUpgrades = $derived.by(() => {
		return Object.values(UPGRADES)
			.filter((upgrade) => {
				const condition = upgrade.condition?.(gameManager) ?? true;
				const notPurchased = !boughtUpgrades.has(upgrade.id);
				const matchesCurrency = upgrade.cost.currency === selectedCurrency;
				return condition && notPurchased && matchesCurrency;
			})
			.sort((a, b) => a.cost.amount - b.cost.amount);
	});

	let hasAutomation = $derived(getUpgradesWithEffects(gameManager.currentUpgradesBought, { type: 'auto_upgrade' }).length > 0);
</script>

<div id="upgrades" class="bg-black/10 backdrop-blur-xs rounded-lg p-3 flex flex-col gap-2">
	<div class="header flex justify-between items-center gap-2">
		<div class="flex items-center gap-2 justify-between w-full">
			<h2 class="text-lg">Upgrades</h2>
			{#if hasAutomation}
				<AutoButton
					onClick={(e) => {
						e.stopPropagation();
						gameManager.toggleUpgradeAutomation();
					}}
					toggled={gameManager.settings.automation.upgrades}
				/>
			{/if}
		</div>
	</div>

	<div class="currency-tabs flex gap-1">
		<button
			class="currency-tab flex items-center bg-white/5 border-none rounded-lg cursor-pointer p-2 transition-all duration-200 hover:bg-white/10 active:bg-white/15 active:shadow-[0_0_10px_rgba(255,255,255,0.1)] xl:p-2 lg:p-1.5"
			class:active={selectedCurrency === CurrenciesTypes.ATOMS}
			onclick={() => selectedCurrency = CurrenciesTypes.ATOMS}
		>
			<Currency name={CurrenciesTypes.ATOMS} />
		</button>
		{#if showProtons}
			<button
				class="currency-tab flex items-center bg-white/5 border-none rounded-lg cursor-pointer p-2 transition-all duration-200 hover:bg-white/10 active:bg-white/15 active:shadow-[0_0_10px_rgba(255,255,255,0.1)] xl:p-2 lg:p-1.5"
				class:active={selectedCurrency === CurrenciesTypes.PROTONS}
				onclick={() => selectedCurrency = CurrenciesTypes.PROTONS}
			>
				<Currency name={CurrenciesTypes.PROTONS} />
			</button>
		{/if}
		{#if showElectrons}
			<button
				class="currency-tab flex items-center bg-white/5 border-none rounded-lg cursor-pointer p-2 transition-all duration-200 hover:bg-white/10 active:bg-white/15 active:shadow-[0_0_10px_rgba(255,255,255,0.1)] xl:p-2 lg:p-1.5"
				class:active={selectedCurrency === CurrenciesTypes.ELECTRONS}
				onclick={() => selectedCurrency = CurrenciesTypes.ELECTRONS}
			>
				<Currency name={CurrenciesTypes.ELECTRONS} />
			</button>
		{/if}
	</div>

	<div class="grid gap-1.5">
		{#each availableUpgrades.slice(0, 10) as upgrade (upgrade.id)}
			{@const affordable = gameManager.canAfford(upgrade.cost)}
			{@const wasAutoPurchased = autoUpgradeManager.recentlyAutoPurchased.has(upgrade.id)}
			<button
				class="relative text-start bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer p-2 transition-all duration-200 {affordable ? '' : 'opacity-50 cursor-not-allowed'}"
				onclick={() => {
					if (affordable) gameManager.purchaseUpgrade(upgrade.id);
				}}
			>
				{#if wasAutoPurchased}
					<div
						class="absolute top-1 right-1 bg-linear-to-br from-green-500 to-green-700 text-white font-bold text-xs px-1.5 py-0.5 rounded shadow-lg shadow-green-500/40 z-10 pointer-events-none"
						in:scale={{ duration: 200, start: 0.3 }}
						out:fly={{ y: -30, duration: 500, opacity: 0 }}
					>
						+1
					</div>
				{/if}
				<h3 class="text-blue-400 text-sm">{upgrade.name}</h3>
				<p class="text-xs my-0.5">{upgrade.description}</p>
				<div class="text-xs mt-1" style="color: {CURRENCIES[upgrade.cost.currency].color}">
					Cost: <Value value={upgrade.cost.amount} currency={upgrade.cost.currency}/>
				</div>
			</button>
		{/each}
	</div>
</div>
