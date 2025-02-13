import { ManagementClient } from 'auth0';
import { AUTH0_MGMT_CLIENT_SECRET, AUTH0_MGMT_CLIENT_ID } from '$env/static/private';
import { PUBLIC_AUTH0_DOMAIN } from '$env/static/public';

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
const userMetadataCache = new Map<string, { data: any; timestamp: number }>();

export async function getUserMetadata(userId: string): Promise<any | null> {
    const now = Date.now();
    const cached = userMetadataCache.get(userId);

    if (cached && now - cached.timestamp < USER_METADATA_CACHE_DURATION) {
        return cached.data;
    }

    try {
        const client = getAuth0Client();
        const response = await client.users.get({ id: userId });
        const userData = response.data;
        userMetadataCache.set(userId, { data: userData, timestamp: now });
        return userData;
    } catch (error) {
        return null;
    }
}
