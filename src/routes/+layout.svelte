<script lang="ts">
	import '@/app.css';
	import {browser} from '$app/environment';
	import Analytics from '@components/atoms/Analytics.svelte';
	import SEO from '@components/atoms/SEO.svelte';
	import {LoaderCircle} from 'lucide-svelte';
</script>

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

<Analytics/>
<SEO/>

{#if !browser}
	<div
		class="flex h-screen w-screen items-center justify-center gap-4 flex-col"
	>
		<h1 class="text-2xl font-bold animate-pulse">Loading...</h1>
		<LoaderCircle size={64} class="loading-action rotate-[115deg]"/>
	</div>
{:else}
	<slot/>
{/if}
