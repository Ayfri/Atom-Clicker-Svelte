export interface Particle {
	sprite: any;
	speedX?: number;
	speedY?: number;
	update?: (particle: this, deltaTime: number) => void;
}

export const createClickParticle = async (x: number, y: number): Promise<Particle> => {
	try {
		// Dynamically import PixiJS to avoid blocking the app
		const PIXI = await import('pixi.js');

		const texture = await PIXI.Assets.load('atom.png');
		const sprite = new PIXI.Sprite({
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
					sprite.removeFromParent();
					sprite.destroy();
				}
			}
		}
	} catch (error) {
		// Fallback: return a dummy particle that has all necessary properties
		console.warn('Failed to create click particle:', error);
		return {
			sprite: {
				parent: null,
				destroyed: true, // Mark as destroyed so it gets filtered out immediately
				removeFromParent: () => {},
				destroy: () => {},
				x: 0,
				y: 0,
				alpha: 0,
				scale: { x: 0, y: 0 }
			}
		};
	}
};

export const createClickTextParticle = async (x: number, y: number, text: string): Promise<Particle> => {
	try {
		// Dynamically import PixiJS to avoid blocking the app
		const PIXI = await import('pixi.js');

		const clickTextStyle = new PIXI.TextStyle({
			fontWeight: 'bold',
			fill: 'white',
		});

		const sprite = new PIXI.Text({
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
					sprite.removeFromParent();
					sprite.destroy();
				}
			}
		}
	} catch (error) {
		// Fallback: return a dummy particle that has all necessary properties
		console.warn('Failed to create text particle:', error);
		return {
			sprite: {
				parent: null,
				destroyed: true, // Mark as destroyed so it gets filtered out immediately
				removeFromParent: () => {},
				destroy: () => {},
				x: 0,
				y: 0,
				alpha: 0,
				zIndex: 1
			}
		};
	}
};
