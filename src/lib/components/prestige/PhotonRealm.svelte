<script lang="ts">
	import { gameManager } from '$helpers/GameManager.svelte';
	import { currenciesManager } from '$helpers/CurrenciesManager.svelte';
	import { createClickParticleSync, type Particle } from '$helpers/particles';
	import { onDestroy, onMount } from 'svelte';
	import PhotonCounter from '@components/prestige/PhotonCounter.svelte';
	import PhotonUpgrades from '@components/prestige/PhotonUpgrades.svelte';
	import Currency from '@components/ui/Currency.svelte';
	import { addParticles } from '$stores/canvas';
	import { CurrenciesTypes } from '$data/currencies';
	import { ALL_PHOTON_UPGRADES } from '$data/photonUpgrades';
	import { mobile } from '$stores/window.svelte';

	export function simulateClick() {
		if (!container || circles.length === 0) return;

		// Filter valid targets
		const allowExcited = (gameManager.photonUpgrades['excited_auto_click'] || 0) > 0;
		const validCircles = circles.filter(c => allowExcited || c.type !== 'excited');

		if (validCircles.length === 0) return;

		// Get a random circle from our valid circles array
		const randomCircle = validCircles[Math.floor(Math.random() * validCircles.length)];

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
		rotation: number;
		type?: 'normal' | 'excited';
		baseValue?: number;
	}

	let circles: Circle[] = $state([]);
	let nextId = 0;
	let container = $state<HTMLDivElement>();
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
		let rate = baseSpawnRate;

		// Initial spawn rate upgrade
		const spawnRateLevel = gameManager.photonUpgrades['photon_spawn_rate'] || 0;
		if (spawnRateLevel > 0) {
			const upgrade = ALL_PHOTON_UPGRADES['photon_spawn_rate'];
			const effects = upgrade.effects(spawnRateLevel);
			rate = effects.reduce((current, effect) => {
				if (effect.type === 'power_up_interval') {
					return effect.apply(current, gameManager);
				}
				return current;
			}, rate);
		}

		// Photon Overdrive upgrade
		const overdriveLevel = gameManager.photonUpgrades['photon_overdrive'] || 0;
		if (overdriveLevel > 0) {
			const upgrade = ALL_PHOTON_UPGRADES['photon_overdrive'];
			const effects = upgrade.effects(overdriveLevel);
			rate = effects.reduce((current, effect) => {
				if (effect.type === 'power_up_interval') {
					return effect.apply(current, gameManager);
				}
				return current;
			}, rate);
		}

		return rate;
	}

	function getSizeMultiplier() {
		const level = gameManager.photonUpgrades['circle_size'] || 0;
		if (level === 0) return baseSizeMultiplier;

		const upgrade = ALL_PHOTON_UPGRADES['circle_size'];
		const effects = upgrade.effects(level);

		return effects.reduce((multiplier, effect) => {
			if (effect.type === 'global') {
				return effect.apply(multiplier, gameManager);
			}
			return multiplier;
		}, baseSizeMultiplier);
	}

	function getPhotonValueBonus() {
		const level = gameManager.photonUpgrades['photon_value'] || 0;
		if (level === 0) return 0;

		const upgrade = ALL_PHOTON_UPGRADES['photon_value'];
		const effects = upgrade.effects(level);

		return effects.reduce((bonus, effect) => {
			if (effect.type === 'click') {
				return effect.apply(bonus, gameManager);
			}
			return bonus;
		}, 0);
	}

	function getExcitedFromMaxBonus() {
		const level = gameManager.photonUpgrades['excited_from_max_photons'] || 0;
		if (level === 0) return 0;

		const upgrade = ALL_PHOTON_UPGRADES['excited_from_max_photons'];
		const effects = upgrade.effects(level);

		return effects.reduce((bonus, effect) => {
			if (effect.type === 'excited_photon_from_max') {
				return effect.apply(bonus, gameManager);
			}
			return bonus;
		}, 0);
	}

	function getLifetimeBonus() {
		// Normal lifetime bonus
		let duration = 0;
		const lifetimeLevel = gameManager.photonUpgrades['circle_lifetime'] || 0;
		if (lifetimeLevel > 0) {
			const upgrade = ALL_PHOTON_UPGRADES['circle_lifetime'];
			const effects = upgrade.effects(lifetimeLevel);
			duration += effects.reduce((bonus, effect) => {
				if (effect.type === 'power_up_duration') {
					return effect.apply(bonus, gameManager);
				}
				return bonus;
			}, 0);
		}

		return duration;
	}

	function getExcitedLifetimeMultiplier() {
		const level = gameManager.photonUpgrades['energetic_decay'] || 0;
		if (level === 0) return 1;

		const upgrade = ALL_PHOTON_UPGRADES['energetic_decay'];
		const effects = upgrade.effects(level);

		return effects.reduce((mult, effect) => {
			if (effect.type === 'excited_photon_duration') {
				return effect.apply(mult, gameManager);
			}
			return mult;
		}, 1);
	}

	function getDoubleChance() {
		const level = gameManager.photonUpgrades['double_chance'] || 0;
		if (level === 0) return 0;

		// Simple calculation: 2% per level
		return (level * 2) / 100;
	}

	function getExcitedDoubleChance() {
		const level = gameManager.photonUpgrades['excited_yield'] || 0;
		if (level === 0) return 0;

		const upgrade = ALL_PHOTON_UPGRADES['excited_yield'];
		const effects = upgrade.effects(level);

		return effects.reduce((chance, effect) => {
			if (effect.type === 'excited_photon_double') {
				return effect.apply(chance, gameManager);
			}
			return chance;
		}, 0);
	}

	function getIsExcited() {
		return Math.random() < gameManager.excitedPhotonChance;
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

		const isExcited = getIsExcited();

		const baseSize = Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE;
		const basePhotons = Math.floor(Math.random() * (MAX_PHOTONS - MIN_PHOTONS + 1)) + MIN_PHOTONS;

		let finalPhotons = basePhotons;

		if (isExcited) {
			// Excited photons give 1 excited photon currency (or 2 if double chance)
			const excitedDoubleChance = getExcitedDoubleChance();
			const baseExcited = Math.random() < excitedDoubleChance ? 2 : 1;

			// Add bonus from max photon value
			const maxPhotonValue = MAX_PHOTONS + photonValueBonus;
			const fromMaxBonusFactor = getExcitedFromMaxBonus();

			finalPhotons = baseExcited + (maxPhotonValue * fromMaxBonusFactor);
		} else {
			// Apply double chance for normal photons
			finalPhotons = Math.random() < doubleChance ? (basePhotons + photonValueBonus) * 2 : basePhotons + photonValueBonus;
		}

		// Calculate Max Lifetime
		let maxLifetime = baseCircleLifetime + lifetimeBonus;
		if (isExcited) {
			maxLifetime *= getExcitedLifetimeMultiplier();
		}

		const circle: Circle = {
			id: nextId++,
			x: Math.random() * (rect.width - margin * 2) + margin,
			y: Math.random() * (rect.height - margin * 2) + margin,
			size: baseSize * sizeMultiplier,
			photons: Math.floor(finalPhotons),
			lifetime: 0,
			maxLifetime: maxLifetime,
			rotation: Math.random() * 360,
			type: isExcited ? 'excited' : 'normal',
			baseValue: isExcited ? 1 : 1
		};

		circles = [...circles, circle];
		// Limit the number of circles to 100
		circles = circles.slice(0, MAX_CIRCLES);
	}

	function clickCircle(circle: Circle, event: MouseEvent) {
		if (circle.type === 'excited') {
			currenciesManager.add(CurrenciesTypes.EXCITED_PHOTONS, circle.photons);
		} else {
			currenciesManager.add(CurrenciesTypes.PHOTONS, circle.photons);
		}

		circles = circles.filter((c) => c.id !== circle.id);

		const particleCount = Math.floor(circle.photons / 2) + 1;
		const addedParticles: Particle[] = [];
		const currencyType = circle.type === 'excited' ? CurrenciesTypes.EXCITED_PHOTONS : CurrenciesTypes.PHOTONS;

		for (let i = 0; i < particleCount; i++) {
			const particle = createClickParticleSync(event.clientX, event.clientY, currencyType);
			if (particle) addedParticles.push(particle);
		}
		if (addedParticles.length > 0) {
			addParticles(addedParticles);
		}

		// Excited stabilization: interacting with the realm resets/collapses it
		const excitedStabilizationLevel = gameManager.photonUpgrades['excited_stabilization'] || 0;
		if (excitedStabilizationLevel > 0) {
			gameManager.lastInteractionTime = Date.now();
		}
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

	// Update circles logic
	$effect(() => {
		lastUpdateTime = Date.now();
		const interval = setInterval(updateCircles, 16);
		return () => clearInterval(interval);
	});

	// Calculate auto-clicks per second from photon upgrades
	const photonAutoClicksPerSecond = $derived.by(() => {
		if (!gameManager.settings.automation.autoClickPhotons) return 0;
		const autoClickerLevel = gameManager.photonUpgrades['auto_clicker'] || 0;
		if (autoClickerLevel === 0) return 0;

		const upgrade = ALL_PHOTON_UPGRADES['auto_clicker'];
		const effects = upgrade.effects(autoClickerLevel);

		// Apply the effect to get clicks per second
		return effects.reduce((total, effect) => {
			if (effect.type === 'auto_click') {
				return effect.apply(total, gameManager);
			}
			return total;
		}, 0);
	});

	// Calculate current spawn rate reactively
	const currentSpawnRate = $derived(getSpawnRate());

	// Set up auto-clicker subscription
	$effect(() => {
		const clicksPerSecond = photonAutoClicksPerSecond;
		if (clicksPerSecond > 0) {
			const interval = setInterval(() => simulateClick(), 5000 / clicksPerSecond);
			return () => clearInterval(interval);
		}
	});

	// Update spawn rate when upgrades change
	$effect(() => {
		const interval = setInterval(spawnCircle, currentSpawnRate);
		return () => clearInterval(interval);
	});

	onMount(() => {
		lastUpdateTime = Date.now();
	});

	const opacity = $derived((circle: Circle) => Math.max(0, 1 - circle.lifetime / circle.maxLifetime));
	const scale = $derived((circle: Circle) => {
		const fadeInDuration = 150; // 0.15s
		if (circle.lifetime < fadeInDuration) {
			return circle.lifetime / fadeInDuration;
		}
		return 1;
	});
</script>

<div
	class="fixed inset-0 pt-12 lg:pt-4 transition-all duration-1000 ease-in-out {mobile.current ? 'overflow-y-auto' : ''}"
	style="background: linear-gradient(135deg, rgba(139, 69, 191, 0.1) 0%, rgba(75, 0, 130, 0.1) 50%, rgba(139, 69, 191, 0.1) 100%);"
>
	<div class="h-full flex flex-col lg:flex-row px-4 pt-12 pb-6 max-w-7xl mx-auto gap-4 {mobile.current ? 'min-h-screen' : ''}">
		<!-- Game Area - Left side (2/3 on desktop, full width on mobile) -->
		<div class="flex-1 lg:w-2/3 flex flex-col items-center">
			<PhotonCounter />

			<div
				class="relative w-full {mobile.current ? 'h-[40vh] min-h-75' : 'h-87.5 lg:h-162.5'} overflow-hidden"
				data-photon-realm
				bind:this={container}
			>
				{#each circles as circle (circle.id)}
					<button
						class="absolute cursor-pointer flex items-center justify-center rounded-full"
						onclick={(event) => clickCircle(circle, event)}
						onpointerenter={(event) => {
							if (gameManager.photonUpgrades['feature_hover_collection'] > 0) {
								clickCircle(circle, event);
							}
						}}
						style="
							height: {circle.size}px;
							left: {circle.x}px;
							opacity: {opacity(circle)};
							top: {circle.y}px;
							transform: translate(-50%, -50%) scale({scale(circle)});
							width: {circle.size}px;
						"
					>
						<div class="w-full h-full {circle.type === 'excited' ? 'animate-pulse' : ''}">
							<Currency
								name={circle.type === 'excited' ? CurrenciesTypes.EXCITED_PHOTONS : CurrenciesTypes.PHOTONS}
								class="w-full h-full object-contain drop-shadow-[0_0_10px_{circle.type === 'excited' ? 'rgba(255,215,0,0.8)' : 'rgba(139,69,191,0.5)'}]"
								style="transform: rotate({circle.rotation}deg);"
							/>
						</div>
						<span
							class="absolute font-bold text-xs pointer-events-none drop-shadow-[0_0_5px_rgba(0,0,0,0.8)] {circle.type === 'excited' ? 'text-[#FFD700]' : 'text-white'}"
						>
							+{circle.photons}
						</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Upgrades Area - Right side (1/3 on desktop, full width on mobile) -->
		<div class="w-full lg:w-1/3 lg:max-w-xs {mobile.current ? 'max-h-[50vh] overflow-y-auto' : ''}">
			<PhotonUpgrades />
		</div>
	</div>
</div>
