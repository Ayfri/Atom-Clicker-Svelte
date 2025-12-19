import type { HandleClientError } from '@sveltejs/kit';
import { initGlobalErrorHandlers, reportError } from '$lib/helpers/errorReporting';

// Initialize global error handlers for uncaught errors
initGlobalErrorHandlers();

/**
 * Global client-side error handler for SvelteKit
 * Catches unhandled errors and reports them to the server
 */
export const handleError: HandleClientError = async ({ error, status, message }) => {
	// Don't report 404 errors or other expected HTTP errors
	if (status === 404) {
		return { message: 'Page not found' };
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
