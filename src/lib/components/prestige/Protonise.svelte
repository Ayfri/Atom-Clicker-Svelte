<script lang="ts">
	import { gameManager } from '$helpers/gameManager';
	import { formatNumber } from '$lib/utils';
	import Modal from '@components/ui/Modal.svelte';
	import { atoms, protons } from '$stores/gameStore';
	import { protoniseProtonsGain } from '$stores/protons';
	import { PROTONS_ATOMS_REQUIRED } from '$lib/constants';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let canProtonise = $derived($atoms >= PROTONS_ATOMS_REQUIRED || $protons > 0);

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

		<button
			class="
				protonise-button group relative flex items-center justify-center w-full py-4 px-6 rounded-lg text-white font-bold text-lg shadow-lg overflow-hidden transition-all duration-300 transform border-2 border-transparent bg-clip-padding hover:scale-[1.02]
				disabled:before:hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:border-[var(--color-red-900)] disabled:bg-black/50 disabled:hover:scale-100
			"
			disabled={!canProtonise || $protoniseProtonsGain === 0}
			onclick={handleProtonise}
		>
			<div class="absolute inset-0.5 bg-gray-900 rounded transition-all duration-150 group-hover:inset-8 group-hover:rounded-3xl"></div>
			<span class="z-10 relative">Protonise</span>
		</button>

		{#if !canProtonise}
			<p class="text-sm text-gray-400 text-center">Reach 1 billion atoms to unlock Protonise</p>
		{/if}
	</div>
</Modal>

<style>
	.protonise-button::before {
		content: '';
		position: absolute;
		inset: -2px;
		border-radius: 0.5rem;
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

	@keyframes rotate {
		0% {
			background-position: 0% 50%;
		}
		100% {
			background-position: 300% 50%;
		}
	}
</style>
