import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		alias: {
			'@components': 'src/lib/components/*',
			'$data': 'src/lib/data/*',
			'$helpers': 'src/lib/helpers/*',
			'$stores': 'src/lib/stores/*',
			'@': 'src/*',
		},
		version: {
			name: process.env.npm_package_version,
		},
	},
	preprocess: vitePreprocess({
		postcss: true,
		sourceMap: process.env.NODE_ENV === 'development',
	}),
	compilerOptions: {
		dev: process.env.NODE_ENV === 'development',
		immutable: true,
	},
	onwarn: (warning, handler) => {
		// suppress warnings on `vite dev` and `vite build`; but even without this, things still work
		if (warning.code === "a11y-click-events-have-key-events") return;
		if (warning.code === "a11y-no-static-element-interactions") return;
		handler(warning);
	},
	vitePlugin: {
		emitCss: false,
	}
};

export default config;
