import { AUTH0_MGMT_CLIENT_ID, AUTH0_MGMT_CLIENT_SECRET } from '$env/static/private';
import { PUBLIC_AUTH0_DOMAIN } from '$env/static/public';
import type { Auth0User } from '$lib/types/auth';

// Cloudflare constant to force using nodejs runtime
export const runtime = "nodejs";

// Cache for access tokens to minimize API calls
let accessToken: string | null = null;
let tokenExpiresAt = 0;
const TOKEN_EXPIRY_BUFFER = 60000; // 1 minute buffer before token expiration

// Cache for user metadata to avoid too many API calls
const USER_METADATA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const userMetadataCache = new Map<string, { data: Auth0User; timestamp: number }>();

/**
 * Gets a valid access token for the Auth0 Management API
 */
async function getAccessToken(): Promise<string> {
	const now = Date.now();

	// If we have a valid token that's not about to expire, return it
	if (accessToken && tokenExpiresAt > now + TOKEN_EXPIRY_BUFFER) {
		return accessToken;
	}

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

		console.log('Getting Auth0 access token with domain:', PUBLIC_AUTH0_DOMAIN);

		// Request an access token using client credentials grant
		const response = await fetch(`https://${PUBLIC_AUTH0_DOMAIN}/oauth/token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				client_id: AUTH0_MGMT_CLIENT_ID,
				client_secret: AUTH0_MGMT_CLIENT_SECRET,
				audience: `https://${PUBLIC_AUTH0_DOMAIN}/api/v2/`,
				grant_type: 'client_credentials'
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Failed to get access token:', {
				status: response.status,
				statusText: response.statusText,
				error: errorText
			});
			throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();

		// Store the token and when it expires
		accessToken = data.access_token;
		// Calculate expiry time (converting expires_in from seconds to milliseconds)
		tokenExpiresAt = now + (data.expires_in * 1000);

		console.log('Successfully obtained Auth0 access token');

		if (!accessToken) {
			throw new Error('Failed to get access token');
		}

		return accessToken;
	} catch (error: any) {
		console.error('Failed to get Auth0 access token:', {
			error: error.message,
			stack: error.stack
		});
		throw new Error(`Failed to get Auth0 access token: ${error.message}`);
	}
}

/**
 * Make an authenticated request to the Auth0 Management API
 */
async function makeAuthenticatedRequest<T>(
	endpoint: string,
	options: RequestInit = {}
): Promise<T> {
	try {
		const token = await getAccessToken();

		const url = `https://${PUBLIC_AUTH0_DOMAIN}/api/v2/${endpoint}`;

		const response = await fetch(url, {
			...options,
			headers: {
				...options.headers,
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Auth0 API request failed: ${endpoint}`, {
				status: response.status,
				statusText: response.statusText,
				error: errorText
			});
			throw new Error(`Auth0 API request failed: ${response.status} ${response.statusText}`);
		}

		return await response.json() as T;
	} catch (error: any) {
		console.error(`Auth0 API request failed: ${endpoint}`, {
			error: error.message,
			stack: error.stack
		});
		throw error;
	}
}

/**
 * Get user metadata from Auth0
 */
export async function getUserMetadata(userId: string): Promise<Auth0User | null> {
	const now = Date.now();
	const cached = userMetadataCache.get(userId);

	if (cached && now - cached.timestamp < USER_METADATA_CACHE_DURATION) {
		return cached.data;
	}

	try {
		const userData = await makeAuthenticatedRequest<any>(`users/${userId}`);

		const user: Auth0User = {
			user_id: userData.user_id,
			user_metadata: userData.user_metadata || {}
		};

		userMetadataCache.set(userId, { data: user, timestamp: now });
		return user;
	} catch (error: any) {
		console.error('Failed to get user metadata:', {
			error: error.message,
			userId,
			timestamp: now
		});
		return null;
	}
}

/**
 * Update user metadata in Auth0
 */
export async function updateUserMetadata(userId: string, metadata: Record<string, any>): Promise<void> {
	let retryCount = 0;
	const maxRetries = 3;
	const baseDelay = 1000;

	while (retryCount < maxRetries) {
		try {
			await makeAuthenticatedRequest<any>(`users/${userId}`, {
				method: 'PATCH',
				body: JSON.stringify({ user_metadata: metadata })
			});

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
				userId,
				timestamp: Date.now(),
				stack: error.stack
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

// Legacy functions to maintain backward compatibility
export async function getAuth0Client(): Promise<any> {
	// This is just a stub to maintain API compatibility with existing code
	// It will throw an error if actually used as a ManagementClient
	console.warn('getAuth0Client() is deprecated, use getUserMetadata() or updateUserMetadata() instead');
	return {
		users: {
			get: async ({ id }: { id: string }) => {
				const user = await getUserMetadata(id);
				return { data: user };
			},
			update: async ({ id }: { id: string }, { user_metadata }: { user_metadata: Record<string, any> }) => {
				await updateUserMetadata(id, user_metadata);
				return { status: 200, data: { user_id: id, user_metadata } };
			},
			getAll: async () => {
				throw new Error('getAll is not implemented in the fetch-based client');
			}
		}
	};
}
