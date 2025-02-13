import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { LeaderboardEntry } from '$lib/types/leaderboard';
import { verifyAndDecryptClientData } from '$lib/server/obfuscation.server';
import { getUserMetadata } from '$lib/server/auth0.server';

interface Auth0User {
    user_id: string;
    user_metadata?: {
        username?: string;
    };
}

const LEADERBOARD_KEY = 'global_leaderboard';
const MAX_ENTRIES = 100;
const UPDATE_INTERVAL = 60 * 1000; // 1 minute for local updates
const CLOUDFLARE_UPDATE_INTERVAL = 10 * 60 * 1000; // 10 minutes for Cloudflare KV updates

let cachedLeaderboard: LeaderboardEntry[] = [];
let lastCloudflareUpdate = 0;

export const GET: RequestHandler = async ({ platform, url }) => {
    if (!platform?.env?.ATOM_CLICKER_LEADERBOARD) {
        return json({ error: 'Leaderboard not configured' }, { status: 500 });
    }

    try {
        // Get current user ID from URL params
        const currentUserId = url.searchParams.get('userId') || '';

        // Get leaderboard data
        const leaderboard: LeaderboardEntry[] = await platform.env.ATOM_CLICKER_LEADERBOARD.get(LEADERBOARD_KEY, 'json') || [];

        // Fetch user metadata for all users in the leaderboard
        const userIds = leaderboard.map((entry) => entry.userId).filter(Boolean);
        if (userIds.length === 0) {
            return json([]);
        }

        try {
            // Récupérer les métadonnées des utilisateurs avec cache
            const usersPromises = userIds.map((userId: string) => getUserMetadata(userId));
            const users = await Promise.all(usersPromises);

            // Map user metadata to leaderboard entries and remove sensitive data
            const enrichedLeaderboard = leaderboard.map((entry) => {
                const user = users.find((u: Auth0User | null) => u?.user_id === entry.userId);
                const isSelf = entry.userId === currentUserId;

                return {
                    username: entry.username,
                    atoms: entry.atoms,
                    level: entry.level,
                    picture: entry.picture,
                    user_metadata: user?.user_metadata,
                    self: isSelf,
                    lastUpdated: entry.lastUpdated
                };
            });

            cachedLeaderboard = leaderboard; // Keep the full data in cache
            return json(enrichedLeaderboard);
        } catch (authError) {
            console.error('Failed to fetch user metadata:', authError);
            // En cas d'erreur d'Auth0, on retourne quand même le leaderboard sans les métadonnées
            return json(leaderboard.map(entry => ({
                username: entry.username,
                atoms: entry.atoms,
                level: entry.level,
                picture: entry.picture,
                self: entry.userId === currentUserId,
                lastUpdated: entry.lastUpdated
            })));
        }
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
        const { data: encryptedData, signature, timestamp } = await request.json();

        // Normal case: verify and decrypt the client data
        const data = verifyAndDecryptClientData(encryptedData, signature, timestamp);
        if (!data) {
            return json({ error: 'Invalid or expired data' }, { status: 400 });
        }

        const { username, atoms, level, userId, picture } = data;

        // Basic validation
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
