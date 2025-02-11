// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			auth: import('@auth/core/types').Session | null;
		}
		interface PageData {
			session: import('@auth/core/types').Session | null;
		}
		interface Platform {
			env?: {
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

	namespace NodeJS {
		interface ProcessEnv {
			PUBLIC_AUTH0_DOMAIN: string;
			PUBLIC_AUTH0_CLIENT_ID: string;
			PUBLIC_AUTH0_CALLBACK_URL: string;
			AUTH0_CLIENT_SECRET: string;
			AUTH0_MGMT_CLIENT_ID: string;
			AUTH0_MGMT_CLIENT_SECRET: string;
			OBFUSCATION_KEY: string;
		}
	}
}

export {};
