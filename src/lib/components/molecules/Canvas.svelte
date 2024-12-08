<script lang="ts">
	import {Application, Container} from 'pixi.js';
	import {onDestroy, onMount} from 'svelte';
	import {particles} from '$stores/canvas';
	import { app } from '$stores/pixi';

	let particlesContainer: Container;

	const animate = (deltaTime: number) => {
		particles.update(current => {
			let newParticles = [...current];

			newParticles = newParticles.filter(particle => {
				if (!particle.sprite.parent) {
					particlesContainer.addChild(particle.sprite);
				}

				particle.update?.(particle, deltaTime);

				return !particle.sprite.destroyed;
			});

			return newParticles;
		});
	};

	onMount(async () => {
		const app = new Application();
		await app.init({
			backgroundAlpha: 0,
			antialias: true,
			resizeTo: document.body,
		});

		document.body.appendChild(app.canvas);

		const getFps = () =>
			new Promise<number>(resolve =>
				requestAnimationFrame(t1 =>
					requestAnimationFrame(t2 => resolve(1000 / (t2 - t1)))
				)
			);

		const fps = await getFps();
		app.ticker.add(ticker => animate(ticker.deltaTime));
		app.ticker.minFPS = Math.round(fps);

		particlesContainer = new Container({
			isRenderGroup: true,
		});

		app.stage.addChild(particlesContainer);

		$app = app;
	});

	onDestroy(() => {
		$app!.ticker.remove(ticker => animate(ticker.deltaTime));
		document.body.removeChild($app!.canvas);
		$app!.destroy();
	});
</script>

<style>
	:global(canvas) {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
		z-index: 1;
	}
</style>
