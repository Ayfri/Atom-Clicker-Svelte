// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}

		interface Platform {
			env: {
				ATOM_CLICKER_LEADERBOARD: KVNamespace;
			};
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage & {
				default: Cache
			}
		}
	}

	interface Window {
		dataLayer: any[];
		gtag: (...args: any[]) => void;
	}
}

export {};
