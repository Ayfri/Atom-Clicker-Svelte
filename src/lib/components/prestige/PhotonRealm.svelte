<script lang="ts">
	import { gameManager } from '$helpers/gameManager';
	import { createClickParticle, type Particle } from '$helpers/particles';
	import { STATS } from '$helpers/statConstants';
	import { onDestroy, onMount } from 'svelte';
	import PhotonCounter from '@components/prestige/PhotonCounter.svelte';
	import PhotonUpgrades from '@components/prestige/PhotonUpgrades.svelte';
	import { particles } from '$stores/canvas';
	import { CurrenciesTypes } from '$data/currencies';
	import { photonUpgrades } from '$stores/gameStore';
	import { PHOTON_UPGRADES } from '$data/photonUpgrades';
	import { derived } from 'svelte/store';
	import { mobile } from '$stores/window';

	export function simulateClick() {
		if (!container || circles.length === 0) return;

		// Get a random circle from our circles array
		const randomCircle = circles[Math.floor(Math.random() * circles.length)];

		// Get the container's position to calculate absolute coordinates
		const containerRect = container.getBoundingClientRect();
		const absoluteX = containerRect.left + randomCircle.x;
		const absoluteY = containerRect.top + randomCircle.y;

		// Create a synthetic mouse event with the circle's coordinates
		const event = new MouseEvent('click', {
			clientX: absoluteX,
			clientY: absoluteY,
			bubbles: true
		});

		// Trigger the click directly on the circle
		clickCircle(randomCircle, event);
	}

	interface Circle {
		id: number;
		x: number;
		y: number;
		size: number;
		photons: number;
		lifetime: number;
		maxLifetime: number;
	}

	let circles: Circle[] = [];
	let nextId = 0;
	let container: HTMLDivElement;
	let spawnInterval: ReturnType<typeof setInterval>;
	let updateInterval: ReturnType<typeof setInterval>;
	let autoClickInterval: ReturnType<typeof setInterval>;
	let lastUpdateTime = Date.now();

	// Base values - will be modified by upgrades
	let baseSpawnRate = 2000;
	let baseCircleLifetime = 5000;
	let baseSizeMultiplier = 1;

	const MAX_CIRCLES = 100;
	const MIN_SIZE = 30;
	const MAX_SIZE = 80;
	const MIN_PHOTONS = 1;
	const MAX_PHOTONS = 10;

	// Helper functions to get upgrade bonuses
	function getSpawnRate() {
		const level = $photonUpgrades['photon_spawn_rate'] || 0;
		if (level === 0) return baseSpawnRate;

		const upgrade = PHOTON_UPGRADES['photon_spawn_rate'];
		const effects = upgrade.effects(level);

		return effects.reduce((rate, effect) => {
			if (effect.type === 'power_up_interval') {
				return effect.apply(rate, gameManager.getCurrentState());
			}
			return rate;
		}, baseSpawnRate);
	}

	function getSizeMultiplier() {
		const level = $photonUpgrades['circle_size'] || 0;
		if (level === 0) return baseSizeMultiplier;

		const upgrade = PHOTON_UPGRADES['circle_size'];
		const effects = upgrade.effects(level);

		return effects.reduce((multiplier, effect) => {
			if (effect.type === 'global') {
				return effect.apply(multiplier, gameManager.getCurrentState());
			}
			return multiplier;
		}, baseSizeMultiplier);
	}

	function getPhotonValueBonus() {
		const level = $photonUpgrades['photon_value'] || 0;
		if (level === 0) return 0;

		const upgrade = PHOTON_UPGRADES['photon_value'];
		const effects = upgrade.effects(level);

		return effects.reduce((bonus, effect) => {
			if (effect.type === 'click') {
				return effect.apply(bonus, gameManager.getCurrentState());
			}
			return bonus;
		}, 0);
	}

	function getLifetimeBonus() {
		const level = $photonUpgrades['circle_lifetime'] || 0;
		if (level === 0) return 0;

		const upgrade = PHOTON_UPGRADES['circle_lifetime'];
		const effects = upgrade.effects(level);

		return effects.reduce((bonus, effect) => {
			if (effect.type === 'power_up_duration') {
				return effect.apply(bonus, gameManager.getCurrentState());
			}
			return bonus;
		}, 0);
	}

	function getDoubleChance() {
		const level = $photonUpgrades['double_chance'] || 0;
		if (level === 0) return 0;

		// Simple calculation: 2% per level
		return (level * 2) / 100;
	}

	function spawnCircle() {
		if (!container) return;

		const rect = container.getBoundingClientRect();
		const margin = MAX_SIZE;

		// Apply upgrades
		const sizeMultiplier = getSizeMultiplier();
		const photonValueBonus = getPhotonValueBonus();
		const lifetimeBonus = getLifetimeBonus();
		const doubleChance = getDoubleChance();

		const baseSize = Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE;
		const basePhotons = Math.floor(Math.random() * (MAX_PHOTONS - MIN_PHOTONS + 1)) + MIN_PHOTONS;

		// Apply double chance
		const finalPhotons = Math.random() < doubleChance ? (basePhotons + photonValueBonus) * 2 : basePhotons + photonValueBonus;

		const circle: Circle = {
			id: nextId++,
			x: Math.random() * (rect.width - margin * 2) + margin,
			y: Math.random() * (rect.height - margin * 2) + margin,
			size: baseSize * sizeMultiplier,
			photons: Math.floor(finalPhotons),
			lifetime: 0,
			maxLifetime: baseCircleLifetime + lifetimeBonus
		};

		circles = [...circles, circle];
		// Limit the number of circles to 100
		circles = circles.slice(0, MAX_CIRCLES);
	}

	async function clickCircle(circle: Circle, event: MouseEvent) {
		gameManager.addStat(STATS.PHOTONS, circle.photons);
		circles = circles.filter((c) => c.id !== circle.id);

		const particleCount = Math.floor(circle.photons / 2) + 1;
		const addedParticles: Particle[] = [];
		for (let i = 0; i < particleCount; i++) {
			const particle = await createClickParticle(event.clientX, event.clientY, CurrenciesTypes.PHOTONS);
			addedParticles.push(particle);
		}
		particles.update((p) => [...p, ...addedParticles]);
	}

	function updateCircles() {
		const currentTime = Date.now();
		const deltaTime = currentTime - lastUpdateTime;
		lastUpdateTime = currentTime;

		circles = circles
			.map((circle) => ({
				...circle,
				lifetime: circle.lifetime + deltaTime
			}))
			.filter((circle) => circle.lifetime < circle.maxLifetime);
	}

	// Calculate auto-clicks per second from photon upgrades
	const photonAutoClicksPerSecond = derived(photonUpgrades, ($photonUpgrades) => {
		const autoClickerLevel = $photonUpgrades['auto_clicker'] || 0;
		if (autoClickerLevel === 0) return 0;

		const upgrade = PHOTON_UPGRADES['auto_clicker'];
		const effects = upgrade.effects(autoClickerLevel);

		// Apply the effect to get clicks per second
		return effects.reduce((total, effect) => {
			if (effect.type === 'auto_click') {
				return effect.apply(total, gameManager.getCurrentState());
			}
			return total;
		}, 0);
	});

	// Set up auto-clicker subscription like in Atom.svelte
	photonAutoClicksPerSecond.subscribe(clicksPerSecond => {
		if (autoClickInterval) clearInterval(autoClickInterval);
		if (clicksPerSecond > 0) {
			autoClickInterval = setInterval(() => simulateClick(), 5000 / clicksPerSecond);
		}
	});

	// Update spawn rate when upgrades change
	$: {
		if (spawnInterval) {
			clearInterval(spawnInterval);
			spawnInterval = setInterval(spawnCircle, getSpawnRate());
		}
	}

		onMount(() => {
		lastUpdateTime = Date.now();
		spawnInterval = setInterval(spawnCircle, getSpawnRate());
		updateInterval = setInterval(updateCircles, 16);
	});

	onDestroy(() => {
		if (spawnInterval) clearInterval(spawnInterval);
		if (updateInterval) clearInterval(updateInterval);
		if (autoClickInterval) clearInterval(autoClickInterval);
	});

	$: opacity = (circle: Circle) => Math.max(0, 1 - circle.lifetime / circle.maxLifetime);
	$: scale = (circle: Circle) => {
		const fadeInDuration = 150; // 0.15s
		if (circle.lifetime < fadeInDuration) {
			return circle.lifetime / fadeInDuration;
		}
		return 1;
	};
</script>

<div
	class="fixed inset-0 pt-12 lg:pt-4 transition-all duration-1000 ease-in-out {$mobile ? 'overflow-y-auto' : ''}"
	style="background: linear-gradient(135deg, rgba(139, 69, 191, 0.1) 0%, rgba(75, 0, 130, 0.1) 50%, rgba(139, 69, 191, 0.1) 100%);"
>
	<div class="h-full flex flex-col lg:flex-row px-4 pt-12 pb-6 max-w-7xl mx-auto gap-4 {$mobile ? 'min-h-screen' : ''}">
		<!-- Game Area - Left side (2/3 on desktop, full width on mobile) -->
		<div class="flex-1 lg:w-2/3 flex flex-col items-center">
			<PhotonCounter />

			<div
				class="relative w-full {$mobile ? 'h-[40vh] min-h-[300px]' : 'h-[350px] lg:h-[650px]'} overflow-hidden"
				data-photon-realm
				bind:this={container}
			>
				{#each circles as circle (circle.id)}
					<button
						class="absolute rounded-full cursor-pointer flex items-center justify-center"
						style="
							left: {circle.x}px;
							top: {circle.y}px;
							width: {circle.size}px;
							height: {circle.size}px;
							opacity: {opacity(circle)};
							transform: translate(-50%, -50%) scale({scale(circle)});
						"
						on:click={(event) => clickCircle(circle, event)}
					>
						<img
							src="/currencies/photon.png"
							alt="Photon"
							class="w-full h-full object-contain"
							style="filter: drop-shadow(0 0 10px rgba(153, 102, 204, 0.8));"
						/>
						<span
							class="absolute text-white font-bold text-xs pointer-events-none drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]"
						>
							+{circle.photons}
						</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Upgrades Area - Right side (1/3 on desktop, full width on mobile) -->
		<div class="w-full lg:w-1/3 lg:max-w-xs {$mobile ? 'max-h-[50vh] overflow-y-auto' : ''}">
			<PhotonUpgrades />
		</div>
	</div>
</div>
