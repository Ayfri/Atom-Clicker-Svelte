<script lang="ts">
	import {removeToast, toasts, clearAllToasts} from '$stores/toasts';
	import {X, Trash2} from 'lucide-svelte';
	import {fade} from 'svelte/transition';
</script>

<div
	class="fixed bottom-0 right-0 z-50 flex flex-col gap-3 p-4 sm:bottom-8 sm:right-8 sm:p-0"
>
	{#each $toasts as toast}
		<div
			class="flex w-full flex-col gap-1 overflow-hidden rounded-lg
			bg-accent-900/90 p-3 shadow-lg backdrop-blur-xs transition-all duration-300
			hover:scale-[1.02] sm:w-80"
			class:type={toast.type}
			transition:fade={{ duration: 400 }}
		>
			<div class="flex items-center justify-between gap-4">
				<h3 class="text-sm font-bold text-white">{toast.title}</h3>
				<button
					class="flex h-6 w-6 items-center justify-center rounded-lg transition-colors hover:bg-white/10 *:hover:stroke-3"
					onclick={() => removeToast(toast.id)}
				>
					<X class="transition-all duration-300" size={14}/>
				</button>
			</div>
			<p class="text-xs text-white/90">
				{@html toast.message}
			</p>
		</div>
	{/each}

	{#if $toasts.length > 1}
		<button
			class="flex w-fit items-center self-end gap-2 rounded-lg bg-red-900/70 p-2 text-white transition-all duration-300 hover:bg-red-800/70"
			onclick={clearAllToasts}
			title="Clear All"
			transition:fade={{ duration: 400 }}
		>
			<Trash2 size={18} />
		</button>
	{/if}
</div>
