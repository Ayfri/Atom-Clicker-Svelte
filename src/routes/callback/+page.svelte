<script lang="ts">
	import {goto} from '$app/navigation';
	import {auth} from '$stores/auth';
	import {LoaderCircle} from 'lucide-svelte';
	import {onMount} from 'svelte';

	let error: string | null = null;
	let loading = true;

	onMount(async () => {
		try {
			await auth.init();
			if (!error) await goto('/');
		} catch (e) {
			console.error('Callback error:', e);
			if (e instanceof Error) {
				if (e.message.includes('connection is not enabled')) {
					error = 'Social login is not properly configured. Please contact the administrator.';
				} else {
					error = e.message;
				}
			} else {
				error = 'An unexpected error occurred during login.';
			}
		} finally {
			loading = false;
		}
	});
</script>

<div class="flex h-screen w-screen items-center justify-center gap-4 flex-col">
	{#if error}
		<div class="max-w-md p-6 rounded-lg bg-red-500/20">
			<h1 class="text-2xl font-bold text-red-200 mb-2">Login Error</h1>
			<p class="text-red-100">{error}</p>
			<button
				class="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
				on:click={() => goto('/')}
			>
				Return to Home
			</button>
		</div>
	{:else if loading}
		<h1 class="text-2xl font-bold animate-pulse">Logging you in...</h1>
		<LoaderCircle size={64} class="loading-action rotate-[115deg]"/>
	{/if}
</div>
