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

<div class="relative pt-12 lg:pt-4 transition-all duration-1000 ease-in-out {$mobile ? 'min-h-screen pb-8' : ''}">
	<Canvas />
	<BonusPhoton />

	<div class="game-container grid gap-8 mx-auto p-8">
		<div class="left-panel flex flex-col gap-4 z-10">
			<div class="grid grid-flow-col gap-2">
				<button
					class="backdrop-blur-xs rounded-lg p-2 transition-all duration-200 whitespace-nowrap w-full border-none text-inherit cursor-pointer {activeTab ===
					'upgrades'
						? 'bg-accent-400 text-white'
						: 'bg-white/5 hover:bg-white/10'}"
					on:click={() => (activeTab = 'upgrades')}>Upgrades</button
				>
				{#if $mobile}
					<button
						class="backdrop-blur-xs rounded-lg p-2 transition-all duration-200 whitespace-nowrap w-full border-none text-inherit cursor-pointer {activeTab ===
						'buildings'
							? 'bg-accent-400 text-white'
							: 'bg-white/5 hover:bg-white/10'}"
						on:click={() => (activeTab = 'buildings')}>Buildings</button
					>
				{/if}
				<button
					class="backdrop-blur-xs rounded-lg p-2 transition-all duration-200 whitespace-nowrap w-full border-none text-inherit cursor-pointer {activeTab ===
					'achievements'
						? 'bg-accent-400 text-white'
						: 'bg-white/5 hover:bg-white/10'}"
					on:click={() => (activeTab = 'achievements')}
				>
					Achievements
				</button>
			</div>
			<div class="flex-1 {$mobile ? 'max-h-[60vh]' : ''} overflow-y-auto">
				{#if activeTab === 'upgrades'}
					<Upgrades />
				{:else if activeTab === 'achievements'}
					<Achievements />
				{:else if activeTab === 'buildings'}
					<Buildings />
				{/if}
			</div>
		</div>
		<div class="central-area relative z-0 flex flex-col items-center justify-start">
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

<style>
	.game-container {
		grid-template-areas: 'upgrades atom buildings';
		grid-template-columns: 300px 1fr 300px;
		max-width: 1400px;
	}

	@media screen and (900px <= width <= 1536px) {
		.game-container {
			grid-template-columns: 250px 300px 250px;
			margin: 0 minmax(5rem, auto);
			max-width: 1000px;
			padding-left: 4rem;
		}
	}

	@media screen and (width <= 900px) {
		.game-container {
			gap: 1rem;
			grid-template-areas: 'atom' 'upgrades' 'buildings';
			grid-template-columns: 1fr;
			max-width: 100vw;
			overflow-x: hidden;
		}
	}

	@media screen and (width <= 700px) {
		.game-container {
			gap: 1rem;
			grid-template-areas: 'atom' 'upgrades' 'buildings';
			grid-template-columns: 1fr;
			overflow-x: hidden;
		}
	}

	.left-panel {
		grid-area: upgrades;
	}

	.right-panel {
		grid-area: buildings;
	}

	.central-area {
		grid-area: atom;
	}
</style>
