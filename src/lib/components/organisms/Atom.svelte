<script lang="ts">
	import {gameManager} from '$helpers/gameManager';
	import {BUILDING_TYPES, BUILDING_COLORS, BUILDING_LEVEL_UP_COST} from '$data/buildings';
	import {onDestroy} from 'svelte';
	import {createClickParticle, createClickTextParticle, type Particle} from '$helpers/particles';
	import {buildings, clickPower, hasBonus, totalClicks} from '$stores/gameStore';
	import {formatNumber} from '$lib/utils';
	import {particles} from '$stores/canvas';

	let spawnInterval: number;

	async function handleClick(event: MouseEvent) {
		gameManager.addAtoms($clickPower);
		$totalClicks++;

		// TODO: Re-add main atom animation

		const newParticles: Particle[]  = [];
		newParticles.push(createClickTextParticle(event.clientX + Math.random() * 10, event.clientY + Math.random() * 10, `+${formatNumber($clickPower)}`));

		for (let i = 0; i < 5; i++) {
			newParticles.push(await createClickParticle(event.clientX + Math.random() * 10, event.clientY + Math.random() * 10));
		}
		particles.update(current => [...current,...newParticles]);
	}

	onDestroy(() => clearInterval(spawnInterval));
</script>

<div
	class="atom"
	class:bonus={$hasBonus}
	on:click={async e => await handleClick(e)}
>
	{#each BUILDING_TYPES.filter(name => name in $buildings) as name, i}
		{@const data = $buildings[name]}

		{#if data && data.count > 0}
			{@const color = BUILDING_COLORS[data.level]}
			<div class="electron-shell" style="--line: {i}; --count: {data.count % BUILDING_LEVEL_UP_COST}; --color: {color};">
				{#each new Array(data.count % BUILDING_LEVEL_UP_COST) as _, j}
					<div class="electron" style="--i: {j};"></div>
				{/each}
			</div>
		{/if}
	{/each}
	<div class="nucleus"></div>
</div>

<style>
	.atom {
		--electron-line-spacing: 50px;
		--initial-electrons-spacing: 130px;
		--nucleus-size: 60px;
		--speed: 1;
		align-items: center;
		background: transparent;
		border: none;
		cursor: pointer;
		display: flex;
		margin-top: 5rem;
		justify-content: center;
		position: relative;
		transition: transform 0.1s;
		width: 450px;
		height: 450px;
		-webkit-tap-highlight-color: transparent;

		&.bonus {
			--speed: 2;
		}

		@media screen and (width <= 1000px) {
			--electron-line-spacing: 40px;
			--initial-electrons-spacing: 110px;
			width: 360px;
			height: 360px;
		}

		@media screen and (width <= 600px) {
			--electron-line-spacing: 30px;
			--initial-electrons-spacing: 100px;
			--nucleus-size: 50px;
			width: 300px;
			height: 300px;
			margin-top: 0;
		}
	}

	.nucleus {
		background: radial-gradient(circle at 30% 30%, #4a90e2, #2c3e50);
		border-radius: 50%;
		box-shadow: 0 0 20px rgba(74, 144, 226, 0.5);
		height: var(--nucleus-size);
		width: var(--nucleus-size);
	}

	.electron-shell {
		--radius: calc(var(--initial-electrons-spacing) + var(--line) * var(--electron-line-spacing));
		animation: rotate calc((4s + var(--line) * 2s) / var(--speed)) linear infinite;
		border: 2px solid color-mix(in oklab, var(--color) 10%, transparent 10%);
		border-radius: 50%;
		height: var(--radius);
		position: absolute;
		transform: translate(-50%, -50%);
		width: var(--radius);
	}

	.electron {
		--size: max(5px, calc(5px + var(--line) * 1px));
		--offset: calc(var(--line) * 20deg);
		--angle: calc(var(--offset) + (var(--i) / var(--count)) * 360deg);

		/* use angle to calculate position with cosinus and sinus */
		left: calc(50% + var(--radius) / 2 * cos(var(--angle)) - var(--size) / 2);
		top: calc(50% + var(--radius) / 2 * sin(var(--angle)) - var(--size) / 2);

		background: var(--color);
		border-radius: 50%;
		box-shadow: 0 0 10px color-mix(in oklab, var(--color) 50%, transparent 10%);
		height: var(--size);
		transition: all 0.5s;
		position: absolute;
		width: var(--size);
	}

	@keyframes rotate {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	:global(.bounce) {
		animation: bounce 0.6s ease-in-out;
	}

	@keyframes bounce {
		0% {
			transform: scale(1);
		}
		25% {
			transform: scale(1.025);
		}
		50% {
			transform: scale(0.99);
		}
		75% {
			transform: scale(1.005);
		}
		100% {
			transform: scale(1);
		}
	}
</style>
