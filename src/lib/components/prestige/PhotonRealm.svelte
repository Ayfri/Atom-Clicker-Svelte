<script lang="ts">
	import { gameManager } from '$helpers/GameManager.svelte';
	import { createClickParticleSync, type Particle } from '$helpers/particles';
	import { onDestroy, onMount } from 'svelte';
	import PhotonCounter from '@components/prestige/PhotonCounter.svelte';
	import PhotonUpgrades from '@components/prestige/PhotonUpgrades.svelte';
	import Currency from '@components/ui/Currency.svelte';
	import { addParticles } from '$stores/canvas';
	import { CurrenciesTypes } from '$data/currencies';
	import { PHOTON_UPGRADES } from '$data/photonUpgrades';
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
		const level = gameManager.photonUpgrades['photon_spawn_rate'] || 0;
		if (level === 0) return baseSpawnRate;

		const upgrade = PHOTON_UPGRADES['photon_spawn_rate'];
		const effects = upgrade.effects(level);

		return effects.reduce((rate, effect) => {
			if (effect.type === 'power_up_interval') {
				return effect.apply(rate, gameManager);
			}
			return rate;
		}, baseSpawnRate);
	}

	function getSizeMultiplier() {
		const level = gameManager.photonUpgrades['circle_size'] || 0;
		if (level === 0) return baseSizeMultiplier;

		const upgrade = PHOTON_UPGRADES['circle_size'];
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

		const upgrade = PHOTON_UPGRADES['photon_value'];
		const effects = upgrade.effects(level);

		return effects.reduce((bonus, effect) => {
			if (effect.type === 'click') {
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
			const upgrade = PHOTON_UPGRADES['circle_lifetime'];
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

		const upgrade = PHOTON_UPGRADES['energetic_decay'];
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

		const upgrade = PHOTON_UPGRADES['excited_yield'];
		const effects = upgrade.effects(level);

		return effects.reduce((chance, effect) => {
			if (effect.type === 'excited_photon_double') {
				return effect.apply(chance, gameManager);
			}
			return chance;
		}, 0);
	}

	function getIsExcited() {
		const baseChance = 0.001; // 0.1%
		const level = gameManager.photonUpgrades['quantum_fluctuation'] || 0;
		let chance = baseChance;

		if (level > 0) {
			const upgrade = PHOTON_UPGRADES['quantum_fluctuation'];
			const effects = upgrade.effects(level);
			chance = effects.reduce((c, effect) => {
				if (effect.type === 'excited_photon_chance') {
					return effect.apply(c, gameManager);
				}
				return c;
			}, chance);
		}

		return Math.random() < chance;
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
			finalPhotons = Math.random() < excitedDoubleChance ? 2 : 1;
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
			gameManager.addExcitedPhotons(circle.photons);
		} else {
			gameManager.addPhotons(circle.photons);
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

		// For excited stabilization, clicking on purple realm collapses the field (TODO check requirement)
		// Requirement: "Excited Stabilization: ... but it now collapse also when you click on purple realm."
		// Does simply clicking a circle count as "clicking on purple realm"?
		// Or clicking the background? The requirement says "click on purple realm".
		// Usually this means any interaction in the realm. Ideally clicking a circle is distinct, but let's assume it might trigger if implemented broadly.
		// However, I'll stick to the requested mechanics. If needed I'd add a click handler on the container.

		// Wait, "Excited Stabilization" effect logic says "Increase stability speed and bonus...".
		// The collapsing part is likely a side effect I need to implement in GameManager or here.
		// Since I don't see "collapse logic" in GameManager for clicking, I assume it's related to the "Stability" feature which resets if you don't interact?
		// Actually, stability usually collapses if you switch realms. This upgrade makes it collapse on clicks in Purple realm too (presumably effectively nerfing it for active play here?).
		// Let's implement the collapse trigger if the upgrade is active.
		const excitedStabilizationLevel = gameManager.photonUpgrades['excited_stabilization'] || 0;
		if (excitedStabilizationLevel > 0) {
			// Trigger collapse or negative effect.
			// Since I don't see a "collapse" method exposed, and stability logic is time-based.
			// "Collapse also when you click on purple realm".
			// I will simply reset `lastInteractionTime` to something far back? No, that would reduce progress.
			// Currently stability decreases if `progress` goes down? No, it resets if you leave I guess.
			// Let's look at GameManager stability logic.
			// It uses `lastInteractionTime`.
			// If I click, `lastInteractionTime` updates, keeping it ALIVE.
			// "Collapse" means it should GO DOWN.
			// So clicking should NOT update lastInteractionTime? Or it should explicitly REDUCE progress.
			// Given the complexity and lack of "collapse" method config, I will skip implementing the collapse logic unless I see how stability works exactly.
			// GameManager line 238: `const progress = Math.min(Math.max(elapsed / timeRequired, 0), 1);`
			// `elapsed` is time SINCE last interaction. So the longer you DON'T interact, the more it grows (wait?).
			// Line 232: `timeRequired`.
			// Line 238: `elapsed`.
			// Logic: `elapsed` increases -> progress increases.
			// So interacting (updating `lastInteractionTime`) resets `elapsed` to 0, resetting progress to 0?
			// Line 29: `lastInteractionTime = $state(Date.now());`
			// `addPhotons` calls `addPhotons` -> doesn't update `lastInteractionTime`.
			// `incrementClicks` updates `lastInteractionTime`.
			// Use `addExcitedPhotons` -> updates `totalExcited...`.
			// If `clickCircle` calls `gameManager.addPhotons`, it does NOT call `incrementClicks`.
			// So clicking circles does NOT update `lastInteractionTime` currently?
			// Let's check `addPhotons` in `GameManager`. It strictly adds `photons`.
			// `GameManager` methods for powerups do update `lastInteractionTime`.
			// So effectively, clicking circles is "passive" regarding stability?
			// If "Collapse also when you click on purple realm", maybe it means it forces valid interaction?
			// If interacting RESETS progress (because `elapsed` becomes 0), then clicking DOES collapse it.
			// So if I call `gameManager.lastInteractionTime = Date.now()` it will collapse.
			// I should probably check if clicking circles normally does this. It currently doesn't seem to.
			// So I will add: `if (excitedStabilization > 0) gameManager.lastInteractionTime = Date.now();`
			// This will make `elapsed` = 0, so `progress` = 0, so `stabilityMultiplier` = 1 (collapse).
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

	// Calculate auto-clicks per second from photon upgrades
	const photonAutoClicksPerSecond = $derived.by(() => {
		if (!gameManager.settings.automation.autoClickPhotons) return 0;
		const autoClickerLevel = gameManager.photonUpgrades['auto_clicker'] || 0;
		if (autoClickerLevel === 0) return 0;

		const upgrade = PHOTON_UPGRADES['auto_clicker'];
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

	// Set up auto-clicker subscription like in Atom.svelte
	$effect(() => {
		const clicksPerSecond = photonAutoClicksPerSecond;
		if (autoClickInterval) clearInterval(autoClickInterval);
		if (clicksPerSecond > 0) {
			autoClickInterval = setInterval(() => simulateClick(), 5000 / clicksPerSecond);
		}
		return () => {
			if (autoClickInterval) clearInterval(autoClickInterval);
		};
	});

	// Update spawn rate when upgrades change
	$effect(() => {
		const newSpawnRate = currentSpawnRate;
		if (spawnInterval) {
			clearInterval(spawnInterval);
			spawnInterval = setInterval(spawnCircle, newSpawnRate);
		}
		return () => {
			if (spawnInterval) clearInterval(spawnInterval);
		};
	});

	onMount(() => {
		lastUpdateTime = Date.now();
		spawnInterval = setInterval(spawnCircle, getSpawnRate());
		updateInterval = setInterval(updateCircles, 16);
	});

	onDestroy(() => {
		if (spawnInterval) clearInterval(spawnInterval);
		if (updateInterval) clearInterval(updateInterval);
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
						class="absolute rounded-full cursor-pointer flex items-center justify-center"
						style="
							left: {circle.x}px;
							top: {circle.y}px;
							width: {circle.size}px;
							height: {circle.size}px;
							opacity: {opacity(circle)};
							transform: translate(-50%, -50%) scale({scale(circle)});
						"
						onclick={(event) => clickCircle(circle, event)}
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
