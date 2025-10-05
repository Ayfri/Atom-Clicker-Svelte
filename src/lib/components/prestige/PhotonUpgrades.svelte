<script lang="ts">
	import { PHOTON_UPGRADES, getPhotonUpgradeCost, canAffordPhotonUpgrade } from '$data/photonUpgrades';
	import { gameManager } from '$helpers/gameManager';
	import { photons, photonUpgrades, getCurrentState } from '$stores/gameStore';
	import Value from '@components/ui/Value.svelte';
	import { CurrenciesTypes } from '$data/currencies';

	$: currentState = getCurrentState();
	$: availableUpgrades = Object.values(PHOTON_UPGRADES).filter(upgrade => {
		const currentLevel = $photonUpgrades[upgrade.id] || 0;
		const hasLevelsRemaining = currentLevel < upgrade.maxLevel;
		const meetsCondition = !upgrade.condition || upgrade.condition(currentState);
		return hasLevelsRemaining && meetsCondition;
	});

	$: affordableUpgrades = availableUpgrades.filter(upgrade => {
		const currentLevel = $photonUpgrades[upgrade.id] || 0;
		return canAffordPhotonUpgrade(upgrade, currentLevel, $photons);
	});

	function handleUpgradeClick(upgradeId: string) {
		gameManager.purchasePhotonUpgrade(upgradeId);
	}
</script>

<div id="photon-upgrades" class="bg-black/10 backdrop-blur-xs rounded-lg p-3 flex flex-col gap-2">
	<div class="header flex justify-between items-center gap-2">
		<h2 class="text-sm lg:text-base text-realm-400">Photon Upgrades</h2>
	</div>

	<div class="grid gap-2 overflow-y-auto flex-1">
		{#each availableUpgrades as upgrade (upgrade.id)}
			{@const currentLevel = $photonUpgrades[upgrade.id] || 0}
			{@const cost = getPhotonUpgradeCost(upgrade, currentLevel)}
			{@const affordable = affordableUpgrades.includes(upgrade)}
			<div
				class="upgrade bg-realm-900/20 hover:bg-realm-900/30 border border-realm-500/20 hover:border-realm-500/40 rounded-sm cursor-pointer p-2 transition-all duration-200 {affordable ? '' : 'opacity-50 cursor-not-allowed'}"
				on:click={() => {
					if (affordable) handleUpgradeClick(upgrade.id);
				}}
			>
				<div class="flex justify-between items-start mb-0.5">
					<h3 class="text-realm-300 text-xs font-medium leading-tight">{upgrade.name}</h3>
					<span class="text-realm-400 text-xs bg-realm-800/30 px-1 py-0.5 rounded-sm whitespace-nowrap ml-1">
						{currentLevel}/{upgrade.maxLevel}
					</span>
				</div>
				<p class="text-xs text-realm-200/80 mb-0.5 leading-tight">{upgrade.description(currentLevel + 1)}</p>
				<div class="text-xs text-realm-300">
					<Value value={cost} currency={CurrenciesTypes.PHOTONS}/>
				</div>
			</div>
		{/each}

		{#if availableUpgrades.length === 0}
			<div class="text-center py-4 text-realm-400/60 text-sm">
				All upgrades maxed out!
			</div>
		{/if}
	</div>
</div>
