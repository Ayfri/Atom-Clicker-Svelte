import type { Handle, HandleFetch, HandleServerError } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => resolve(event);

export const handleFetch: HandleFetch = async ({ event, request, fetch }) => fetch(request);

export const handleError: HandleServerError = ({ error }) => {
	console.error(error);
	return { message: 'Internal Server Error' };
};

// Required for SvelteKit 2.43+ - must be defined
export const transport = {};
