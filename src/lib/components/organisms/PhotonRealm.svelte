<script lang="ts">
	import { gameManager } from '$helpers/gameManager';
	import { STATS } from '$helpers/statConstants';
	import { formatNumber } from '$lib/utils';
	import { onDestroy, onMount } from 'svelte';
	import PhotonCounter from '@components/molecules/PhotonCounter.svelte';

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

	const SPAWN_RATE = 2000; // milliseconds between spawns
	const CIRCLE_LIFETIME = 5000; // 5 seconds before circle disappears
	const MIN_SIZE = 30;
	const MAX_SIZE = 80;
	const MIN_PHOTONS = 1;
	const MAX_PHOTONS = 10;

	function spawnCircle() {
		if (!container) return;

		const rect = container.getBoundingClientRect();
		const margin = MAX_SIZE;

		const circle: Circle = {
			id: nextId++,
			x: Math.random() * (rect.width - margin * 2) + margin,
			y: Math.random() * (rect.height - margin * 2) + margin,
			size: Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE,
			photons: Math.floor(Math.random() * (MAX_PHOTONS - MIN_PHOTONS + 1)) + MIN_PHOTONS,
			lifetime: 0,
			maxLifetime: CIRCLE_LIFETIME
		};

		circles = [...circles, circle];
	}

	function clickCircle(circle: Circle) {
		gameManager.addStat(STATS.PHOTONS, circle.photons);
		circles = circles.filter((c) => c.id !== circle.id);
	}

	function updateCircles() {
		const deltaTime = 16; // ~60fps
		circles = circles
			.map((circle) => ({
				...circle,
				lifetime: circle.lifetime + deltaTime
			}))
			.filter((circle) => circle.lifetime < circle.maxLifetime);
	}

	onMount(() => {
		spawnInterval = setInterval(spawnCircle, SPAWN_RATE);
		updateInterval = setInterval(updateCircles, 16);
	});

	onDestroy(() => {
		if (spawnInterval) clearInterval(spawnInterval);
		if (updateInterval) clearInterval(updateInterval);
	});

	$: opacity = (circle: Circle) => Math.max(0, 1 - circle.lifetime / circle.maxLifetime);
</script>

<div
	class="absolute inset-0 pt-12 lg:pt-4 transition-all duration-1000 ease-in-out"
	style="background: linear-gradient(135deg, rgba(139, 69, 191, 0.1) 0%, rgba(75, 0, 130, 0.1) 50%, rgba(139, 69, 191, 0.1) 100%);"
>
	<div class="h-full flex flex-col items-center justify-center px-4 max-w-6xl mx-auto">
		<div class="w-full max-w-4xl">
			<div class="flex flex-col items-center justify-start h-full w-full">
				<PhotonCounter />

				<div
					class="relative w-full h-96 sm:h-80 bg-gradient-to-br from-realm-900/20 via-realm-800/10 to-realm-900/20 border-2 border-realm-500/30 rounded-xl overflow-hidden"
					bind:this={container}
				>
					<div
						class="absolute top-5 left-1/2 transform -translate-x-1/2 text-center z-10 pointer-events-none"
					>
						<h2
							class="text-realm-400 text-2xl font-bold mb-2 drop-shadow-[0_0_10px_rgba(153,102,204,0.5)]"
						>
							Purple Realm
						</h2>
						<p class="text-white/70 text-sm">Click the violet circles to collect photons!</p>
					</div>

					{#each circles as circle (circle.id)}
						<button
							class="absolute rounded-full cursor-pointer flex items-center justify-center transition-all duration-100 hover:scale-110 active:scale-95 bg-gradient-to-br from-realm-400 to-realm-600 border-2 border-realm-300 shadow-[0_0_15px_rgba(153,102,204,0.4)] hover:shadow-[0_0_25px_rgba(153,102,204,0.6)] select-none"
							style="
								left: {circle.x}px;
								top: {circle.y}px;
								width: {circle.size}px;
								height: {circle.size}px;
								opacity: {opacity(circle)};
								transform: translate(-50%, -50%);
							"
							on:click={() => clickCircle(circle)}
						>
							<span
								class="text-white font-bold text-xs pointer-events-none drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]"
							>
								+{formatNumber(circle.photons)}
							</span>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Purple Realm Navigation -->
		<div class="mt-8 flex gap-4 flex-wrap justify-center">
			<div
				class="glass-panel p-4 rounded-lg border border-realm-500/30 bg-realm-900/20 backdrop-blur-sm"
			>
				<div class="text-center">
					<h3 class="text-realm-300 font-bold text-lg mb-2">Upgrades Available</h3>
					<div class="text-realm-400 text-sm">Use your photons to unlock powerful enhancements!</div>
				</div>
			</div>
		</div>
	</div>
</div>
