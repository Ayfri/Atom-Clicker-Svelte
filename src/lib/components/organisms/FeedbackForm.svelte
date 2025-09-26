<script lang="ts">
	import {X} from 'lucide-svelte';
	import {fade, fly} from 'svelte/transition';

	export let onClose: () => void;

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window on:keydown={onKeydown}/>

<div class="overlay" on:click={onClose} transition:fade={{ duration: 200 }}>
	<div
		class="modal bg-linear-to-br from-accent-900 to-accent-800"
		on:click|stopPropagation
		transition:fly={{ y: -100, duration: 300 }}
	>
		<div
			class="flex items-center justify-between gap-4 border-b border-white/10 bg-black/40 p-6 sm:px-8"
		>
			<h2 class="flex-1 text-2xl font-bold text-white">Feedback</h2>
			<button
				class="flex h-10 w-10 items-center justify-center rounded-lg transition-colors *:hover:stroke-3"
				on:click={onClose}
			>
				<X class="transition-all duration-300"/>
			</button>
		</div>

		<div class="p-2 flex flex-1">
			<div class="flex-1 overflow-y-auto rounded-xl">
				<iframe
					src="https://tally.so/r/mO8OxM"
					width="100%"
					height="100%"
					title="Feedback Form"
				/>
			</div>
		</div>
	</div>
</div>

<style>
	.overlay {
		align-items: center;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(3px);
		display: flex;
		height: 100vh;
		justify-content: center;
		left: 0;
		position: fixed;
		top: 0;
		width: 100vw;
		z-index: 50;
	}

	.modal {
		border-radius: 1rem;
		display: flex;
		flex-direction: column;
		height: 85vh;
		max-width: 600px;
		overflow: hidden;
		position: relative;
		width: 90vw;
	}

	@media (width <= 768px) {
		.modal {
			height: 100dvh;
			width: 100vw;
			border-radius: 0;
		}
	}
</style>
