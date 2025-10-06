import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		alias: {
			'@': 'src/*',
			'@components': 'src/lib/components/*',
			'$data': 'src/lib/data/*',
			'$helpers': 'src/lib/helpers/*',
			'$stores': 'src/lib/stores/*',
		},
	},
	preprocess: vitePreprocess(),
	onwarn: (warning, handler) => {
		// suppress warnings on `vite dev` and `vite build`; but even without this, things still work
		if (warning.code === "a11y-click-events-have-key-events") return;
		if (warning.code === "a11y-no-static-element-interactions") return;
		handler(warning);
	}
};

export default config;
