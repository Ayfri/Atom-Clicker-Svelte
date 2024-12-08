<script lang="ts">
	import {gameManager} from '$helpers/gameManager';
	import {atoms, upgrades} from '$stores/gameStore';
	import {UPGRADES} from '$data/upgrades';
	import {formatNumber} from '$lib/utils';

	$: availableUpgrades = Object.values(UPGRADES).filter(upgrade => {
		const condition = upgrade.condition?.(gameManager.getCurrentState()) ?? true;

		return condition && !$upgrades.includes(upgrade.id);
	}).sort((a, b) => a.cost - b.cost);

	$: visibleUpgrades = availableUpgrades.slice(0, 10);
</script>

<div class="upgrades">
	<h2>Upgrades</h2>
	<div class="upgrade-grid">
		{#each visibleUpgrades as upgrade}
			{@const unaffordable = $atoms < upgrade.cost}
			<div
				class="upgrade"
				class:disabled={unaffordable}
				on:click={() => {if (!unaffordable) gameManager.purchaseUpgrade(upgrade.id)}}
			>
				<h3>{upgrade.name}</h3>
				<p>{upgrade.description}</p>
				<div class="cost">Cost: {formatNumber(upgrade.cost)} atoms</div>
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
		color: #4a90e2;
		font-size: 0.9rem;
		margin-top: 0.5rem;
	}
</style>
