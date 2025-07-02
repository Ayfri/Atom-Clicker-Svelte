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
			return !!(gl && (gl as WebGLRenderingContext).getExtension);
		} catch (e) {
			return false;
		}
	}

	// Check if WebGPU is supported
	function isWebGPUSupported(): boolean {
		return 'gpu' in navigator;
	}



	// Enhanced graphics support detection
	function hasGraphicsSupport(): { supported: boolean; reason?: string } {
		// Basic checks first
		const hasWebGPU = isWebGPUSupported();
		const hasWebGL = isWebGLSupported();

		if (!hasWebGPU && !hasWebGL) {
			return { supported: false, reason: 'Neither WebGPU nor WebGL are supported' };
		}

		// If we only have WebGL, check if it's actually hardware accelerated
		if (!hasWebGPU && hasWebGL) {
			try {
				const canvas = document.createElement('canvas');
				const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

				if (gl) {
					const webgl = gl as WebGLRenderingContext;
					// Check renderer info
					const renderer = webgl.getParameter(webgl.RENDERER);
					const vendor = webgl.getParameter(webgl.VENDOR);

					// Detect software rendering (common indicators)
					const softwareIndicators = [
						'software', 'Software', 'SOFTWARE',
						'mesa', 'Mesa', 'MESA',
						'llvmpipe', 'LLVMpipe', 'LLVMPIPE',
						'swrast', 'SwiftShader'
					];

					const rendererString = String(renderer || '');
					const vendorString = String(vendor || '');

					const isSoftwareRenderer = softwareIndicators.some(indicator =>
						rendererString.includes(indicator) || vendorString.includes(indicator)
					);

					if (isSoftwareRenderer) {
						return {
							supported: false,
							reason: `Software-only WebGL detected (${rendererString})`
						};
					}

					// Additional check: try to detect very limited WebGL support
					const debugInfo = webgl.getExtension('WEBGL_debug_renderer_info');
					if (debugInfo) {
						const unmaskedRenderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
						const unmaskedVendor = webgl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

						const unmaskedRendererString = String(unmaskedRenderer || '');
						const unmaskedVendorString = String(unmaskedVendor || '');

						const isUnmaskedSoftware = softwareIndicators.some(indicator =>
							unmaskedRendererString.includes(indicator) || unmaskedVendorString.includes(indicator)
						);

						if (isUnmaskedSoftware) {
							return {
								supported: false,
								reason: `Software-only WebGL detected (${unmaskedRendererString})`
							};
						}
					}

					// Test WebGL performance - if it's too slow, it's probably software rendering
					try {
						const start = performance.now();

						// Create a simple test
						const buffer = webgl.createBuffer();
						webgl.bindBuffer(webgl.ARRAY_BUFFER, buffer);
						webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1]), webgl.STATIC_DRAW);

						const end = performance.now();

						// If basic operations are extremely slow, probably software rendering
						if (end - start > 50) {
							return {
								supported: false,
								reason: `WebGL operations too slow (${Math.round(end - start)}ms)`
							};
						}

						webgl.deleteBuffer(buffer);
					} catch (perfError) {
						console.warn('WebGL performance test failed:', perfError);
					}
				}
			} catch (e) {
				console.warn('Could not detect GPU acceleration details:', e);
			}
		}

		return { supported: true };
	}

	onMount(async () => {
		// Enhanced pre-check for graphics support
		const graphicsCheck = hasGraphicsSupport();

		if (!graphicsCheck.supported) {
			console.warn(`PixiJS particles disabled: ${graphicsCheck.reason}`);
			isPixiSupported = false;
			$app = null;
			return;
		}

		try {
			// Try to create a renderer with WebGPU fallback to WebGL
			const renderer = await autoDetectRenderer({
				backgroundAlpha: 0,
				antialias: true,
				width: window.innerWidth,
				height: window.innerHeight,
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
			const errorMessage = error instanceof Error ? error.message : String(error);

			// Provide helpful information for common issues
			if (errorMessage.includes('CanvasRenderer is not yet implemented')) {
				console.warn('PixiJS v8 CanvasRenderer not available. For headless environments, consider using pixi.js-legacy or @pixi/node instead.');
			} else {
				console.warn('Failed to initialize PixiJS, particles disabled. Error:', error);
			}

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
