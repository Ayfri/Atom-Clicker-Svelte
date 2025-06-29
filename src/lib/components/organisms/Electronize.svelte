<script lang="ts">
	import { gameManager } from '$helpers/gameManager';
	import { formatNumber } from '$lib/utils';
	import Modal from '@components/atoms/Modal.svelte';
	import { electrons, protons } from '$stores/gameStore';
	import { electronizeElectronsGain } from '$stores/electrons';
	import { ELECTRONS_PROTONS_REQUIRED } from '$lib/constants';

	export let onClose: () => void;

	$: canElectronize = $protons >= ELECTRONS_PROTONS_REQUIRED || $electronizeElectronsGain > 0;

	function handleElectronize() {
		gameManager.electronize();
		onClose();
	}
</script>

<Modal {onClose} title="Electronize">
	<div class="flex flex-col gap-8">
		<div class="text-center">
			<h2 class="text-2xl font-bold mb-2">Electronize your protons</h2>
			<p class="text-gray-300">
				Transform your protons into electrons, a powerful new currency.
				<br />
				You'll start over, but with new upgrades!
			</p>
		</div>

		<div class="bg-black/20 rounded-lg p-4">
			<div class="flex justify-between items-center mb-2">
				<span>Current Protons:</span>
				<span class="font-bold text-yellow-400">{formatNumber($protons)}</span>
			</div>
			<div class="flex justify-between items-center mb-4">
				<span>Electrons to gain:</span>
				<span class="font-bold text-green-400">{formatNumber($electronizeElectronsGain)}</span>
			</div>
			<div class="flex justify-between items-center">
				<span>Current Electrons:</span>
				<span class="font-bold text-green-400">{formatNumber($electrons ?? 0)}</span>
			</div>
		</div>

		<button
			class="electronize-button"
			on:click={handleElectronize}
			disabled={!canElectronize || $electronizeElectronsGain === 0}
		>
			<div class="pulse-overlay" />
			<span class="z-10 relative">Electronize</span>
		</button>

		{#if !canElectronize}
			<p class="text-sm text-gray-400 text-center">Reach 1 billion protons to unlock Electronize</p>
		{/if}
	</div>
</Modal>

<style>
	.electronize-button {
		background: linear-gradient(45deg, #45d945 0%, #2a862a 100%);
		border: none;
		border-radius: 8px;
		color: white;
		cursor: pointer;
		font-size: 1.2rem;
		font-weight: bold;
		overflow: hidden;
		padding: 1rem;
		position: relative;
		text-transform: uppercase;
		transition: all 0.3s;
	}

	.electronize-button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.electronize-button:not(:disabled):hover {
		transform: translateY(-2px);
		box-shadow: 0 5px 15px rgba(69, 217, 69, 0.4);
	}

	.pulse-overlay {
		background: radial-gradient(circle, rgba(69, 217, 69, 0.2) 0%, transparent 70%);
		height: 100%;
		left: 0;
		position: absolute;
		top: 0;
		width: 100%;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0% {
			transform: scale(1);
			opacity: 0.6;
		}
		50% {
			transform: scale(1.5);
			opacity: 0;
		}
		100% {
			transform: scale(1);
			opacity: 0.6;
		}
	}
</style>
