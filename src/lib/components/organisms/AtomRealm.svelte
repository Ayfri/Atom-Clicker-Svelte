<script lang="ts">
	import BonusPhoton from '@components/molecules/BonusPhoton.svelte';
	import Canvas from '@components/molecules/Canvas.svelte';
	import Counter from '@components/molecules/Counter.svelte';
	import Achievements from '@components/organisms/Achievements.svelte';
	import Atom from '@components/organisms/Atom.svelte';
	import Buildings from '@components/organisms/Buildings.svelte';
	import Upgrades from '@components/organisms/Upgrades.svelte';
	import { app } from '$stores/pixi';
	import { mobile } from '$stores/window';

	let activeTab: 'achievements' | 'buildings' | 'upgrades' = 'upgrades';

	$: $mobile && activeTab && $app?.queueResize?.();
</script>

<div class="absolute inset-0 pt-12 lg:pt-4 transition-all duration-1000 ease-in-out">
	<Canvas />
	<BonusPhoton />
	<div class="game-container">
		<div class="left-panel">
			<div class="tabs">
				<button
					class="backdrop-blur-sm rounded-lg p-2 transition-all duration-200 whitespace-nowrap w-full border-none text-inherit cursor-pointer {activeTab ===
					'upgrades'
						? 'bg-[var(--accent-color)] text-white'
						: 'bg-white/5 hover:bg-white/10'}"
					on:click={() => (activeTab = 'upgrades')}>Upgrades</button
				>
				{#if $mobile}
					<button
						class="backdrop-blur-sm rounded-lg p-2 transition-all duration-200 whitespace-nowrap w-full border-none text-inherit cursor-pointer {activeTab ===
						'buildings'
							? 'bg-[var(--accent-color)] text-white'
							: 'bg-white/5 hover:bg-white/10'}"
						on:click={() => (activeTab = 'buildings')}>Buildings</button
					>
				{/if}
				<button
					class="backdrop-blur-sm rounded-lg p-2 transition-all duration-200 whitespace-nowrap w-full border-none text-inherit cursor-pointer {activeTab ===
					'achievements'
						? 'bg-[var(--accent-color)] text-white'
						: 'bg-white/5 hover:bg-white/10'}"
					on:click={() => (activeTab = 'achievements')}
				>
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
			<div class="right-panel">
				<Buildings />
			</div>
		{/if}
	</div>
</div>

<style lang="postcss">
	.game-container {
		display: grid;
		gap: 2rem;
		grid-template-areas: 'upgrades atom buildings';
		grid-template-columns: 250px 1fr 250px;
		margin: 0 auto;
		max-width: 1400px;
		padding: 1rem;
	}

	@media screen and (900px <= width <= 1536px) {
		.game-container {
			grid-template-columns: 200px 300px 200px;
			margin: 0 minmax(5rem, auto);
			max-width: 900px;
			padding-left: 4rem;
		}
	}

	@media screen and (width <= 900px) {
		.game-container {
			gap: 0;
			grid-template-areas:
				'upgrades atom'
				'buildings atom';
			grid-template-columns: 1fr 1fr;
			max-width: 100vw;
			overflow-x: hidden;
		}
	}

	@media screen and (width <= 700px) {
		.game-container {
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
		z-index: 10;
	}

	.right-panel {
		grid-area: buildings;
	}

	.tabs {
		display: grid;
		gap: 0.5rem;
		grid-auto-flow: column;
	}

	.central-area {
		align-items: center;
		display: flex;
		flex-direction: column;
		grid-area: atom;
		justify-content: start;
		position: relative;
		z-index: 0;
	}

	.tab-content {
		flex: 1;
		overflow-y: auto;
	}
</style>
