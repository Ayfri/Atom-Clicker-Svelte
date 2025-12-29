import { CURRENCIES, type CurrencyName } from "$data/currencies";
import { type Writable } from 'svelte/store';

let PIXI: typeof import('pixi.js');
let hitTextStyle: any;

// --- Interfaces ---

export interface Particle {
	sprite: any;
	update: (dt: number) => boolean;
}

// --- Pooling ---

const POOL_LIMIT = 100;
const pool = {
	icon: [] as any[],
	text: [] as any[]
};

const recycle = (p: Particle) => {
	const s = p.sprite;
	s.visible = false;
	s.removeFromParent();

	const type = s instanceof PIXI.Text ? 'text' : 'icon';
	if (pool[type].length < POOL_LIMIT) {
		pool[type].push(s);
	} else {
		s.destroy();
	}
};

const getSprite = (type: 'icon' | 'text', setup: (s: any) => void) => {
	let s = pool[type].pop();
	if (!s) {
		s = type === 'text'
			? new PIXI.Text({ style: hitTextStyle, anchor: 0.5 })
			: new PIXI.Sprite({ anchor: 0.5 });
		s.eventMode = 'none';
	}
	s.visible = true;
	setup(s);
	return s;
};

// --- Assets ---

export const loadParticleAssets = async () => {
	try {
		PIXI = await import('pixi.js');
		const icons = Object.values(CURRENCIES).map(c => c.icon);

		await PIXI.Assets.load(icons.map(alias => ({
			alias,
			src: `currencies/${alias}.svg`,
			data: { parse: true }
		})));

		hitTextStyle = new PIXI.TextStyle({
			fill: 'white',
			fontWeight: 'bold',
			fontFamily: 'Arial, sans-serif' // Explicit font family for consistency
		});
	} catch (e) {
		console.warn('Particle assets failed:', e);
	}
};

// --- Creators ---

export const createClickParticleSync = (x: number, y: number, currency: CurrencyName): Particle | null => {
	if (!PIXI) return null;

	const sprite = getSprite('icon', s => {
		s.texture = PIXI.Assets.get(CURRENCIES[currency].icon);
		s.alpha = 0.8;
		s.scale.set(0.1);
		s.position.set(x, y + document.documentElement.scrollTop);
		s.rotation = Math.random() * Math.PI * 2;
	});

	let sx = (1.5 + Math.random() * 0.5) * Math.cos(sprite.rotation);
	let sy = (1.5 + Math.random() * 0.5) * Math.sin(sprite.rotation);

	return {
		sprite,
		update: (dt) => {
			const damp = Math.pow(0.995, dt);
			sx *= damp;
			sy *= damp;
			sprite.x += sx * dt;
			sprite.y += sy * dt;
			sprite.scale.x -= 0.001 * dt;
			sprite.scale.y -= 0.001 * dt;
			sprite.alpha -= 0.015 * dt;
			return sprite.alpha > 0 && sprite.scale.x > 0;
		}
	};
};

export const createClickTextParticleSync = (x: number, y: number, text: string): Particle | null => {
	if (!PIXI) return null;

	const sprite = getSprite('text', s => {
		s.text = text;
		s.alpha = 1;
		s.scale.set(0.5);
		s.position.set(x, y + document.documentElement.scrollTop);
		s.zIndex = 10; // Ensure text is consistently on top
	});

	let sy = -1.5;

	return {
		sprite,
		update: (dt) => {
			sy *= Math.pow(0.995, dt);
			sprite.y += sy * dt;
			sprite.alpha -= 0.015 * dt;
			return sprite.alpha > 0;
		}
	};
};

// --- Engine ---

export class ParticleEngine {
	private particles: Particle[] = [];
	private container: any;
	private unsubscribe: () => void;

	constructor(
		private PIXI_INSTANCE: typeof import('pixi.js'),
		private stage: any,
		queue: Writable<Particle[]>
	) {
		this.container = new PIXI_INSTANCE.Container({
			isRenderGroup: true,
			sortableChildren: true // Required for text zIndex
		});
		this.container.cullable = true;
		stage.addChild(this.container);

		this.unsubscribe = queue.subscribe(newParticles => {
			if (!newParticles.length) return;
			// Add valid particles to system
			for (const p of newParticles) {
				if (this.particles.length < 150 && p.sprite) {
					this.container.addChild(p.sprite);
					this.particles.push(p);
				} else {
					recycle(p);
				}
			}
			queue.set([]);
		});
	}

	update(dt: number) {
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			if (!p.update(dt)) {
				recycle(p);
				this.particles.splice(i, 1);
			}
		}
	}

	destroy() {
		this.unsubscribe();
		this.particles.forEach(recycle);
		this.particles = [];
		this.container.destroy({ children: true });
	}
}
