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
	import { recentlyAutoPurchased } from '$stores/autoUpgrade';
	import { fly, scale } from 'svelte/transition';

	let availableUpgrades: Upgrade[] = [];
	let selectedCurrency: CurrencyName = CurrenciesTypes.ATOMS;

	// Show proton upgrades if player has protons, has protonised before, or has purchased any proton upgrade
	$: hasProtonUpgrades = $upgrades.some(id => id.startsWith('proton'));
	$: showProtons = $protons > 0 || $totalProtonises > 0 || hasProtonUpgrades;
	
	// Show electron upgrades if player has electrons or has purchased any electron upgrade
	$: hasElectronUpgrades = $upgrades.some(id => id.startsWith('electron'));
	$: showElectrons = $electrons > 0 || hasElectronUpgrades;

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
					onClick={(e) => {
						e.stopPropagation();
						gameManager.toggleUpgradeAutomation();
					}}
					toggled={$settings.automation.upgrades}
				/>
			{/if}
		</div>
	</div>

	<div class="currency-tabs flex gap-1">
		<button
			class="currency-tab flex items-center bg-white/5 border-none rounded-lg cursor-pointer p-2 transition-all duration-200 hover:bg-white/10 active:bg-white/[0.15] active:shadow-[0_0_10px_rgba(255,255,255,0.1)] xl:p-2 lg:p-1.5"
			class:active={selectedCurrency === CurrenciesTypes.ATOMS}
			on:click={() => selectedCurrency = CurrenciesTypes.ATOMS}
		>
			<Currency name={CurrenciesTypes.ATOMS} />
		</button>
		{#if showProtons}
			<button
				class="currency-tab flex items-center bg-white/5 border-none rounded-lg cursor-pointer p-2 transition-all duration-200 hover:bg-white/10 active:bg-white/[0.15] active:shadow-[0_0_10px_rgba(255,255,255,0.1)] xl:p-2 lg:p-1.5"
				class:active={selectedCurrency === CurrenciesTypes.PROTONS}
				on:click={() => selectedCurrency = CurrenciesTypes.PROTONS}
			>
				<Currency name={CurrenciesTypes.PROTONS} />
			</button>
		{/if}
		{#if showElectrons}
			<button
				class="currency-tab flex items-center bg-white/5 border-none rounded-lg cursor-pointer p-2 transition-all duration-200 hover:bg-white/10 active:bg-white/[0.15] active:shadow-[0_0_10px_rgba(255,255,255,0.1)] xl:p-2 lg:p-1.5"
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
			{@const wasAutoPurchased = $recentlyAutoPurchased.has(upgrade.id)}
			<div
				class="relative bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer p-2 transition-all duration-200 {affordable ? '' : 'opacity-50 cursor-not-allowed'}"
				on:click={() => {
					if (affordable) gameManager.purchaseUpgrade(upgrade.id);
				}}
			>
				{#if wasAutoPurchased}
					<div
						class="absolute top-1 right-1 bg-gradient-to-br from-green-500 to-green-700 text-white font-bold text-xs px-1.5 py-0.5 rounded shadow-lg shadow-green-500/40 z-10 pointer-events-none"
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
			</div>
		{/each}
	</div>
</div>

