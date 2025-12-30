<script lang="ts">
	import { PHOTON_UPGRADES, getPhotonUpgradeCost, canAffordPhotonUpgrade } from '$data/photonUpgrades';
	import { gameManager } from '$helpers/GameManager.svelte';
	import Value from '@components/ui/Value.svelte';
	import { CurrenciesTypes, type CurrencyName } from '$data/currencies';
	import Currency from '@components/ui/Currency.svelte';

	let selectedCurrency = $state<CurrencyName>(CurrenciesTypes.PHOTONS);

	const availableUpgrades = $derived(Object.values(PHOTON_UPGRADES).filter(upgrade => {
		const currentLevel = gameManager.photonUpgrades[upgrade.id] || 0;
		const hasLevelsRemaining = currentLevel < upgrade.maxLevel;
		const meetsCondition = !upgrade.condition || upgrade.condition(gameManager);
		const matchesCurrency = (upgrade.currency || CurrenciesTypes.PHOTONS) === selectedCurrency;
		return hasLevelsRemaining && meetsCondition && matchesCurrency;
	}));

	const affordableUpgrades = $derived(availableUpgrades.filter(upgrade => {
		const currentLevel = gameManager.photonUpgrades[upgrade.id] || 0;
		return canAffordPhotonUpgrade(upgrade, currentLevel, gameManager);
	}));

	const showExcitedTab = $derived(gameManager.totalExcitedPhotonsEarnedAllTime > 0);
</script>

<div id="photon-upgrades" class="bg-black/10 backdrop-blur-xs rounded-lg p-3 flex flex-col gap-2 h-full">
	<div class="header flex justify-between items-center gap-2">
		<h2 class="text-sm lg:text-base text-realm-400">Photon Upgrades</h2>
	</div>

	<div class="currency-tabs flex gap-1 mb-1">
		<button
			class="currency-tab flex items-center bg-white/5 border-none rounded-lg cursor-pointer p-2 transition-all duration-200 hover:bg-white/10 active:bg-white/15 active:shadow-[0_0_10px_rgba(255,255,255,0.1)]"
			class:active={selectedCurrency === CurrenciesTypes.PHOTONS}
			onclick={() => selectedCurrency = CurrenciesTypes.PHOTONS}
		>
			<Currency name={CurrenciesTypes.PHOTONS} />
		</button>
		{#if showExcitedTab}
			<button
				class="currency-tab flex items-center bg-white/5 border-none rounded-lg cursor-pointer p-2 transition-all duration-200 hover:bg-white/10 active:bg-white/15 active:shadow-[0_0_10px_rgba(255,255,255,0.1)]"
				class:active={selectedCurrency === CurrenciesTypes.EXCITED_PHOTONS}
				onclick={() => selectedCurrency = CurrenciesTypes.EXCITED_PHOTONS}
			>
				<Currency name={CurrenciesTypes.EXCITED_PHOTONS} />
			</button>
		{/if}
	</div>

	<div class="flex-1 overflow-y-auto px-1 custom-scrollbar">
		<div class="grid gap-2">
			{#each availableUpgrades as upgrade (upgrade.id)}
				{@const currentLevel = gameManager.photonUpgrades[upgrade.id] || 0}
				{@const cost = getPhotonUpgradeCost(upgrade, currentLevel)}
				{@const affordable = affordableUpgrades.includes(upgrade)}
				{@const isExcited = selectedCurrency === CurrenciesTypes.EXCITED_PHOTONS}

				<button
					class="upgrade text-start rounded-sm cursor-pointer p-2 transition-all duration-200 {affordable ? '' : 'opacity-50 cursor-not-allowed'} {isExcited ? 'bg-yellow-900/10 hover:bg-yellow-900/20 border border-yellow-500/20 hover:border-yellow-500/40' : 'bg-realm-900/20 hover:bg-realm-900/30 border border-realm-500/20 hover:border-realm-500/40'}"
					onclick={() => {
						if (affordable) gameManager.purchasePhotonUpgrade(upgrade.id);
					}}
				>
					<div class="flex justify-between items-start mb-0.5">
						<h3 class="text-xs font-medium leading-tight {isExcited ? 'text-yellow-300' : 'text-realm-300'}">{upgrade.name}</h3>
						<span class="text-xs px-1 py-0.5 rounded-sm whitespace-nowrap ml-1 {isExcited ? 'text-yellow-400 bg-yellow-800/20' : 'text-realm-400 bg-realm-800/30'}">
							{currentLevel}/{upgrade.maxLevel}
						</span>
					</div>
					<p class="text-xs mb-0.5 leading-tight {isExcited ? 'text-yellow-200/80' : 'text-realm-200/80'}">{upgrade.description(currentLevel + 1)}</p>
					<div class="text-xs {isExcited ? 'text-yellow-300' : 'text-realm-300'}">
						<Value value={cost} currency={selectedCurrency}/>
					</div>
				</button>
			{/each}

			{#if availableUpgrades.length === 0}
				<div class="text-center py-4 text-realm-400/60 text-sm">
					All upgrades maxed out!
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.currency-tab.active {
		background: rgba(255, 255, 255, 0.15);
		box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
	}

	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}

	.custom-scrollbar::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
	}

	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
	}
</style>
