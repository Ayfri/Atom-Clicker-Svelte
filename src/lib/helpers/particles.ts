import {Assets, Sprite, Text, TextStyle, type ViewContainer} from 'pixi.js';

export interface Particle {
	sprite: ViewContainer;
	speedX?: number;
	speedY?: number;
	update?: (particle: this, deltaTime: number) => void;
}

export const createClickParticle = async (x: number, y: number): Promise<Particle> => {
	const texture = await Assets.load('atom.png');
	const sprite = new Sprite({
		texture,
		anchor: 0.5,
		alpha: 0.8,
		scale: 0.2,
		x,
		y: y + document.documentElement.scrollTop,
		rotation: Math.random() * Math.PI * 2,
	});

	return {
		sprite,
		speedX: (1.5 + Math.random() * 0.5) * Math.cos(sprite.rotation),
		speedY: (1.5 + Math.random() * 0.5) * Math.sin(sprite.rotation),
		update: (particle, deltaTime) => {
			particle.speedX! *= 0.995;
			particle.speedY! *= 0.995;

			sprite.x += particle.speedX! * deltaTime;
			sprite.y += particle.speedY! * deltaTime;
			sprite.scale.x -= 0.001 * deltaTime;
			sprite.scale.y -= 0.001 * deltaTime;
			sprite.alpha -= 0.015 * deltaTime;

			if (sprite.alpha <= 0 || sprite.scale.x <= 0) {
				sprite.destroy();
			}
		}
	}
};

const clickTextStyle = new TextStyle({
	fontWeight: 'bold',
	fill: 'white',
});

export const createClickTextParticle = (x: number, y: number, text: string): Particle => {
	const sprite = new Text({
		anchor: 0.5,
		scale: 0.5,
		x,
		y: y + document.documentElement.scrollTop,
		text,
		style: clickTextStyle,
	});
	sprite.zIndex = 1;

	return {
		sprite,
		speedY: -1.5,
		update: (particle, deltaTime) => {
			particle.speedY! *= 0.995;

			sprite.y += particle.speedY! * deltaTime;
			sprite.alpha -= 0.015 * deltaTime;

			if (sprite.alpha <= 0) {
				sprite.destroy();
			}
		}
	}
};
