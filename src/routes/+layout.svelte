<script lang="ts">
	import '@/app.css';
	import { browser } from '$app/environment';
	import PrestigeAnimation from '@components/prestige/PrestigeAnimation.svelte';
	import Analytics from '@components/system/Analytics.svelte';
	import DevTools from '@components/system/devtools/DevTools.svelte';
	import SEO from '@components/system/SEO.svelte';
	import TutorialOverlay from '@components/tutorial/TutorialOverlay.svelte';
	import TooltipPortal from '@components/ui/TooltipPortal.svelte';
	import { gameManager } from '$helpers/GameManager.svelte';
	import { quarksManager } from '$helpers/QuarksManager.svelte';
	import { prestigeStore } from '$stores/prestige.svelte';
	import { LoaderCircle } from '@lucide/svelte';
	import { onMount, type Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	onMount(() => {
		gameManager.onAchievementUnlocked = (achievementId: string) => quarksManager.claimAchievement(achievementId);
		quarksManager.sync().then(() => {
			// Retroactive backfill: idempotent via the quark_ledger unique ref, safe to run every load.
			if (gameManager.achievements.length > 0) {
				quarksManager.claimAchievements(gameManager.achievements);
			}
		});
	});
</script>

<SEO />
<Analytics />

{#if !browser}
	<div class="flex h-screen w-screen items-center justify-center gap-4 flex-col">
		<h1 class="text-2xl font-bold animate-pulse">Loading...</h1>
		<LoaderCircle
			size={64}
			class="loading-action rotate-115"
		/>
	</div>
{:else}
	<PrestigeAnimation
		animation={prestigeStore.animation}
		onComplete={() => prestigeStore.reset()}
	/>
	{@render children?.()}
	<DevTools />
	<TooltipPortal />
	<TutorialOverlay />
{/if}

<style>
	:global(.loading-action) {
		animation: spin 1.25s cubic-bezier(0.75, 0.97, 0.25, 0.03) infinite;
	}

	@keyframes spin {
		0% {
			rotate: 0deg;
		}
		100% {
			rotate: 360deg;
		}
	}
</style>
