import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logError } from '$lib/server/errorHandler.server';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
	'https://atom-clicker.ayfri.com', // Production domain
	'https://dev-atom-clicker.ayfri.workers.dev', // Dev domain
];

function isValidOrigin(origin: string | null): boolean {
	if (!origin) return false;
	return ALLOWED_ORIGINS.includes(origin);
}

function createCorsResponse(data: unknown, options: { status?: number } = {}) {
	return json(data, {
		status: options.status || 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Max-Age': '86400'
		}
	});
}

// Rate limiting to prevent spam - sliding window implementation
const errorRateLimit = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_ERRORS_PER_WINDOW = 10;

// Periodic cleanup to prevent memory leaks
function cleanupRateLimitMap() {
	const now = Date.now();
	for (const [ip, timestamps] of errorRateLimit) {
		const validTimestamps = timestamps.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
		if (validTimestamps.length === 0) {
			errorRateLimit.delete(ip);
		} else {
			errorRateLimit.set(ip, validTimestamps);
		}
	}
}

// Run cleanup every 5 minutes
if (typeof globalThis !== 'undefined') {
	setInterval(cleanupRateLimitMap, 5 * 60 * 1000);
}

function isRateLimited(clientIp: string): boolean {
	const now = Date.now();
	const timestamps = errorRateLimit.get(clientIp) || [];

	// Remove timestamps outside the window
	const validTimestamps = timestamps.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);

	// Update the map with cleaned timestamps
	if (validTimestamps.length === 0) {
		errorRateLimit.delete(clientIp);
	} else {
		errorRateLimit.set(clientIp, validTimestamps);
	}

	// Check if under limit
	if (validTimestamps.length >= MAX_ERRORS_PER_WINDOW) {
		return true; // Rate limited
	}

	// Add current timestamp
	validTimestamps.push(now);
	errorRateLimit.set(clientIp, validTimestamps);

	return false; // Not rate limited
}

export const OPTIONS: RequestHandler = async ({ request }) => {
	const origin = request.headers.get('origin');

	if (!isValidOrigin(origin)) {
		return json({ error: 'Origin not allowed' }, { status: 403 });
	}

	return createCorsResponse({ success: true });
};

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const origin = request.headers.get('origin');

		// Validate origin
		if (!isValidOrigin(origin)) {
			return createCorsResponse({ error: 'Origin not allowed' }, { status: 403 });
		}

		const clientIp = getClientAddress();

		// Check rate limiting
		if (isRateLimited(clientIp)) {
			return createCorsResponse({ error: 'Rate limit exceeded' }, { status: 429 });
		}

		const body = await request.json();

		// Validate required fields
		if (!body.errorMessage || typeof body.errorMessage !== 'string') {
			return createCorsResponse({ error: 'Missing error message' }, { status: 400 });
		}

		// Log the error
		const result = await logError({
			browserInfo: body.browserInfo || null,
			errorMessage: body.errorMessage,
			gameState: body.gameState || null,
			stackTrace: body.stackTrace || null,
			url: body.url || null,
			userId: body.userId || null
		});

		return createCorsResponse({ id: result?.id ?? null, success: true });
	} catch (error) {
		console.error('[ErrorAPI] Failed to process error report:', error);
		return createCorsResponse({ error: 'Failed to log error' }, { status: 500 });
	}
};
