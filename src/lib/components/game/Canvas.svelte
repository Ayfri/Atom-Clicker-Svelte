<script lang="ts">
	import { loadParticleAssets, ParticleEngine } from '$helpers/particles';
	import { onDestroy, onMount } from 'svelte';
	import { particleQueue, shouldCreateParticles } from '$stores/canvas';
	import { app } from '$stores/pixi';
	import { innerWidth, innerHeight } from 'svelte/reactivity/window';

	let pixiApp: any = null;
	let particleEngine: ParticleEngine | null = null;

	// Responsive resize
	$effect(() => {
		const w = innerWidth.current || window.innerWidth;
		const h = innerHeight.current || window.innerHeight;
		if (pixiApp?.renderer) {
			pixiApp.renderer.resize(w, h);
		}
	});

	onMount(async () => {
		if (!shouldCreateParticles()) {
			console.info('Particle system disabled.');
			return;
		}

		try {
			const PIXI = await import('pixi.js');
			await loadParticleAssets();

			// Initialize Renderer with performance optimizations
			const renderer = await PIXI.autoDetectRenderer({
				width: innerWidth.current ?? window.innerWidth,
				height: innerHeight.current ?? window.innerHeight,
				backgroundAlpha: 0,
				antialias: false,
				preference: 'webgpu',
			});

			const stage = new PIXI.Container();
			const ticker = new PIXI.Ticker();

			// Setup Engine
			particleEngine = new ParticleEngine(PIXI, stage, particleQueue);

			pixiApp = {
				renderer,
				stage,
				ticker,
				canvas: renderer.canvas,
				destroy: () => {
					ticker.destroy();
					renderer.destroy();
					particleEngine?.destroy();
				}
			};

			document.body.appendChild(renderer.canvas as Node);

			// Animation Loop
			ticker.add((t: any) => {
				particleEngine?.update(t.deltaTime);
				renderer.render(stage);
			});

			ticker.start();
			$app = pixiApp;

		} catch (err) {
			console.warn('PixiJS init failed:', err);
		}
	});

	onDestroy(() => {
		if (pixiApp) {
			if (pixiApp.canvas?.parentNode) {
				document.body.removeChild(pixiApp.canvas);
			}
			pixiApp.destroy();
		}
		$app = null;
	});
</script>
