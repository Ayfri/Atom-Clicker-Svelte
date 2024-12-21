<script lang="ts">
	import { setGlobals } from '$lib/globals';
	import { gameManager } from '$helpers/gameManager';
	import { atomsPerSecond } from '$stores/gameStore';
	import { app } from '$stores/pixi';
	import { mobile } from '$stores/window';
	import BonusPhoton from '@components/molecules/BonusPhoton.svelte';
	import Canvas from '@components/molecules/Canvas.svelte';
	import Counter from '@components/molecules/Counter.svelte';
	import Toaster from '@components/molecules/Toaster.svelte';
	import Achievements from '@components/organisms/Achievements.svelte';
	import Atom from '@components/organisms/Atom.svelte';
	import Buildings from '@components/organisms/Buildings.svelte';
	import Levels from '@components/organisms/Levels.svelte';
	import Upgrades from '@components/organisms/Upgrades.svelte';
	import NavBar from '@components/molecules/NavBar.svelte';
	import { RefreshCcw } from 'lucide-svelte';
	import { Ticker } from 'pixi.js';
	import { onDestroy, onMount } from 'svelte';

	const SAVE_INTERVAL = 1000;
	let activeTab: 'achievements' | 'buildings' | 'upgrades' = 'upgrades';
	let saveLoop: number;

	function update(ticker: Ticker) {
		gameManager.addAtoms(($atomsPerSecond * ticker.deltaMS) / 1000);
	}

	onMount(async () => {
		$mobile = window.innerWidth <= 900;
		gameManager.initialize();

		while (!$app || !$app?.ticker) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		$app.ticker.add(update);

		setGlobals();

		// Save game state periodically
		saveLoop = setInterval(() => {
			try {
				gameManager.save();
			} catch (e) {
				console.error('Failed to save game:', e);
			}
		}, SAVE_INTERVAL);
	});

	onDestroy(() => {
		if (saveLoop) clearInterval(saveLoop);
	});

	$: $mobile && activeTab && $app?.stage && $app?.queueResize();

	const isDev = import.meta.env.MODE === 'development';
</script>

<svelte:window
	on:resize={() => {
		$mobile = window.innerWidth <= 900;
	}}
/>

<main>
	{#if isDev}
		<button on:click={() => gameManager.reset()} class="reset-all">
			<RefreshCcw /> Reset All
		</button>
	{/if}

	<NavBar />

	<Levels />
	<Canvas />
	{#if $app !== null}
		<Toaster />
		<BonusPhoton />
		<div class="game-container">
			<div class="left-panel">
				<div class="tabs">
					<button class:active={activeTab === 'upgrades'} on:click={() => (activeTab = 'upgrades')}> Upgrades</button>
					<button class:active={activeTab === 'achievements'} on:click={() => (activeTab = 'achievements')}>
						Achievements
					</button>
				</div>
				<div class="tab-content">
					{#if activeTab === 'upgrades'}
						<Upgrades />
					{:else if activeTab === 'achievements'}
						<Achievements />
					{:else if activeTab === 'buildings'}
						<Buildings />
					{/if}
				</div>
			</div>
			<div class="central-area">
				<Counter />
				<Atom />
			</div>
			{#if !$mobile}
				<Buildings />
			{/if}
		</div>
	{/if}
</main>

<style>
	main {
		margin-bottom: 3rem;
		margin-top: 3rem;

		@media screen and (width <= 900px) {
			margin: 2rem 0 0;
		}
	}

	.reset-all {
		align-items: center;
		color: #ff6b6b;
		display: flex;
		font-weight: bolder;
		gap: 0.5rem;
		left: 8rem;
		padding: 0.5rem;
		position: fixed;
		text-transform: uppercase;
		top: 1rem;
		z-index: 10;

		@media screen and (width <= 900px) {
			left: 1rem;
			top: 3rem;
		}
	}

	.game-container {
		display: grid;
		gap: 2rem;
		grid-template-areas: 'upgrades atom buildings';
		grid-template-columns: 250px 1fr 250px;
		margin: 0 auto;
		max-width: 1400px;
		padding: 1rem;

		@media screen and (900px <= width <= 1536px) {
			grid-template-columns: 200px 300px 200px;
			margin: 0 minmax(5rem, auto);
			max-width: 900px;
			padding-left: 4rem;
		}

		@media screen and (width <= 900px) {
			gap: 0;
			grid-template-areas:
				'upgrades atom'
				'buildings atom';
			grid-template-columns: 1fr 1fr;
			max-width: 100%;
		}

		@media screen and (width <= 700px) {
			gap: 1rem;
			grid-template-areas: 'atom' 'upgrades' 'buildings';
			grid-template-columns: 1fr;
		}
	}

	.left-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		grid-area: upgrades;
		z-index: 1;
	}

	.tabs {
		display: grid;
		gap: 0.5rem;
		grid-auto-flow: column;
	}

	.tabs button {
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(3px);
		border: none;
		border-radius: 8px;
		color: inherit;
		cursor: pointer;
		padding: 0.5rem;
		transition: all 0.2s;
		white-space: nowrap;
		width: 100%;
	}

	.tabs button:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.tabs button.active {
		background: var(--accent-color);
		color: white;
	}

	.central-area {
		align-items: center;
		display: flex;
		flex-direction: column;
		grid-area: atom;
		justify-content: start;
		position: relative;
	}

	.tab-content {
		flex: 1;
		overflow-y: auto;
	}
</style>
