<script lang="ts">
	import {gameManager} from '$helpers/gameManager';
	import {setGlobals} from '$lib/globals';
	import {supabaseAuth} from '$stores/supabaseAuth';
	import {atomsPerSecond, upgrades} from '$stores/gameStore';
	import {app} from '$stores/pixi';
	import {mobile} from '$stores/window';
	import HardReset from '@components/organisms/HardReset.svelte';
	import Levels from '@components/organisms/Levels.svelte';
	import NavBar from '@components/molecules/NavBar.svelte';
	import Toaster from '@components/molecules/Toaster.svelte';
	import {RotateCcw} from 'lucide-svelte';
	import {onDestroy, onMount} from 'svelte';
	import { realmManager } from '$helpers/realmManager';
	import { formatNumber } from '$lib/utils';
	import '$stores/autoBuy';
	import '$stores/autoUpgrade';

	const SAVE_INTERVAL = 1000;
	let saveLoop: ReturnType<typeof setInterval>;
	let gameUpdateInterval: ReturnType<typeof setInterval> | null = null;
	let showHardReset = false;

	function update(ticker: any) {
		gameManager.addAtoms(($atomsPerSecond * ticker.deltaMS) / 1000);
	}

	onMount(async () => {
		$mobile = window.innerWidth <= 900;
		gameManager.initialize();
		await supabaseAuth.init();

		while (!$app) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		if ($app.ticker?.add) {
			$app.ticker.add(update);
		} else {
			gameUpdateInterval = setInterval(() => {
				update({ deltaMS: 16.67 });
			}, 16.67);
		}

		setGlobals();

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
		if (gameUpdateInterval) clearInterval(gameUpdateInterval);
		gameManager.cleanup();
	});

	$: $mobile && $app?.queueResize?.();
</script>

<svelte:window
	on:resize={() => {
    $mobile = window.innerWidth <= 900
  }}
/>

<main class="relative py-12 lg:pb-4 min-h-screen overflow-hidden">
	<button
		class="fixed right-4 top-4 z-40 flex gap-2 py-1.5 px-3 items-center justify-center rounded-lg bg-red-900/30 text-white transition-colors hover:bg-red-900/50"
		on:click={() => showHardReset = true}
		title="Hard Reset"
	>
		<RotateCcw class="size-5" />
		Reset
	</button>

	<NavBar/>
	<Toaster/>

	{#if $realmManager.availableRealms.length > 1}
		<div class="fixed right-4 top-20 z-30 bg-black/10 backdrop-blur-sm border border-white/10 rounded-lg p-1">
			<div class="flex flex-col gap-1">
				{#each $realmManager.availableRealms as realm (realm.id)}
					<button
						class="flex items-center gap-2 px-2 py-1.5 rounded transition-all duration-200 hover:scale-105 {$realmManager.selectedRealm === realm.id ? realm.activeClasses : 'bg-white/5 hover:bg-white/10'}"
						on:click={() => realmManager.selectRealm(realm.id)}
						title="{realm.title} - {formatNumber($realmManager.realmValues[realm.id] ?? 0)} {realm.currency.name.toLowerCase()}"
					>
						<img src="/currencies/{realm.currency.icon}.png" alt={realm.currency.name} class="w-4 h-4" />
						<div class="text-xs text-white/80">{formatNumber($realmManager.realmValues[realm.id] ?? 0, 1)}</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if $upgrades.includes('feature_levels')}
		<Levels/>
	{/if}

	<!-- Use transform and opacity for virtual desktop swipe effect -->
	{#each $realmManager.availableRealms as realm, i (realm.id)}
		<div
			class="absolute inset-0 transition-all duration-500 ease-in-out"
			class:opacity-100={$realmManager.selectedRealm === realm.id}
			class:translate-x-0={$realmManager.selectedRealm === realm.id}
			class:opacity-0={$realmManager.selectedRealm !== realm.id}
			class:pointer-events-none={$realmManager.selectedRealm !== realm.id}
			style="transform: translateX({$realmManager.selectedRealm === realm.id ? '0' : (i > $realmManager.availableRealms.findIndex(r => r.id === $realmManager.selectedRealm) ? '100%' : '-100%')});"
		>
			<svelte:component this={realm.component} />
		</div>
	{/each}

	{#if showHardReset}
		<HardReset onClose={() => showHardReset = false} />
	{/if}
</main>
