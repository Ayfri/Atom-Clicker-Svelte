import { supabaseAdmin } from './supabase.server';
import type { Json } from '$lib/types/supabase';

export interface ServerErrorReport {
	browserInfo?: Record<string, unknown> | null;
	errorMessage: string;
	gameState?: Record<string, unknown> | null;
	stackTrace?: string | null;
	url?: string | null;
	userId?: string | null;
}

const DEDUP_WINDOW_MINUTES = 5;

/**
 * Checks if a similar error was already logged recently
 */
async function isDuplicateError(errorMessage: string, stackTrace: string | null): Promise<boolean> {
	const windowStart = new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000).toISOString();

	// Query for recent errors with same message and stack trace
	const { data } = await supabaseAdmin
		.from('error_logs')
		.select('id')
		.eq('error_message', errorMessage)
		.eq('stack_trace', stackTrace || '')
		.gte('created_at', windowStart)
		.limit(1);

	return (data?.length ?? 0) > 0;
}

/**
 * Logs an error to Supabase (Discord notification handled by PostgreSQL trigger)
 */
export async function logError(report: ServerErrorReport): Promise<{ id: string } | null> {
	const { browserInfo, errorMessage, gameState, stackTrace, url, userId } = report;

	// Check for duplicate errors
	const isDuplicate = await isDuplicateError(errorMessage, stackTrace || null);
	if (isDuplicate) {
		console.log('[ErrorHandler] Skipping duplicate error:', errorMessage.substring(0, 50));
		return null;
	}

	// Insert into Supabase (Discord webhook handled by trigger)
	const { data, error: dbError } = await supabaseAdmin
		.from('error_logs')
		.insert({
			browser_info: browserInfo as Json,
			error_message: errorMessage,
			game_state: gameState as Json,
			stack_trace: stackTrace,
			url,
			user_id: userId
		})
		.select('id')
		.single();

	if (dbError) {
		console.error('[ErrorHandler] Failed to insert error log:', dbError);
		return null;
	}

	return data;
}
