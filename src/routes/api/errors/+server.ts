import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logError } from '$lib/server/errorHandler.server';

// Rate limiting to prevent spam - sliding window implementation
const errorRateLimit = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_ERRORS_PER_WINDOW = 10;

function isRateLimited(clientIp: string): boolean {
	const now = Date.now();
	const timestamps = errorRateLimit.get(clientIp) || [];

	// Remove timestamps outside the window
	const validTimestamps = timestamps.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);

	// Update the map with cleaned timestamps
	errorRateLimit.set(clientIp, validTimestamps);

	// Check if under limit
	if (validTimestamps.length >= MAX_ERRORS_PER_WINDOW) {
		return true; // Rate limited
	}

	// Add current timestamp
	validTimestamps.push(now);
	errorRateLimit.set(clientIp, validTimestamps);

	return false; // Not rate limited
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const clientIp = getClientAddress();

		// Check rate limiting
		if (isRateLimited(clientIp)) {
			return json({ error: 'Rate limit exceeded' }, { status: 429 });
		}

		const body = await request.json();

		// Validate required fields
		if (!body.errorMessage || typeof body.errorMessage !== 'string') {
			return json({ error: 'Missing error message' }, { status: 400 });
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

		return json({ id: result?.id ?? null, success: true });
	} catch (error) {
		console.error('[ErrorAPI] Failed to process error report:', error);
		return json({ error: 'Failed to log error' }, { status: 500 });
	}
};
