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
	let isPixiSupported = true;

	const animate = (deltaTime: number) => {
		if (!isPixiSupported || !pixiApp) return;

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

	// Check if WebGL is supported at all
	function isWebGLSupported(): boolean {
		try {
			const canvas = document.createElement('canvas');
			const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
			return !!(gl && gl.getExtension);
		} catch (e) {
			return false;
		}
	}

	// Check if WebGPU is supported
	function isWebGPUSupported(): boolean {
		return 'gpu' in navigator;
	}

	onMount(async () => {
		// Check for any graphics support before trying PixiJS
		const hasWebGPU = isWebGPUSupported();
		const hasWebGL = isWebGLSupported();

		if (!hasWebGPU && !hasWebGL) {
			console.warn('Neither WebGPU nor WebGL are supported, particles disabled');
			isPixiSupported = false;
			$app = null;
			return;
		}

		try {
			// Try to create a renderer with WebGPU fallback to WebGL
			const renderer = await autoDetectRenderer({
				backgroundAlpha: 0,
				antialias: true,
				resizeTo: document.body,
				// Force fallback options
				preference: 'webgpu', // Will fallback to webgl automatically
			});

			// Verify renderer was created successfully
			if (!renderer || !renderer.canvas) {
				throw new Error('Failed to create renderer');
			}

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

			console.log(`PixiJS initialized successfully with ${renderer.type} renderer`);
		} catch (error) {
			console.warn('Failed to initialize PixiJS, particles disabled. Error:', error);
			isPixiSupported = false;
			$app = null;

			// Clean up any partial initialization
			if (pixiApp) {
				try {
					pixiApp.destroy();
				} catch (cleanupError) {
					console.warn('Error during cleanup:', cleanupError);
				}
				pixiApp = null;
			}
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
