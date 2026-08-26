import type { HandleClientError } from '@sveltejs/kit';
import { initGlobalErrorHandlers, reportError } from '$lib/helpers/errorReporting';
import { getItem, setItem } from '$lib/utils/safeLocalStorage';

// Initialize global error handlers for uncaught errors
initGlobalErrorHandlers();

/** Cloudflare Workers serves only the current build, so a tab left open across a deploy asks for a chunk that is gone. */
const STALE_CHUNK_PATTERN = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;
const RELOAD_GUARD_KEY = 'stale-chunk-reload';
const RELOAD_GUARD_WINDOW = 60_000;

let reloadAttempted = false;

/** Reloads once to pick up the new build, guarded on both sides so a genuinely broken chunk cannot loop. */
function recoverFromStaleChunk(): boolean {
	if (reloadAttempted) return false;
	reloadAttempted = true;

	const lastReload = Number(getItem(RELOAD_GUARD_KEY) ?? 0);
	if (Number.isFinite(lastReload) && Date.now() - lastReload < RELOAD_GUARD_WINDOW) return false;

	setItem(RELOAD_GUARD_KEY, String(Date.now()));
	location.reload();
	return true;
}

/**
 * Global client-side error handler for SvelteKit
 * Catches unhandled errors and reports them to the server
 */
export const handleError: HandleClientError = async ({ error, status, message }) => {
	// Don't report 404 errors or other expected HTTP errors
	if (status === 404) {
		return { message: 'Page not found' };
	}

	const errorMessage = error instanceof Error ? error.message : message || '';
	if (STALE_CHUNK_PATTERN.test(errorMessage) && recoverFromStaleChunk()) {
		return { message: 'A new version was deployed, reloading...' };
	}

	console.error('[Client Error]', error);

	// Report the error to our backend
	if (error instanceof Error) {
		await reportError(error);
	} else {
		await reportError(new Error(message || 'Unknown client error'));
	}

	// Return a user-friendly error message
	return {
		message: 'An unexpected error occurred. The error has been reported.'
	};
};
