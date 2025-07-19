import {writable} from 'svelte/store';
import type {Particle} from '$helpers/particles';

const MAX_PARTICLES = 100; // Limit particles to prevent memory issues

export const particles = writable<Particle[]>([]);

// Simplified environment detection
function isEnvironmentSuitable(): boolean {
	// Server-side rendering
	if (typeof window === 'undefined') return false;

	// Headless environments
	if (typeof navigator !== 'undefined') {
		const userAgent = navigator.userAgent.toLowerCase();
		if (userAgent.includes('headless') ||
			userAgent.includes('phantom') ||
			userAgent.includes('selenium')) {
			return false;
		}
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
	particles.update(current => {
		const newParticles = [...current, particle];
		// Remove oldest particles if we exceed the limit
		if (newParticles.length > MAX_PARTICLES) {
			const removed = newParticles.splice(0, newParticles.length - MAX_PARTICLES);
			// Clean up removed particles
			removed.forEach(p => {
				try {
					p.sprite?.removeFromParent?.();
					p.sprite?.destroy?.();
				} catch (e) {
					console.warn('Error cleaning up particle:', e);
				}
			});
		}
		return newParticles;
	});
}

export function addParticles(newParticles: Particle[]) {
	if (!shouldCreateParticles()) return;
	particles.update(current => {
		const combined = [...current, ...newParticles];
		// Remove oldest particles if we exceed the limit
		if (combined.length > MAX_PARTICLES) {
			const removed = combined.splice(0, combined.length - MAX_PARTICLES);
			// Clean up removed particles
			removed.forEach(p => {
				try {
					p.sprite?.removeFromParent?.();
					p.sprite?.destroy?.();
				} catch (e) {
					console.warn('Error cleaning up particle:', e);
				}
			});
		}
		return combined;
	});
}
