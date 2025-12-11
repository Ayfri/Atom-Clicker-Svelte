<script lang="ts">
	import '$stores/autoBuy';
	import '$stores/autoUpgrade';
	import {Coffee, RotateCcw} from 'lucide-svelte';
	import {onDestroy, onMount} from 'svelte';
	import Discord from '@components/icons/Discord.svelte';
	import GitHub from '@components/icons/GitHub.svelte';
	import HardReset from '@components/system/HardReset.svelte';
	import Levels from '@components/game/Levels.svelte';
	import NavBar from '@components/layout/NavBar.svelte';
	import Toaster from '@components/layout/Toaster.svelte';
	import {realmManager} from '$helpers/realmManager';
	import {gameManager} from '$helpers/gameManager';
	import {setGlobals} from '$lib/globals';
	import {formatNumber} from '$lib/utils';
	import {atomsPerSecond, upgrades} from '$stores/gameStore';
	import {app} from '$stores/pixi';
	import {supabaseAuth} from '$stores/supabaseAuth';
	import {mobile} from '$stores/window';

	const SAVE_INTERVAL = 1000;
	let saveLoop: ReturnType<typeof setInterval>;
	let gameUpdateInterval: ReturnType<typeof setInterval> | null = null;
	let showHardReset = $state(false);

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

	$effect(() => {
		if ($mobile) $app?.queueResize?.();
	});
</script>

<svelte:window
	onresize={() => {
    $mobile = window.innerWidth <= 900
  }}
/>

<div class="flex flex-col min-h-screen">
	<NavBar/>
	<Toaster/>

	<button
		class="fixed right-4 top-4 z-40 flex gap-2 py-1.5 px-3 items-center justify-center rounded-lg bg-red-900/30 text-white transition-colors hover:bg-red-900/50"
		onclick={() => showHardReset = true}
		title="Hard Reset"
	>
		<RotateCcw class="size-5" />
		Reset
	</button>

	{#if $realmManager.availableRealms.length > 1}
		<div class="fixed right-4 top-20 z-30 bg-black/10 backdrop-blur-xs border border-white/10 rounded-lg p-1">
			<div class="flex flex-col gap-1">
				{#each $realmManager.availableRealms as realm (realm.id)}
					<button
						class="flex items-center gap-2 px-2 py-1.5 rounded-sm transition-all duration-200 hover:scale-105 {$realmManager.selectedRealm === realm.id ? realm.activeClasses : 'bg-white/5 hover:bg-white/10'}"
						onclick={() => realmManager.selectRealm(realm.id)}
						title="{realm.title} - {formatNumber($realmManager.realmValues[realm.id] ?? 0)} {realm.currency.name.toLowerCase()}"
					>
						<img src="/currencies/{realm.currency.icon}.png" alt={realm.currency.name} class="w-4 h-4" />
						<div class="text-xs text-white/80">{formatNumber($realmManager.realmValues[realm.id] ?? 0, 1)}</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<main class="relative flex-1 py-12 {$mobile ? 'overflow-y-auto' : 'overflow-hidden'} lg:pb-4">
		{#if $upgrades.includes('feature_levels')}
			<Levels/>
		{/if}

		<!-- Use transform and opacity for virtual desktop swipe effect -->
		{#each $realmManager.availableRealms as realm, i (realm.id)}
			<div
				class="absolute inset-0 overflow-y-auto transition-all duration-300 ease-in-out"
				class:opacity-100={$realmManager.selectedRealm === realm.id}
				class:translate-x-0={$realmManager.selectedRealm === realm.id}
				class:opacity-0={$realmManager.selectedRealm !== realm.id}
				class:pointer-events-none={$realmManager.selectedRealm !== realm.id}
				style="transform: translateX({$realmManager.selectedRealm === realm.id ? '0' : (i > $realmManager.availableRealms.findIndex(r => r.id === $realmManager.selectedRealm) ? '100%' : '-100%')});"
			>
				<realm.component />
				<!-- Footer at the end of each realm for scrolling -->
				<footer class="px-4 py-2 text-xs text-white/60 mt-16">
					<div class="mx-auto max-w-4xl flex flex-col items-center gap-1.5">
						<div class="flex flex-wrap items-center justify-center gap-3">
							<a
								class="group flex items-center gap-1 text-white/60 transition-colors hover:text-white"
								href="https://discord.gg/BySjRNQ9Je"
								rel="noopener noreferrer"
								target="_blank"
								title="Join our Discord community"
							>
								<Discord class="w-3.5 h-3.5 fill-white/60 group-hover:fill-white duration-200 transition-all" />
							</a>
							<a
								class="flex items-center gap-1 text-white/60 transition-colors hover:text-white"
								href="https://github.com/Ayfri/Atom-Clicker-Svelte"
								rel="noopener noreferrer"
								target="_blank"
								title="View source code on GitHub"
							>
								<GitHub class="w-3.5 h-3.5 fill-white/60 group-hover:fill-white duration-200 transition-all" />
							</a>
							<a
								class="text-white/60 transition-colors hover:text-white"
								href="https://ayfri.com"
								rel="noopener noreferrer"
								target="_blank"
								title="Visit creator's website"
							>
								ayfri.com
							</a>
							<a
								class="group flex items-center gap-1 rounded-sm bg-yellow-500 px-2 py-0.5 text-black transition-colors hover:bg-yellow-300"
								href="https://buymeacoffee.com/ayfri"
								rel="noopener noreferrer"
								target="_blank"
								title="Support the creator"
							>
								<Coffee class="w-3 h-3 fill-transparent group-hover:fill-black duration-200 transition-all" />
								<span>Buy me a coffee</span>
							</a>
						</div>
						<div class="text-white/40 text-[0.7rem]">
							Atom Clicker © {new Date().getFullYear()} • Made with ❤️ by <a href="https://ayfri.com" class="text-white/50 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">Ayfri</a>
						</div>
					</div>
				</footer>
			</div>
		{/each}

		{#if showHardReset}
			<HardReset onClose={() => showHardReset = false} />
		{/if}
	</main>
</div>
