<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { X } from 'lucide-svelte';

	export let onClose: () => void;
	export let title: string;

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window on:keydown={onKeydown} />

<div
	class="overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs"
	on:click={onClose}
	transition:fade={{ duration: 200 }}
>
	<div
		class="modal flex h-dvh w-screen md:h-[85vh] md:w-[85vw] max-w-3xl flex-col overflow-hidden md:rounded-2xl shadow-2xl bg-linear-to-br from-accent-900 to-accent-800"
		on:click|stopPropagation
		transition:fly={{ y: -100, duration: 300 }}
	>
		<div class="flex items-center justify-between gap-4 border-b border-white/10 bg-black/40 p-6 sm:px-8">
			<h2 class="flex-1 text-2xl font-bold text-white">{title}</h2>
			<button class="flex h-10 w-10 items-center justify-center rounded-lg transition-colors *:hover:stroke-3" on:click={onClose}>
				<X class="transition-all duration-300" />
			</button>
		</div>

		<div class="flex-1 overflow-y-auto p-4 sm:p-8">
			<slot></slot>
		</div>
	</div>
</div>
