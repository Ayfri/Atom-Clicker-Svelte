<script lang="ts">
	import { gameManager } from '$helpers/gameManager';
	import { formatNumber } from '$lib/utils';
	import Modal from '@components/atoms/Modal.svelte';
	import { atoms, protons } from '$stores/gameStore';
	import { protoniseProtonsGain } from '$stores/protons';
	import { PROTONS_ATOMS_REQUIRED } from '$lib/constants';

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
	@reference '../../../app.css';

	.protonise-button {
		@apply relative flex items-center justify-center w-full py-4 px-6 rounded-lg text-white font-bold text-lg shadow-lg overflow-hidden transition-all duration-300 transform;
		border: 2px solid transparent;
		background-clip: padding-box;

		&:hover {
			@apply scale-[1.02];
		}
	}

	.protonise-button::before {
		@apply absolute inset-[-2px] content-[''] rounded-lg -z-10;
		animation: rotate 7s linear infinite;
		background: linear-gradient(
			90deg,
			var(--color-blue-900),
			var(--color-purple-800),
			var(--color-blue-800),
			var(--color-indigo-900),
			var(--color-blue-900)
		);
		background-size: 300% 100%;
	}

	.protonise-button:hover::before {
		animation: rotate 4s linear infinite;
	}

	.protonise-button:disabled {
		@apply opacity-50 cursor-not-allowed;
		border-color: var(--color-red-900);
		background: rgba(0, 0, 0, 0.5);

		&:hover {
			@apply scale-100;
		}
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
		@apply inset-8 rounded-3xl;
	}
</style>
