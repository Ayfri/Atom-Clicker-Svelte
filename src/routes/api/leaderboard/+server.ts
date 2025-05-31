import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { leaderboardService } from '$lib/server/supabase.server';
import { verifyAndDecryptClientData } from '$lib/server/obfuscation.server';
import { addRankToLeaderboard } from '$lib/utils/number-parser';

const UPDATE_INTERVAL = 60 * 1000; // 1 minute minimum between updates

// Cache for rate limiting
const userLastUpdate = new Map<string, number>();

export const GET: RequestHandler = async ({ url }) => {
	try {
		// Get current user ID from URL params
		const userIdParam = url.searchParams.get('userId');
		// Only use userId if it's not empty, otherwise set to undefined
		const currentUserId = userIdParam && userIdParam.trim().length > 0 ? userIdParam : undefined;

		// Get leaderboard data from Supabase (simplified function)
		const rawLeaderboard = await leaderboardService.getLeaderboard(1000);

		// Sort and rank the entries by atoms value using JavaScript
		const sortedWithRank = addRankToLeaderboard(rawLeaderboard);

		// Format response for frontend compatibility
		const formattedLeaderboard = sortedWithRank.map((entry) => ({
			username: entry.username || 'Anonymous',
			atoms: parseFloat(entry.atoms), // Use parseFloat instead of parseInt
			level: entry.level,
			picture: entry.picture || '',
			self: currentUserId ? entry.id === currentUserId : false, // Simple JavaScript check
			lastUpdated: new Date(entry.last_updated).getTime(),
			rank: entry.rank,
			userId: entry.id
		}));

		return json(formattedLeaderboard);
	} catch (error) {
		console.error('Failed to fetch leaderboard:', error);
		return json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { data: encryptedData, signature, timestamp } = await request.json();

		// Verify and decrypt the client data
		const data = verifyAndDecryptClientData(encryptedData, signature, timestamp);
		if (!data) {
			console.log('Failed to verify/decrypt client data');
			return json({ error: 'Invalid or expired data' }, { status: 400 });
		}

		const { username, atoms, level, userId, picture } = data;

		// Basic validation
		if (!username || typeof atoms !== 'number' || typeof level !== 'number' || !userId) {
			console.log('Data validation failed:', { username: !!username, atomsType: typeof atoms, levelType: typeof level, userId: !!userId });
			return json({ error: 'Invalid data' }, { status: 400 });
		}

		// Rate limiting check
		const lastUpdate = userLastUpdate.get(userId) || 0;
		const timeSinceLastUpdate = Date.now() - lastUpdate;

		if (timeSinceLastUpdate < UPDATE_INTERVAL) {
			console.log('Rate limit hit for user:', userId, 'time since last update:', timeSinceLastUpdate);
			return json({
				error: 'Update too frequent',
				nextUpdateIn: Math.ceil((UPDATE_INTERVAL - timeSinceLastUpdate) / 1000)
			}, { status: 429 });
		}

		// Update profile stats in Supabase
		await leaderboardService.updateProfileStats(userId, atoms, level, username, picture);

		// Update rate limiting cache
		userLastUpdate.set(userId, Date.now());

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update leaderboard:', error);
		return json({ error: 'Failed to update leaderboard' }, { status: 500 });
	}
};
