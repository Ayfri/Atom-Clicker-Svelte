import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv, defineConfig, type Plugin } from 'vite';

// Workaround for https://github.com/sveltejs/kit/issues/12394
// Rolldown's worker bundler doesn't get SvelteKit's plugin chain, so virtual modules
// like __sveltekit/environment and $env/* are unresolvable. Shim them with safe defaults:
// workers are always browser-side (browser=true), never auth/env-aware.
function skitWorkerShim(publicEnv: Record<string, string>): Plugin {
	const publicEnvExports =
		Object.entries(publicEnv)
			.filter(([k]) => k.startsWith('PUBLIC_'))
			.map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`)
			.join('\n') || `export {};`;

	return {
		name: 'sveltekit-worker-shim',
		resolveId(id) {
			if (id === '__sveltekit/environment' || id.startsWith('$env/')) return `\0sveltekit-shim:${id}`;
		},
		load(id) {
			if (id === '\0sveltekit-shim:__sveltekit/environment') {
				return `export const browser = true; export const building = false; export const dev = false; export const version = '';`;
			}
			if (id === '\0sveltekit-shim:$env/static/public' || id === '\0sveltekit-shim:$env/dynamic/public') {
				return publicEnvExports;
			}
			if (id.startsWith('\0sveltekit-shim:$env/')) {
				return `export {};`;
			}
		},
	};
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	return {
		plugins: [tailwindcss(), sveltekit()],
		worker: {
			plugins: () => [skitWorkerShim(env)],
		},
	};
});
