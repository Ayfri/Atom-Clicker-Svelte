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
const UPDATE_INTERVAL = 60 * 1000; // 1 minute

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

        let leaderboard: LeaderboardEntry[] = await platform.env.ATOM_CLICKER_LEADERBOARD.get(LEADERBOARD_KEY, 'json') || [];
        
        // Update existing entry or add new one
        const existingIndex = leaderboard.findIndex(e => e.userId === userId);
        if (existingIndex !== -1) {
            // Only update if the new score is higher and enough time has passed
            const timeSinceLastUpdate = Date.now() - leaderboard[existingIndex].lastUpdated;
            if (atoms > leaderboard[existingIndex].atoms && timeSinceLastUpdate >= UPDATE_INTERVAL) {
                leaderboard[existingIndex] = entry;
            }
        } else {
            leaderboard.push(entry);
        }

        // Sort by atoms (descending) and limit entries
        leaderboard = leaderboard
            .sort((a, b) => b.atoms - a.atoms)
            .slice(0, MAX_ENTRIES);

        await platform.env.ATOM_CLICKER_LEADERBOARD.put(LEADERBOARD_KEY, JSON.stringify(leaderboard));
        return json({ success: true });
    } catch (error) {
        console.error('Failed to update leaderboard:', error);
        return json({ error: 'Failed to update leaderboard' }, { status: 500 });
    }
}; 