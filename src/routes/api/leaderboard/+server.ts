import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface LeaderboardEntry {
    username: string;
    atoms: number;
    level: number;
    lastUpdated: number;
    userId: string;
    picture?: string;
}

const LEADERBOARD_KEY = 'global_leaderboard';
const MAX_ENTRIES = 100;
const UPDATE_INTERVAL = 60 * 1000; // 1 minute for local updates
const CLOUDFLARE_UPDATE_INTERVAL = 10 * 60 * 1000; // 10 minutes for Cloudflare KV updates

let cachedLeaderboard: LeaderboardEntry[] = [];
let lastCloudflareUpdate = 0;

export const GET: RequestHandler = async ({ platform }) => {
    if (!platform?.env?.ATOM_CLICKER_LEADERBOARD) {
        return json({ error: 'Leaderboard not configured' }, { status: 500 });
    }

    try {
        const leaderboard = await platform.env.ATOM_CLICKER_LEADERBOARD.get(LEADERBOARD_KEY, 'json') || [];
        return json(leaderboard);
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        return json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request, platform }) => {
    if (!platform?.env?.ATOM_CLICKER_LEADERBOARD) {
        return json({ error: 'Leaderboard not configured' }, { status: 500 });
    }

    try {
        const { username, atoms, level, userId, picture } = await request.json();

        if (!username || typeof atoms !== 'number' || typeof level !== 'number' || !userId) {
            return json({ error: 'Invalid data' }, { status: 400 });
        }

        const entry: LeaderboardEntry = {
            username,
            atoms,
            level,
            userId,
            picture,
            lastUpdated: Date.now()
        };

        // Initialize cache if empty
        if (cachedLeaderboard.length === 0) {
            cachedLeaderboard = await platform.env.ATOM_CLICKER_LEADERBOARD.get(LEADERBOARD_KEY, 'json') || [];
        }

        // Update cache
        const existingIndex = cachedLeaderboard.findIndex(e => e.userId === userId);
        if (existingIndex !== -1) {
            // Only update if the new score is higher and enough time has passed
            const timeSinceLastUpdate = Date.now() - cachedLeaderboard[existingIndex].lastUpdated;
            if (atoms > cachedLeaderboard[existingIndex].atoms && timeSinceLastUpdate >= UPDATE_INTERVAL) {
                cachedLeaderboard[existingIndex] = entry;
            }
        } else {
            cachedLeaderboard.push(entry);
        }

        // Sort and limit entries
        cachedLeaderboard = cachedLeaderboard
            .sort((a, b) => b.atoms - a.atoms)
            .slice(0, MAX_ENTRIES);

        // Update Cloudflare KV only if enough time has passed
        const now = Date.now();
        if (now - lastCloudflareUpdate >= CLOUDFLARE_UPDATE_INTERVAL) {
            await platform.env.ATOM_CLICKER_LEADERBOARD.put(LEADERBOARD_KEY, JSON.stringify(cachedLeaderboard));
            lastCloudflareUpdate = now;
        }

        return json({ success: true });
    } catch (error) {
        console.error('Failed to update leaderboard:', error);
        return json({ error: 'Failed to update leaderboard' }, { status: 500 });
    }
};
