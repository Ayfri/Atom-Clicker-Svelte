import {writable} from 'svelte/store';
import type {Particle} from '$helpers/particles';

export let particles = writable<Particle[]>([]);

export const isPixiAvailable = writable<boolean>(true);

// Cache for graphics support detection to avoid creating multiple WebGL contexts
let cachedGraphicsSupport: boolean | null = null;
let testCanvas: HTMLCanvasElement | null = null;
let testContext: WebGLRenderingContext | null = null;

// Helper function to safely add particles only if PixiJS is available
export function addParticle(particle: Particle) {
	particles.update(current => {
		// Only add if we have PixiJS support and we're in browser
		if (typeof window !== 'undefined' && window.document) {
			return [...current, particle];
		}
		return current;
	});
}

// Helper function to safely add multiple particles
export function addParticles(newParticles: Particle[]) {
	particles.update(current => {
		// Only add if we have PixiJS support and we're in browser
		if (typeof window !== 'undefined' && window.document) {
			return [...current, ...newParticles];
		}
		return current;
	});
}

// Check if WebGL is supported (cached result)
function isWebGLSupported(): boolean {
	try {
		// Reuse the same canvas and context for testing
		if (!testCanvas) {
			testCanvas = document.createElement('canvas');
		}
		if (!testContext) {
			testContext = (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')) as WebGLRenderingContext;
		}
		return !!(testContext && testContext.getExtension);
	} catch (e) {
		return false;
	}
}

// Check if WebGPU is supported (cached result)
function isWebGPUSupported(): boolean {
	return 'gpu' in navigator;
}

// Helper function to check if particles should be created (cached result)
export function shouldCreateParticles(): boolean {
	// Return cached result if available
	if (cachedGraphicsSupport !== null) {
		return cachedGraphicsSupport;
	}

	// Test once and cache the result
	cachedGraphicsSupport = typeof window !== 'undefined' &&
		   window.document &&
		   (isWebGLSupported() || isWebGPUSupported());

	return cachedGraphicsSupport;
}
