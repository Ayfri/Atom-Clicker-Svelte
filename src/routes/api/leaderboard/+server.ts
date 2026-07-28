import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { leaderboardService, supabaseAdmin } from '$lib/server/supabase.server';
import { verifyAndDecryptClientData } from '$lib/server/obfuscation.server';
import { addRankToLeaderboard } from '$lib/utils/number-parser';

const UPDATE_INTERVAL = 25 * 1000; // 25 seconds minimum between updates

// Sanity bounds for reported stats - see "Leaderboard writes" in CLAUDE.md for the methodology.
// MAX_ATOMS is loose on purpose (only rejects near-float-ceiling garbage, not balance-tuned values).
// MAX_LEVEL is tight since it's balance-independent (unreachable past ~1000 given the XP curve).
const MAX_ATOMS = 1e100;
const MAX_LEVEL = 1_000;
const MAX_USERNAME_LENGTH = 50;
const MAX_PICTURE_LENGTH = 2048;

// Cache for rate limiting
const userLastUpdate = new Map<string, number>();

export const GET: RequestHandler = async ({ url }) => {
	try {
		// Get current user ID from URL params
		const userIdParam = url.searchParams.get('userId');
		// Only use userId if it's not empty, otherwise set to undefined
		const currentUserId = userIdParam && userIdParam.trim().length > 0 ? userIdParam : undefined;

		// Get leaderboard data and total user count in parallel
		const [rawLeaderboard, { count: totalUsersCount }] = await Promise.all([
			leaderboardService.getLeaderboard(1000),
			supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
		]);

		// Sort and rank the entries by atoms value using JavaScript
		const sortedWithRank = addRankToLeaderboard(rawLeaderboard);

		// Format response for frontend compatibility
		const formattedLeaderboard = sortedWithRank.map((entry) => {
			// A user is considered online only if:
			// 1. is_online is true in DB
			// 2. updated_at is within the last 2 minutes (heartbeat mechanism)
			const lastSeen = new Date(entry.updated_at).getTime();
			const isTrulyOnline = entry.is_online && (Date.now() - lastSeen < 120_000);

			return {
				atoms: parseFloat(entry.atoms), // Use parseFloat instead of parseInt
				equippedBanner: entry.equipped_banner ?? null,
				level: entry.level,
				is_online: isTrulyOnline,
				picture: entry.picture || '',
				self: currentUserId ? entry.id === currentUserId : false, // Simple JavaScript check
				lastUpdated: new Date(entry.last_updated).getTime(),
				rank: entry.rank,
				userId: entry.id,
				username: entry.username || 'Anonymous',
			};
		});

		return json({
			entries: formattedLeaderboard,
			stats: {
				totalUsers: totalUsersCount ?? formattedLeaderboard.length,
			},
		});
	} catch (error) {
		console.error('Failed to fetch leaderboard:', error);
		return json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Identify the caller from their Supabase session - never trust a userId supplied in the payload,
		// otherwise anyone could overwrite another player's leaderboard entry (userId is public, visible in GET results)
		const authHeader = request.headers.get('Authorization');
		if (!authHeader) {
			return json({ error: 'No authorization header' }, { status: 401 });
		}

		const token = authHeader.replace('Bearer ', '');
		const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
		if (authError || !user) {
			return json({ error: 'Invalid token' }, { status: 401 });
		}

		const userId = user.id;

		const { data: encryptedData, signature, timestamp } = await request.json();

		// Verify and decrypt the client data
		const data = verifyAndDecryptClientData(encryptedData, signature, timestamp);
		if (!data) {
			console.log('Failed to verify/decrypt client data');
			return json({ error: 'Invalid or expired data' }, { status: 400 });
		}

		const { username, atoms, level, picture } = data;

		// Validate shape and bounds of the reported stats
		if (typeof username !== 'string' || username.trim().length === 0 || username.length > MAX_USERNAME_LENGTH) {
			return json({ error: 'Invalid username' }, { status: 400 });
		}
		if (!Number.isFinite(atoms) || atoms < 0 || atoms > MAX_ATOMS) {
			return json({ error: 'Invalid atoms value' }, { status: 400 });
		}
		if (!Number.isInteger(level) || level < 0 || level > MAX_LEVEL) {
			return json({ error: 'Invalid level value' }, { status: 400 });
		}
		if (picture !== undefined && picture !== null && (typeof picture !== 'string' || picture.length > MAX_PICTURE_LENGTH)) {
			return json({ error: 'Invalid picture value' }, { status: 400 });
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
