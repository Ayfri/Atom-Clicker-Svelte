<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { particles, shouldCreateParticles } from '$stores/canvas';
	import { app } from '$stores/pixi';

	let particlesContainer: any;
	let pixiApp: {
		renderer: any;
		stage: any;
		ticker: any;
		canvas: HTMLCanvasElement;
		destroy: () => void;
	} | null = null;

	const animate = (deltaTime: number) => {
		if (!pixiApp) return;

		particles.update(current => {
			let newParticles = [...current];

			newParticles = newParticles.filter(particle => {
				// Safety check for particle sprite properties
				if (!particle?.sprite) return false;

				if (!particle.sprite.parent && particlesContainer) {
					try {
						particlesContainer.addChild(particle.sprite);
					} catch (error) {
						// If addChild fails, skip this particle
						return false;
					}
				}

				particle.update?.(particle, deltaTime);

				return !particle.sprite.destroyed;
			});

			return newParticles;
		});
	};

	onMount(async () => {
		try {
			// Only skip in obvious non-browser environments
			if (!shouldCreateParticles()) {
				console.info('PixiJS particles disabled - environment not suitable');
				$app = null;
				return;
			}

			// Dynamically import PixiJS to avoid blocking the app if it fails to load
			const PIXI = await import('pixi.js');

			// Let PixiJS test itself - if autoDetectRenderer works, we're good to go!
			const renderer = await PIXI.autoDetectRenderer({
				backgroundAlpha: 0,
				antialias: true,
				width: window.innerWidth,
				height: window.innerHeight,
				preference: 'webgpu', // Will fallback to webgl automatically
			});

			// If we get here, PixiJS works in this environment
			console.log(`PixiJS initialized successfully with ${renderer.type} renderer`);

			// Create a minimal PixiJS app structure
			const stage = new PIXI.Container();
			const ticker = new PIXI.Ticker();

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

			ticker.add((ticker: any) => {
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

			particlesContainer = new PIXI.Container({
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
				queueResize: () => {
					// Resize the renderer to match current window size
					try {
						renderer.resize(window.innerWidth, window.innerHeight);
					} catch (error) {
						console.warn('Error during resize:', error);
					}
				}
			} as any;

		} catch (error) {
			// PixiJS couldn't be imported or initialized
			const errorMessage = error instanceof Error ? error.message : String(error);

			console.warn('PixiJS particles disabled - initialization failed:', errorMessage);

			// Clean failure - no particles, but game continues
			$app = null;
			pixiApp = null;
		}
	});

	onDestroy(() => {
		if (pixiApp) {
			try {
				pixiApp.ticker.remove((ticker: any) => animate(ticker.deltaTime));
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
