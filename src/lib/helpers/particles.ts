import { CURRENCIES, type CurrencyName } from '$data/currencies';
import { type Writable } from 'svelte/store';

// --- Interfaces ---

export interface Particle {
	/** Higher layers are drawn last. Text sits above icons. */
	layer: number;
	draw: (ctx: CanvasRenderingContext2D) => void;
	update: (dt: number) => boolean;
}

// --- Constants ---

const MAX_PARTICLES = 150;
const ICON_LAYER = 0;
const TEXT_LAYER = 1;
/** Matches the previous PixiJS text: 26px bold Arial drawn at a 0.5 scale. */
const TEXT_FONT = 'bold 13px Arial, sans-serif';

// --- Assets ---

const images = new Map<string, HTMLImageElement>();

export const loadParticleAssets = async () => {
	try {
		await Promise.all(
			Object.values(CURRENCIES).map(
				currency =>
					new Promise<void>(resolve => {
						const image = new Image();
						image.onload = () => {
							images.set(currency.id, image);
							resolve();
						};
						image.onerror = () => resolve();
						image.src = `/currencies/${currency.id}.svg`;
					})
			)
		);
	} catch (e) {
		console.warn('Particle assets failed:', e);
	}
};

// --- Creators ---

export const createClickParticleSync = (x: number, y: number, currency: CurrencyName): Particle | null => {
	const image = images.get(CURRENCIES[currency].id);
	if (!image) return null;

	const rotation = Math.random() * Math.PI * 2;
	let alpha = 0.8;
	let scale = 0.1;
	let px = x;
	let py = y + document.documentElement.scrollTop;
	let sx = (1.5 + Math.random() * 0.5) * Math.cos(rotation);
	let sy = (1.5 + Math.random() * 0.5) * Math.sin(rotation);

	return {
		layer: ICON_LAYER,
		draw: ctx => {
			const width = image.width * scale;
			const height = image.height * scale;

			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.translate(px, py);
			ctx.rotate(rotation);
			ctx.drawImage(image, -width / 2, -height / 2, width, height);
			ctx.restore();
		},
		update: dt => {
			const damp = Math.pow(0.995, dt);
			sx *= damp;
			sy *= damp;
			px += sx * dt;
			py += sy * dt;
			scale -= 0.001 * dt;
			alpha -= 0.015 * dt;
			return alpha > 0 && scale > 0;
		}
	};
};

export const createClickTextParticleSync = (x: number, y: number, text: string): Particle | null => {
	let alpha = 1;
	let py = y + document.documentElement.scrollTop;
	let sy = -1.5;

	return {
		layer: TEXT_LAYER,
		draw: ctx => {
			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.fillStyle = 'white';
			ctx.font = TEXT_FONT;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(text, x, py);
			ctx.restore();
		},
		update: dt => {
			sy *= Math.pow(0.995, dt);
			py += sy * dt;
			alpha -= 0.015 * dt;
			return alpha > 0;
		}
	};
};

// --- Engine ---

export class ParticleEngine {
	private particles: Particle[] = [];
	private unsubscribe: () => void;

	constructor(queue: Writable<Particle[]>) {
		this.unsubscribe = queue.subscribe(newParticles => {
			if (!newParticles.length) return;
			for (const particle of newParticles) {
				if (this.particles.length >= MAX_PARTICLES) break;
				this.particles.push(particle);
			}
			queue.set([]);
		});
	}

	update(dt: number) {
		for (let i = this.particles.length - 1; i >= 0; i--) {
			if (!this.particles[i].update(dt)) this.particles.splice(i, 1);
		}
	}

	draw(ctx: CanvasRenderingContext2D) {
		for (const particle of this.particles) {
			if (particle.layer === ICON_LAYER) particle.draw(ctx);
		}
		for (const particle of this.particles) {
			if (particle.layer === TEXT_LAYER) particle.draw(ctx);
		}
	}

	get count() {
		return this.particles.length;
	}

	destroy() {
		this.unsubscribe();
		this.particles = [];
	}
}
