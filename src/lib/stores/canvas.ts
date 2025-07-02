import {writable} from 'svelte/store';
import type {Particle} from '$helpers/particles';

export let particles = writable<Particle[]>([]);

export const isPixiAvailable = writable<boolean>(true);

// Helper function to safely add particles only if PixiJS is available
export function addParticle(particle: Particle) {
	particles.update(current => {
		// Only add if we're in browser
		if (typeof window !== 'undefined' && window.document) {
			return [...current, particle];
		}
		return current;
	});
}

// Helper function to safely add multiple particles
export function addParticles(newParticles: Particle[]) {
	particles.update(current => {
		// Only add if we're in browser
		if (typeof window !== 'undefined' && window.document) {
			return [...current, ...newParticles];
		}
		return current;
	});
}

// Simplified function - just check if we're in browser
// The real compatibility test is done by PixiJS autoDetectRenderer itself
export function shouldCreateParticles(): boolean {
	return typeof window !== 'undefined' && !!window.document;
}
