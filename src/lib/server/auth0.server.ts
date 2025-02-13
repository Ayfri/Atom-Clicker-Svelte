import { ManagementClient } from 'auth0';
import { AUTH0_MGMT_CLIENT_SECRET, AUTH0_MGMT_CLIENT_ID } from '$env/static/private';
import { PUBLIC_AUTH0_DOMAIN } from '$env/static/public';
import type { Auth0User } from '$lib/types/auth';

let auth0Management: ManagementClient;
let lastInitTime = 0;
const REINIT_INTERVAL = 300000; // 5 minutes instead of 1 hour

export async function getAuth0Client() {
    const now = Date.now();

    // Reset the client every 5 minutes or if it doesn't exist
    if (!auth0Management || now - lastInitTime > REINIT_INTERVAL) {
        try {
            // Check that the credentials are present
            if (!AUTH0_MGMT_CLIENT_ID || !AUTH0_MGMT_CLIENT_SECRET || !PUBLIC_AUTH0_DOMAIN) {
                throw new Error('Missing Auth0 credentials');
            }

            auth0Management = new ManagementClient({
                domain: PUBLIC_AUTH0_DOMAIN,
                clientId: AUTH0_MGMT_CLIENT_ID,
                clientSecret: AUTH0_MGMT_CLIENT_SECRET,
                telemetry: false
            });

            lastInitTime = now;
            console.log('Auth0 client initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Auth0 client:', error);
            throw new Error('Auth0 client initialization failed');
        }
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
        const client = await getAuth0Client();
        const response = await client.users.get({ id: userId });
        const userData = response.data;
        const user: Auth0User = {
            user_id: userData.user_id,
            user_metadata: userData.user_metadata || {}
        };
        userMetadataCache.set(userId, { data: user, timestamp: now });
        return user;
    } catch (error: any) {
        console.error('Failed to get user metadata:', {
            error: error.message,
            code: error.statusCode,
            userId,
            timestamp: now
        });
        return null;
    }
}

export async function updateUserMetadata(userId: string, metadata: Record<string, any>): Promise<void> {
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 1000;

    while (retryCount < maxRetries) {
        try {
            const client = await getAuth0Client();
            const response = await client.users.update({ id: userId }, { user_metadata: metadata });

            if (!response?.data) {
                throw new Error('No response data from Auth0');
            }

            // Invalidate cache for this user
            userMetadataCache.delete(userId);

            console.log('User metadata updated successfully:', {
                userId,
                timestamp: Date.now(),
                attempt: retryCount + 1
            });
            return;
        } catch (error: any) {
            retryCount++;
            console.error(`Failed to update user metadata (attempt ${retryCount}/${maxRetries}):`, {
                error: error.message,
                code: error.statusCode,
                userId,
                timestamp: Date.now()
            });

            if (retryCount === maxRetries) {
                throw error;
            }

            // Exponential backoff
            const delay = baseDelay * Math.pow(2, retryCount - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
