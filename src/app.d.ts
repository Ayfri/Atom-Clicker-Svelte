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
			OBFUSCATION_KEY: string;
			PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
			PUBLIC_SUPABASE_URL: string;
			SUPABASE_SECRET_KEY: string;
		}
	}
}

export {};
