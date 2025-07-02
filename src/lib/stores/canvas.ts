import {writable} from 'svelte/store';
import type {Particle} from '$helpers/particles';

export let particles = writable<Particle[]>([]);

export const isPixiAvailable = writable<boolean>(true);

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

// Helper function to check if particles should be created
export function shouldCreateParticles(): boolean {
	return typeof window !== 'undefined' &&
		   window.document &&
		   (isWebGLSupported() || isWebGPUSupported());
}

// Check if WebGL is supported
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
