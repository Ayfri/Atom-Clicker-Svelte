<script lang="ts">
	import {gameManager} from '$helpers/gameManager';
	import {setGlobals} from '$lib/globals';
	import {supabaseAuth} from '$lib/stores/supabaseAuth';
	import {atomsPerSecond, upgrades} from '$stores/gameStore';
	import {app} from '$stores/pixi';
	import {mobile} from '$stores/window';
	import BonusPhoton from '@components/molecules/BonusPhoton.svelte';
	import Canvas from '@components/molecules/Canvas.svelte';
	import Counter from '@components/molecules/Counter.svelte';
	import NavBar from '@components/molecules/NavBar.svelte';
	import Toaster from '@components/molecules/Toaster.svelte';
	import Achievements from '@components/organisms/Achievements.svelte';
	import Atom from '@components/organisms/Atom.svelte';
	import Buildings from '@components/organisms/Buildings.svelte';
	import HardReset from '@components/organisms/HardReset.svelte';
	import Levels from '@components/organisms/Levels.svelte';
	import Upgrades from '@components/organisms/Upgrades.svelte';
	import {RotateCcw} from 'lucide-svelte';
	import {onDestroy, onMount} from 'svelte';
	import '$lib/stores/autoBuy';
	import '$lib/stores/autoUpgrade';

	const SAVE_INTERVAL = 1000;
	let activeTab: 'achievements' | 'buildings' | 'upgrades' = 'upgrades';
	let saveLoop: ReturnType<typeof setInterval>;
	let showHardReset = false;

	function update(ticker: any) {
		gameManager.addAtoms(($atomsPerSecond * ticker.deltaMS) / 1000);
	}

	onMount(async () => {
		$mobile = window.innerWidth <= 900;
		gameManager.initialize();
		await supabaseAuth.init();

		while (!$app || !$app?.ticker) {
			await new Promise(resolve => setTimeout(resolve, 100));
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
</script>

<svelte:window
	on:resize={() => {
    $mobile = window.innerWidth <= 900
  }}
/>

<main class="relative py-12 lg:pb-4">
	<button
		class="fixed right-4 top-4 z-40 flex gap-2 py-1.5 px-3 items-center justify-center rounded-lg bg-red-900/30 text-white transition-colors hover:bg-red-900/50"
		on:click={() => showHardReset = true}
		title="Hard Reset"
	>
		<RotateCcw class="size-5" />
		Reset
	</button>

	<NavBar/>

	{#if $upgrades.includes('feature_levels')}
		<Levels/>
	{/if}
	<Canvas/>
	{#if $app !== null}
		<Toaster/>
		<BonusPhoton/>
		<div class="game-container">
			<div class="left-panel">
				<div class="tabs">
					<button class:active={activeTab === 'upgrades'} on:click={() => activeTab = 'upgrades'}> Upgrades</button>
					{#if $mobile}
						<button class:active={activeTab === 'buildings'} on:click={() => activeTab = 'buildings'}> Buildings</button>
					{/if}
					<button class:active={activeTab === 'achievements'} on:click={() => activeTab = 'achievements'}>
						Achievements
					</button>
				</div>
				<div class="tab-content">
					{#if activeTab === 'upgrades'}
						<Upgrades/>
					{:else if activeTab === 'achievements'}
						<Achievements/>
					{:else if activeTab === 'buildings'}
						<Buildings/>
					{/if}
				</div>
			</div>
			<div class="central-area">
				<Counter/>
				<Atom/>
			</div>
			{#if !$mobile}
				<Buildings/>
			{/if}
		</div>
	{/if}

	{#if showHardReset}
		<HardReset onClose={() => showHardReset = false} />
	{/if}
</main>

<style>
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
			max-width: 100vw;
			overflow-x: hidden;
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
