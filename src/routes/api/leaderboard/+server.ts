import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ManagementClient } from 'auth0';
import { AUTH0_MGMT_CLIENT_SECRET, AUTH0_MGMT_CLIENT_ID } from '$env/static/private';
import { PUBLIC_AUTH0_DOMAIN } from '$env/static/public';
import type { LeaderboardEntry } from '$lib/types/leaderboard';

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
const USER_METADATA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache for user metadata

let cachedLeaderboard: LeaderboardEntry[] = [];
let lastCloudflareUpdate = 0;
let userMetadataCache: Map<string, { data: Auth0User; timestamp: number }> = new Map();

const auth0Management = new ManagementClient({
    domain: PUBLIC_AUTH0_DOMAIN,
    clientId: AUTH0_MGMT_CLIENT_ID,
    clientSecret: AUTH0_MGMT_CLIENT_SECRET
});

async function getUserMetadata(userId: string): Promise<Auth0User | null> {
    const now = Date.now();
    const cached = userMetadataCache.get(userId);
    
    if (cached && now - cached.timestamp < USER_METADATA_CACHE_DURATION) {
        return cached.data;
    }

    try {
        const response = await auth0Management.users.get({ id: userId });
        // L'API retourne les données dans response.data
        const userData = response.data;
        const user: Auth0User = {
            user_id: userId, // On utilise l'ID qu'on a passé car on sait qu'il est correct
            user_metadata: userData.user_metadata
        };
        userMetadataCache.set(userId, { data: user, timestamp: now });
        return user;
    } catch (error) {
        console.error(`Failed to fetch metadata for user ${userId}:`, error);
        return null;
    }
}

export const GET: RequestHandler = async ({ platform }) => {
    if (!platform?.env?.ATOM_CLICKER_LEADERBOARD) {
        return json({ error: 'Leaderboard not configured' }, { status: 500 });
    }

    try {
        const leaderboard = await platform.env.ATOM_CLICKER_LEADERBOARD.get(LEADERBOARD_KEY, 'json') || [];
        
        // Fetch user metadata for all users in the leaderboard
        const userIds = leaderboard.map((entry: LeaderboardEntry) => entry.userId).filter(Boolean);
        
        if (userIds.length === 0) {
            return json(leaderboard);
        }

        try {
            // Récupérer les métadonnées des utilisateurs avec cache
            const usersPromises = userIds.map((userId: string) => getUserMetadata(userId));
            const users = await Promise.all(usersPromises);

            // Map user metadata to leaderboard entries
            const enrichedLeaderboard = leaderboard.map((entry: LeaderboardEntry) => {
                const user = users.find((u: Auth0User | null) => u?.user_id === entry.userId);
                return {
                    ...entry,
                    user_metadata: user?.user_metadata
                };
            });

            cachedLeaderboard = enrichedLeaderboard;
            return json(enrichedLeaderboard);
        } catch (authError) {
            console.error('Failed to fetch user metadata:', authError);
            // En cas d'erreur d'Auth0, on retourne quand même le leaderboard sans les métadonnées
            return json(leaderboard);
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
