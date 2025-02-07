<script lang="ts">
	import { gameManager } from '$lib/helpers/gameManager';
	import { formatNumber } from '$lib/utils';
	import Modal from '@components/atoms/Modal.svelte';
	import { atoms, protons } from '$lib/stores/gameStore';
	import { protoniseProtonsGain, PROTONS_ATOMS_REQUIRED } from '$lib/stores/protons';

	export let onClose: () => void;

	$: canProtonise = $atoms >= PROTONS_ATOMS_REQUIRED || $protons > 0;

	function handleProtonise() {
		gameManager.protonise();
		onClose();
	}
</script>

<Modal {onClose} title="Protonise">
	<div class="flex flex-col gap-8">
		<div class="text-center">
			<h2 class="text-2xl font-bold mb-2">Protonise your atoms</h2>
			<p class="text-gray-300">
				Convert your atoms into protons, a powerful new currency.
				<br />
				You'll start over, but with new upgrades!
			</p>
		</div>

		<div class="bg-black/20 rounded-lg p-4">
			<div class="flex justify-between items-center mb-2">
				<span>Current Atoms:</span>
				<span class="font-bold">{formatNumber($atoms)}</span>
			</div>
			<div class="flex justify-between items-center mb-4">
				<span>Protons to gain:</span>
				<span class="font-bold text-yellow-400">{formatNumber($protoniseProtonsGain)}</span>
			</div>
			<div class="flex justify-between items-center">
				<span>Current Protons:</span>
				<span class="font-bold text-yellow-400">{formatNumber($protons ?? 0)}</span>
			</div>
		</div>

		<button class="protonise-button" on:click={handleProtonise} disabled={!canProtonise || $protoniseProtonsGain === 0}>
			<div class="gradient-overlay" />
			<span class="z-10 relative">Protonise</span>
		</button>

		{#if !canProtonise}
			<p class="text-sm text-gray-400 text-center">Reach 1 billion atoms to unlock Protonise</p>
		{/if}
	</div>
</Modal>

<style lang="postcss">
	.protonise-button {
		@apply relative flex items-center justify-center w-full py-4 px-6 rounded-lg text-white font-bold text-lg shadow-lg overflow-hidden transition-all duration-300 transform hover:scale-[1.02];
		border: 2px solid transparent;
		background-clip: padding-box;
	}

	.protonise-button::before {
		@apply absolute inset-[-2px] content-[''] rounded-lg -z-10;
		animation: rotate 7s linear infinite;
		background: linear-gradient(
			90deg,
			theme('colors.blue.900'),
			theme('colors.purple.800'),
			theme('colors.blue.800'),
			theme('colors.indigo.900'),
			theme('colors.blue.900')
		);
		background-size: 300% 100%;
	}

	.protonise-button:hover::before {
		animation: rotate 4s linear infinite;
	}

	.protonise-button:disabled {
		@apply opacity-50 cursor-not-allowed hover:scale-100;
		border-color: theme('colors.red.900');
		background: rgba(0, 0, 0, 0.5);
	}

	.protonise-button:disabled::before {
		@apply hidden;
	}

	@keyframes rotate {
		0% {
			background-position: 0% 50%;
		}
		100% {
			background-position: 300% 50%;
		}
	}

	.gradient-overlay {
		@apply absolute inset-0.5 bg-gray-900 rounded transition-all duration-150;
	}

	.protonise-button:hover:not(:disabled) .gradient-overlay {
		@apply inset-8 rounded-3xl
	}
</style>
