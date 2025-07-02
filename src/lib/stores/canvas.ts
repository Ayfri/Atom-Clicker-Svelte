import {writable} from 'svelte/store';
import type {Particle} from '$helpers/particles';

export const particles = writable<Particle[]>([]);

// Enhanced environment detection - be very conservative
function isEnvironmentSuitable(): boolean {
	// Server-side rendering
	if (typeof window === 'undefined') return false;

	// Linux detection - PixiJS v8 has known issues on Linux without proper GPU
	const userAgent = navigator.userAgent.toLowerCase();
	if (userAgent.includes('linux') && !userAgent.includes('android')) {
		console.info('Linux environment detected - PixiJS particles disabled for compatibility');
		return false;
	}

	// Headless environments
	if (userAgent.includes('headless') ||
		userAgent.includes('phantom') ||
		userAgent.includes('selenium')) {
		return false;
	}

	// CI/testing environments
	if (typeof process !== 'undefined' && (
		process.env?.CI ||
		process.env?.NODE_ENV === 'test' ||
		process.env?.JEST_WORKER_ID
	)) {
		return false;
	}

	return true;
}

export function shouldCreateParticles(): boolean {
	return isEnvironmentSuitable();
}

export function addParticle(particle: Particle) {
	if (!shouldCreateParticles()) return;
	particles.update(current => [...current, particle]);
}

export function addParticles(newParticles: Particle[]) {
	if (!shouldCreateParticles()) return;
	particles.update(current => [...current, ...newParticles]);
}
