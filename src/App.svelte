<script lang="ts">
	import {Ticker} from "pixi.js";
	import NotificationDot from './lib/components/NotificationDot.svelte';
	import {onDestroy, onMount} from "svelte";
	import Achievements from "./lib/components/Achievements.svelte";
	import Analytics from "./lib/components/Analytics.svelte";
	import Atom from "./lib/components/Atom.svelte";
	import BonusPhoton from "./lib/components/BonusPhoton.svelte";
	import Buildings from "./lib/components/Buildings.svelte";
	import Canvas from "./lib/components/Canvas.svelte";
	import Counter from "./lib/components/Counter.svelte";
	import Header from "./lib/components/Header.svelte";
	import SEO from "./lib/components/SEO.svelte";
	import SkillTree from "./lib/components/SkillTree.svelte";
	import Toaster from "./lib/components/Toaster.svelte";
	import Upgrades from "./lib/components/Upgrades.svelte";
	import {setGlobals} from "./lib/globals";
	import {gameManager} from "./lib/helpers/gameManager";
	import {atomsPerSecond, skillPointsAvailable} from "./lib/stores/gameStore";
	import {app} from "./lib/stores/pixi";
	import {mobile} from './lib/stores/window';

	const SAVE_INTERVAL = 1000;
	let activeTab: "achievements" | "buildings" | "upgrades" = "upgrades";
	let saveLoop: number;
	let showSkillTree = false;

	function update(ticker: Ticker) {
		gameManager.addAtoms(($atomsPerSecond * ticker.deltaMS) / 1000);
	}

	onMount(async () => {
		$mobile = window.innerWidth <= 900;
		gameManager.initialize();

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
				console.error("Failed to save game:", e);
			}
		}, SAVE_INTERVAL);
	});

	onDestroy(() => {
		if (saveLoop) clearInterval(saveLoop);
	});

	$: $mobile && activeTab && $app?.stage && $app?.queueResize();
</script>

<svelte:window on:resize={() => {
	$mobile = window.innerWidth <= 900;
}}/>

<Analytics/>
<svelte:head>
	<SEO/>
</svelte:head>

<Header/>
<main>
	<Canvas/>
	{#if $app === null}
		<h1 class="loading">Loading...</h1>
	{:else}
		<Toaster/>
		<BonusPhoton/>
		<div class="game-container">
			<div class="left-panel">
				<div class="tabs">
					<button
						class:active={activeTab === "upgrades"}
						on:click={() => activeTab = "upgrades"}
					>
						Upgrades
					</button>
					<button
						class:active={activeTab === "achievements"}
						on:click={() => activeTab = "achievements"}
					>
						Achievements
					</button>
					{#if $mobile}
						<button
							class:active={activeTab === "buildings"}
							on:click={() => activeTab = "buildings"}
						>
							Buildings
						</button>
						<NotificationDot hasNotification={$skillPointsAvailable > 0} style="flex: 1">
							<button on:click={() => showSkillTree = true}>
								Skill Tree
							</button>
						</NotificationDot>
					{/if}
				</div>
				<div class="tab-content">
					{#if activeTab === "upgrades"}
						<Upgrades/>
					{:else if activeTab === "achievements"}
						<Achievements/>
					{:else if activeTab === "buildings"}
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
	{#if showSkillTree}
		<SkillTree onClose={() => showSkillTree = false}/>
	{/if}
</main>

<style>
	main {
		margin-bottom: 3rem;

		@media screen and (width <= 900px) {
			margin: 0;
		}
	}

	.loading {
		color: white;
		font-size: 3rem;
		text-align: center;
		margin-top: 20vh;
	}

	.game-container {
		display: grid;
		gap: 2rem;
		grid-template-columns: 250px 1fr 250px;
		grid-template-areas: "upgrades atom buildings";
		margin: 0 auto;
		max-width: 1500px;
		overflow: hidden;
		padding: 1rem;

		@media screen and (width <= 900px) {
			gap: 0;
			grid-template-columns: 1fr 1fr;
			grid-template-areas:
        "upgrades atom"
        "buildings atom";
			max-width: 100%;
		}

		@media screen and (width <= 700px) {
			gap: 1rem;
			grid-template-columns: 1fr;
			grid-template-areas: "atom" "upgrades" "buildings";
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
		width: 100%;
		white-space: nowrap;
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
		justify-content: start;
		position: relative;
		grid-area: atom;
	}

	.tab-content {
		flex: 1;
		overflow-y: auto;
	}
</style>
