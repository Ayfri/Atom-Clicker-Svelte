<script lang="ts">
	import {onDestroy, onMount} from 'svelte';
	import {fade} from 'svelte/transition';
	import {gameManager} from '$helpers/gameManager';
	import {powerUpInterval} from '$stores/gameStore';
	import type {PowerUp} from '$lib/types';
	import {randomBetween, randomValue, formatNumber} from '$lib/utils';

	const powerUps = [
		{
			duration: 40_000,
			multiplier: 1.5,
		},
		{
			duration: 20_000,
			multiplier: 2,
		},
		{
			duration: 15_000,
			multiplier: 2.5,
		},
		{
			duration: 5000,
			multiplier: 8,
		},
		{
			duration: 2500,
			multiplier: 25,
		}
	];

	const powerUp = {
		description: '',
		duration: 0,
		id: Date.now().toString(),
		multiplier: 0,
		name: 'Double Atoms',
		startTime: Date.now(),
	} satisfies PowerUp;

	let x = 0;
	let y = 0;
	let visible = false;
	let messageShown = false;

	function spawnBonusAtom() {
		const margin = 100;

		x = Math.random() * (window.innerWidth - margin * 2) + margin;
		y = Math.random() * (window.innerHeight - margin * 2) + margin;
		const randomPowerUp = randomValue(powerUps);
		powerUp.multiplier = randomPowerUp.multiplier;
		powerUp.duration = randomPowerUp.duration;
		powerUp.description = `Multiplies atoms by ${formatNumber(powerUp.multiplier)} for ${formatNumber(powerUp.duration / 1000)} seconds`;
		powerUp.id = Date.now().toString();
		visible = true;

		setTimeout(() => visible = false, 30_000);
	}

	function onClick() {
		visible = false;
		messageShown = true;
		powerUp.startTime = Date.now();
		gameManager.addPowerUp(powerUp);
		const id = powerUp.id;
		setTimeout(() => gameManager.removePowerUp(id), powerUp.duration);
		setTimeout(() => messageShown = false, 3_000);
	}

	function setRandomInterval() {
		timeout = setTimeout(() => {
			spawnBonusAtom();
			setRandomInterval();
		}, randomBetween($powerUpInterval[0], $powerUpInterval[1]));
	}

	let timeout: number;
	onMount(setRandomInterval);

	onDestroy(() => clearTimeout(timeout));
</script>


{#if visible}
	<div class="power-up bonus-atom" on:click|once={onClick} transition:fade={{duration: 1000}} style="left: {x}px; top: {y}px;"/>
{/if}

{#if messageShown}
	<p class="bonus-message" in:fade={{duration: 100}} out:fade={{duration: 400}} style="left: {x}px; top: {y}px;">
		{powerUp.description}
	</p>
{/if}

<style>
	.bonus-atom {
		animation: pulse 1s ease-in-out infinite;
		background: radial-gradient(circle at 30% 30%, #ffd700, #ff6b6b);
		border-radius: 50%;
		cursor: pointer;
		height: 40px;
		position: absolute;
		width: 40px;
		transition: filter 0.2s;
		z-index: 10;

		&:hover {
			animation: none;
			filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.75));
		}
	}

	.bonus-message {
		border-radius: 5px;
		color: white;
		filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
		font-size: 1.1rem;
		font-weight: bold;
		position: absolute;
		text-align: center;
		pointer-events: none;
		transform: translate(-50%, -50%);
		width: 300px;
		z-index: 10;
	}
</style>
