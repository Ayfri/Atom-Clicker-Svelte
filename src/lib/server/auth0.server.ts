import { ManagementClient } from 'auth0';
import { AUTH0_MGMT_CLIENT_ID, AUTH0_MGMT_CLIENT_SECRET } from '$env/static/private';
import { PUBLIC_AUTH0_DOMAIN } from '$env/static/public';
import type { Auth0User } from '$lib/types/auth';

let auth0Management: ManagementClient | null = null;
let initializationPromise: Promise<ManagementClient> | null = null;
let lastInitTime = 0;
const REINIT_INTERVAL = 300000; // 5 minutes

async function initializeAuth0Client(): Promise<ManagementClient> {
    try {
        // Check that the credentials are present and log their status
        const credentials = {
            domain: PUBLIC_AUTH0_DOMAIN,
            clientId: AUTH0_MGMT_CLIENT_ID,
            clientSecret: AUTH0_MGMT_CLIENT_SECRET
        };

        const missingCredentials = Object.entries(credentials)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missingCredentials.length > 0) {
            console.error('Missing Auth0 credentials:', {
                missingFields: missingCredentials,
                domain: PUBLIC_AUTH0_DOMAIN ? 'present' : 'missing'
            });
            throw new Error(`Missing Auth0 credentials: ${missingCredentials.join(', ')}`);
        }

        console.log('Initializing Auth0 client with domain:', PUBLIC_AUTH0_DOMAIN);

        const client = new ManagementClient({
            domain: PUBLIC_AUTH0_DOMAIN,
            clientId: AUTH0_MGMT_CLIENT_ID,
            clientSecret: AUTH0_MGMT_CLIENT_SECRET,
            telemetry: false
        });

        // Test the client by making a simple API call
        try {
            console.log('Testing Auth0 client with a simple API call...');
            await client.users.getAll({ per_page: 1, page: 0 });
            console.log('Auth0 test API call successful');
        } catch (apiError: any) {
            console.error('Auth0 test API call failed:', {
                error: apiError.message,
                code: apiError.statusCode,
                name: apiError.name,
                stack: apiError.stack
            });
            throw apiError;
        }

        auth0Management = client;
        lastInitTime = Date.now();
        console.log('Auth0 client initialized successfully');

        return client;
    } catch (error: any) {
        console.error('Failed to initialize Auth0 client:', {
            error: error.message,
            code: error.statusCode,
            name: error.name,
            stack: error.stack
        });
        auth0Management = null;
        throw new Error(`Auth0 client initialization failed: ${error.message}`);
    } finally {
        initializationPromise = null;
    }
}

export async function getAuth0Client(): Promise<ManagementClient> {
    const now = Date.now();

    // If there's an ongoing initialization, wait for it
    if (initializationPromise) {
        return initializationPromise;
    }

    // Reset the client every 5 minutes or if it doesn't exist
    if (!auth0Management || now - lastInitTime > REINIT_INTERVAL) {
        initializationPromise = initializeAuth0Client();
        return initializationPromise;
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

            // Verify that we have a valid client
            if (!client || !client.users) {
                throw new Error('Auth0 client not properly initialized');
            }

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
                timestamp: Date.now(),
                stack: error.stack
            });

            if (error.message.includes('not properly initialized')) {
                // Force client reinitialization on next attempt
                auth0Management = null;
                lastInitTime = 0;
            }

            if (retryCount === maxRetries) {
                throw error;
            }

            // Exponential backoff
            const delay = baseDelay * Math.pow(2, retryCount - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
