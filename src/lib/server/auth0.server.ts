import { ManagementClient } from 'auth0';
import { AUTH0_MGMT_CLIENT_SECRET, AUTH0_MGMT_CLIENT_ID } from '$env/static/private';
import { PUBLIC_AUTH0_DOMAIN } from '$env/static/public';
import type { Auth0User } from '$lib/types/auth';

let auth0Management: ManagementClient;

export function getAuth0Client() {
    if (!auth0Management) {
        auth0Management = new ManagementClient({
            domain: PUBLIC_AUTH0_DOMAIN,
            clientId: AUTH0_MGMT_CLIENT_ID,
            clientSecret: AUTH0_MGMT_CLIENT_SECRET,
            telemetry: false
        });
    }
    return auth0Management;
}

// Cache for user metadata to avoid too many API calls
const USER_METADATA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const userMetadataCache = new Map<string, { data: Auth0User; timestamp: number }>();

export async function getUserMetadata(userId: string): Promise<Auth0User | null> {
    const now = Date.now();
    const cached = userMetadataCache.get(userId);

    if (cached && now - cached.timestamp < USER_METADATA_CACHE_DURATION) {
        return cached.data;
    }

    try {
        const client = getAuth0Client();
        const response = await client.users.get({ id: userId });
        const userData = response.data;
        const user: Auth0User = {
            ...userData,
            user_metadata: userData.user_metadata || {}
        };
        userMetadataCache.set(userId, { data: user, timestamp: now });
        return user;
    } catch {
        return null;
    }
}

export async function updateUserMetadata(userId: string, metadata: Record<string, any>): Promise<void> {
    try {
        const client = getAuth0Client();
        await client.users.update({ id: userId }, { user_metadata: metadata });
        // Invalider le cache pour cet utilisateur
        userMetadataCache.delete(userId);
    } catch {
        throw new Error('Failed to update user metadata');
    }
}
