<script lang="ts">
	import {Network} from 'lucide-svelte';
	import NotificationDot from '@components/atoms/NotificationDot.svelte';
	import { mobile } from '$stores/window';
	import {skillPointsAvailable} from '$stores/gameStore';
	import {gameManager} from '$helpers/gameManager';
	import {BUILDING_COLORS, type BuildingData, BUILDINGS, type BuildingType} from '$data/buildings';
	import {buildingProductions, atoms, buildings, globalMultiplier, bonusMultiplier} from '$stores/gameStore';
	import type {Building} from '$lib/types';
	import {formatNumber} from '$lib/utils';
	import {fade} from 'svelte/transition';

	const buildingsEntries = Object.entries(BUILDINGS) as [BuildingType, BuildingData][];

	$: unaffordableBuildings = buildingsEntries.filter(([type, building]) => $atoms < ($buildings[type]?.cost ?? building.cost));
	$: unlockedBuildings = Object.entries($buildings).filter(([,{unlocked}]) => unlocked) as [BuildingType, Building][];
	$: hiddenBuildings = buildingsEntries.filter(([type]) => unlockedBuildings.map(u => u[0]).indexOf(type) === -1 && unaffordableBuildings.map(u => u[0]).indexOf(type) !== -1);

	$: buildingsEntries.filter(([type]) => unlockedBuildings.map(u => u[0]).indexOf(type) === -1 && unaffordableBuildings.map(u => u[0]).indexOf(type) === -1).forEach(([type]) => {
		gameManager.unlockBuilding(type);
	});
</script>

<div class="buildings">
	<h2>Buildings</h2>
	{#each buildingsEntries as [type, building], i}
		{@const saveData = $buildings[type]}
		{@const unaffordable = $atoms < (saveData?.cost ?? building.cost)}
		{@const obfuscated = hiddenBuildings.some(([t]) => t === type)}
		{@const hidden = hiddenBuildings.slice(1).some(([t]) => t === type)}
		{@const level = saveData?.level ?? 0}
		{@const color = BUILDING_COLORS[level]}

		<div
			class="building"
			style="--color: {color};"
			class:disabled={unaffordable}
			on:click={() => {if (!unaffordable) gameManager.purchaseBuilding(type)}}
			transition:fade
			{hidden}
		>
			<div class="info">
				<h3>
					{obfuscated ? '???' : building.name} {saveData?.count ? `(${saveData.count})` : ''}
					{#if level > 0}
						<span>⇮{level}</span>
					{/if}
				</h3>
				<p>{saveData && saveData.count > 0 ? 'Producing' : 'Will produce'}: {formatNumber($buildingProductions[type] || building.rate * $globalMultiplier * $bonusMultiplier)} atoms/s</p>
			</div>
			<div class="cost">
				Cost: {formatNumber(saveData?.cost ?? building.cost)} atoms
			</div>
		</div>
	{/each}
</div>

<style>
	.buildings {
		background: rgba(0, 0, 0, 0.1);
		backdrop-filter: blur(3px);
		border-radius: 8px;
		padding: 1rem;
		grid-area: buildings;
	}

	.building {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		cursor: pointer;
		margin-top: 0.5rem;
		padding: 0.75rem;
		transition: all 0.2s;

		&.disabled {
			cursor: not-allowed;
			opacity: 0.5;
		}

		&:hover:not(.disabled) {
			background: rgba(255, 255, 255, 0.1);
		}
	}

	:global(.skill-tree-icon) {
		cursor: pointer;
		float: right;
	}

	.info h3 {
		color: var(--color);
		font-size: 1rem;
		margin: 0;
	}

	.info p {
		font-size: 0.8rem;
		margin: 0.25rem 0;
	}

	.cost {
		color: var(--color);
		font-size: 0.9rem;
		margin-top: 0.5rem;
	}
</style>
