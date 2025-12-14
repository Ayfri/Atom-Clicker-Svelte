<script lang="ts">
	import BonusPhoton from '@components/prestige/BonusPhoton.svelte';
	import Canvas from '@components/game/Canvas.svelte';
	import Counter from '@components/game/Counter.svelte';
	import Achievements from '@components/game/Achievements.svelte';
	import Atom from '@components/game/Atom.svelte';
	import Buildings from '@components/game/Buildings.svelte';
	import Upgrades from '@components/game/Upgrades.svelte';
	import { app } from '$stores/pixi';
	import { mobile } from '$stores/window';

	let activeTab: 'achievements' | 'buildings' | 'upgrades' = $state('upgrades');

	$effect(() => {
		if ($mobile && activeTab) $app?.queueResize?.();
	});
</script>

<div class="relative pt-12 transition-all duration-1000 ease-in-out lg:pt-4 {$mobile ? 'min-h-screen pb-8' : ''}">
	<Canvas />
	<BonusPhoton />

	<div class="game-container grid gap-8 mx-auto p-8 text-sm xl:max-w-[90rem] lg:max-w-4xl">
		<div class="left-panel flex flex-col gap-4 z-10">
			<div class="grid grid-flow-col gap-2 auto-cols-fr">
				<button
					class="backdrop-blur-xs rounded-lg p-2 w-full whitespace-nowrap border-none text-inherit cursor-pointer transition-all duration-200 {activeTab === 'upgrades'
						? 'bg-accent-400 text-white'
						: 'bg-white/5 hover:bg-white/10'}"
					onclick={() => (activeTab = 'upgrades')}>Upgrades</button
				>
				{#if $mobile}
					<button
						class="backdrop-blur-xs rounded-lg p-2 w-full whitespace-nowrap border-none text-inherit cursor-pointer transition-all duration-200 {activeTab === 'buildings'
							? 'bg-accent-400 text-white'
							: 'bg-white/5 hover:bg-white/10'}"
						onclick={() => (activeTab = 'buildings')}>Buildings</button
					>
				{/if}
				<button
					class="backdrop-blur-xs rounded-lg p-2 w-full whitespace-nowrap border-none text-inherit cursor-pointer transition-all duration-200 {activeTab === 'achievements'
						? 'bg-accent-400 text-white'
						: 'bg-white/5 hover:bg-white/10'}"
					onclick={() => (activeTab = 'achievements')}
				>
					Achievements
				</button>
			</div>
			<div class="flex-1 overflow-y-auto {$mobile ? 'max-h-[60vh]' : ''}">
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
	}

	/* Tablet breakpoint - Custom styles for mid-range screens */
	@media (min-width: 900px) and (max-width: 1536px) {
		.game-container {
			grid-template-columns: 250px 300px 250px;
			max-width: 64rem; /* 1000px */
			padding-left: 4rem;
		}
	}

	/* Mobile breakpoint - Stack layout vertically */
	@media (max-width: 900px) {
		.game-container {
			grid-template-areas: 'atom' 'upgrades' 'buildings';
			grid-template-columns: 1fr;
			max-width: 100vw;
			overflow-x: hidden;
		}
	}

	/* Small mobile breakpoint - Maintain vertical layout */
	@media (max-width: 700px) {
		.game-container {
			grid-template-areas: 'atom' 'upgrades' 'buildings';
			grid-template-columns: 1fr;
			overflow-x: hidden;
		}
	}

	/* Grid area assignments */
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
