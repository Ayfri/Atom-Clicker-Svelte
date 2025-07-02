<script lang="ts">
	import { autoDetectRenderer, Container, type Renderer, Ticker } from 'pixi.js';
	import { onDestroy, onMount } from 'svelte';
	import { particles } from '$stores/canvas';
	import { app } from '$stores/pixi';

	let particlesContainer: Container;
	let pixiApp: {
		renderer: Renderer;
		stage: Container;
		ticker: Ticker;
		canvas: HTMLCanvasElement;
		destroy: () => void;
	} | null = null;

	const animate = (deltaTime: number) => {
		if (!pixiApp) return;

		particles.update(current => {
			let newParticles = [...current];

			newParticles = newParticles.filter(particle => {
				if (!particle.sprite.parent && particlesContainer) {
					particlesContainer.addChild(particle.sprite);
				}

				particle.update?.(particle, deltaTime);

				return !particle.sprite.destroyed;
			});

			return newParticles;
		});
	};

	onMount(async () => {
		try {
			// Let PixiJS test itself - if autoDetectRenderer works, we're good to go!
			const renderer = await autoDetectRenderer({
				backgroundAlpha: 0,
				antialias: true,
				width: window.innerWidth,
				height: window.innerHeight,
				preference: 'webgpu', // Will fallback to webgl automatically
			});

			// If we get here, PixiJS works in this environment
			console.log(`PixiJS initialized successfully with ${renderer.type} renderer`);

			// Create a minimal PixiJS app structure
			const stage = new Container();
			const ticker = new Ticker();

			pixiApp = {
				renderer,
				stage,
				ticker,
				canvas: renderer.canvas as HTMLCanvasElement,
				destroy: () => {
					try {
						ticker.destroy();
						renderer.destroy();
					} catch (error) {
						console.warn('Error during renderer cleanup:', error);
					}
				}
			};

			document.body.appendChild(pixiApp.canvas);

			const getFps = () =>
				new Promise<number>(resolve =>
					requestAnimationFrame(t1 =>
						requestAnimationFrame(t2 => resolve(1000 / (t2 - t1)))
					)
				);

			const fps = await getFps();

			ticker.add((ticker) => {
				animate(ticker.deltaTime);
				// Safely render the stage
				try {
					renderer.render(stage);
				} catch (error) {
					console.warn('Render error:', error);
				}
			});

			ticker.minFPS = Math.round(fps);
			ticker.start();

			particlesContainer = new Container({
				isRenderGroup: true,
			});

			stage.addChild(particlesContainer);

			// Store app reference for compatibility
			$app = {
				canvas: pixiApp.canvas,
				ticker: pixiApp.ticker,
				stage: pixiApp.stage,
				renderer: pixiApp.renderer,
				destroy: pixiApp.destroy,
			} as any;

		} catch (error) {
			// PixiJS itself couldn't initialize - this is the most reliable test
			const errorMessage = error instanceof Error ? error.message : String(error);

			console.warn('PixiJS particles disabled - renderer initialization failed:', errorMessage);

			// Provide helpful information for common issues
			if (errorMessage.includes('CanvasRenderer is not yet implemented')) {
				console.info('💡 Tip: For headless environments, consider using pixi.js-legacy or @pixi/node instead.');
			} else if (errorMessage.includes('WebGPU')) {
				console.info('💡 Tip: WebGPU experimental on this platform, falling back gracefully.');
			}

			// Clean failure - no particles, but game continues
			$app = null;
			pixiApp = null;
		}
	});

	onDestroy(() => {
		if (pixiApp) {
			try {
				pixiApp.ticker.remove((ticker) => animate(ticker.deltaTime));
				if (pixiApp.canvas && pixiApp.canvas.parentNode) {
					document.body.removeChild(pixiApp.canvas);
				}
				pixiApp.destroy();
			} catch (error) {
				console.warn('Error during PixiJS cleanup:', error);
			}
		}
		$app = null;
	});
</script>
