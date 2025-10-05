<script lang="ts">
	import {removeToast, toasts, clearAllToasts} from '$stores/toasts';
	import {X, Trash2} from 'lucide-svelte';
	import {fade} from 'svelte/transition';
</script>

<div
	class="fixed bottom-0 right-0 z-50 flex flex-col gap-4 p-4 sm:bottom-8 sm:right-8 sm:p-0"
>
	{#each $toasts as toast}
		<div
			class="flex w-full flex-col gap-2 overflow-hidden rounded-xl
			bg-accent-900/90 p-4 shadow-lg backdrop-blur-xs transition-all duration-300
			hover:scale-[1.02] sm:w-96"
			class:type={toast.type}
			transition:fade={{ duration: 400 }}
		>
			<div class="flex items-center justify-between gap-4">
				<h3 class="text-lg font-bold text-white">{toast.title}</h3>
				<button
					class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10 *:hover:stroke-3"
					on:click={() => removeToast(toast.id)}
				>
					<X class="transition-all duration-300" size={18}/>
				</button>
			</div>
			<p class="text-sm text-white/90">
				{@html toast.message}
			</p>
		</div>
	{/each}

	{#if $toasts.length > 1}
		<button
			class="flex w-fit items-center self-end gap-2 rounded-lg bg-accent-900/90 p-2 text-white transition-all duration-300 hover:bg-accent-800/90"
			on:click={clearAllToasts}
			transition:fade={{ duration: 400 }}
			title="Clear All"
		>
			<Trash2 size={18} />
		</button>
	{/if}
</div>
