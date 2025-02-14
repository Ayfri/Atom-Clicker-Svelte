import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { encryptData, decryptData, verifyAndDecryptClientData } from '$lib/server/obfuscation.server';
import { getAuth0Client } from '$lib/server/auth0.server';

const SAVE_COOLDOWN = 30_000; // 30 seconds
const lastSavesByUser = new Map<string, number>();

export const GET: RequestHandler = async ({ url }) => {
    try {
        const userId = url.searchParams.get('userId');
        if (!userId) {
            return json({ error: 'User ID is required' }, { status: 400 });
        }

        const client = await getAuth0Client();
        const response = await client.users.get({ id: userId });
        const userData = response.data;
        const metadata = userData.user_metadata || {};

        // Decrypt save data if it exists
        if (metadata.cloudSaveInfo && typeof metadata.cloudSaveInfo === 'string') {
            try {
                const decryptedSave = decryptData(metadata.cloudSaveInfo);
                if (decryptedSave) {
                    metadata.cloudSaveInfo = decryptedSave;
                } else {
                    delete metadata.cloudSaveInfo;
                }
            } catch {
                delete metadata.cloudSaveInfo;
            }
        }

        return json({ user_metadata: metadata });
    } catch(error) {
        console.error('Failed to fetch user metadata:', error);
        return json({ error: 'Failed to fetch user metadata' }, { status: 500 });
    }
};

export const PATCH: RequestHandler = async ({ request }) => {
    try {
        const { userId, metadata, data, signature, timestamp } = await request.json();
        if (!userId) {
            return json({ error: 'User ID is required' }, { status: 400 });
        }

        // Check if the user has saved recently
        const lastSave = lastSavesByUser.get(userId);
        const now = Date.now();
        if (lastSave && now - lastSave < SAVE_COOLDOWN) {
            const remainingTime = Math.ceil((SAVE_COOLDOWN - (now - lastSave)) / 1000);
            return json({
                error: 'Too many requests',
                message: `Please wait ${remainingTime} seconds before saving again`,
                remainingTime
            }, { status: 429 });
        }

        // Verify and decrypt client data
        const saveData = verifyAndDecryptClientData(data, signature, timestamp);
        if (!saveData) {
            return json({
                error: 'Invalid or expired data',
                message: 'Please try saving again'
            }, { status: 400 });
        }

        // Encrypt save data for storage
        const encryptedSave = encryptData(saveData);
        console.log('Save data encrypted successfully:', {
            userId,
            timestamp: now,
            dataSize: encryptedSave.length
        });

        const client = await getAuth0Client();
        const maxRetries = 3;
        let lastError = null;

        // Retry loop for Auth0 API calls
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Vérifier que le client est bien initialisé
                if (!client) {
                    throw new Error('Auth0 client not initialized');
                }

                console.log(`Attempting to update user metadata (attempt ${attempt}/${maxRetries})`, {
                    userId,
                    timestamp: now
                });

                const response = await client.users.update({ id: userId }, {
                    user_metadata: {
                        lastCloudSave: now,
                        cloudSaveInfo: encryptedSave
                    }
                });

                if (!response?.data) {
                    throw new Error('No response data from Auth0');
                }

                console.log('Auth0 update successful:', {
                    statusCode: response?.status,
                    userId,
                    attempt,
                    timestamp: now
                });

                // Update last save time
                lastSavesByUser.set(userId, now);

                // Clean up old entries every hour
                if (lastSavesByUser.size > 1000) {
                    const oneHourAgo = now - 3600000;
                    for (const [id, time] of lastSavesByUser.entries()) {
                        if (time < oneHourAgo) {
                            lastSavesByUser.delete(id);
                        }
                    }
                }

                return json({
                    success: true,
                    attempt,
                    timestamp: now
                });
            } catch (auth0Error: any) {
                lastError = auth0Error;
                console.error(`Auth0 API error (attempt ${attempt}/${maxRetries}):`, {
                    error: auth0Error.message,
                    statusCode: auth0Error.statusCode,
                    name: auth0Error.name,
                    code: auth0Error.code,
                    stack: auth0Error.stack,
                    userId,
                    timestamp: now
                });

                // Don't retry on these errors
                if (auth0Error.statusCode === 401 || auth0Error.statusCode === 403) {
                    return json({
                        error: 'Authentication error',
                        message: 'Invalid Auth0 credentials'
                    }, { status: 401 });
                }

                // For rate limiting, wait before retrying
                if (auth0Error.statusCode === 429) {
                    const retryAfter = auth0Error.headers?.['retry-after'] || 5;
                    console.log(`Rate limited, waiting ${retryAfter} seconds before retry`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    continue;
                }

                // If this is not the last attempt, wait a bit before retrying
                if (attempt < maxRetries) {
                    const waitTime = attempt * 2000; // 2 seconds, 4 seconds, 6 seconds
                    console.log(`Waiting ${waitTime}ms before retry ${attempt + 1}`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
            }
        }

        // If we get here, all retries failed
        console.error('All Auth0 API retries failed:', {
            error: lastError?.message,
            stack: lastError?.stack,
            userId,
            timestamp: now
        });

        return json({
            error: 'Failed to update user metadata',
            message: 'Please try again later',
            details: lastError?.message || 'Unknown Auth0 error'
        }, { status: 500 });
    } catch (error: any) {
        console.error('Failed to process save request:', {
            error: error.message,
            stack: error.stack,
            timestamp: Date.now()
        });
        return json({
            error: 'Failed to process save request',
            message: 'An unexpected error occurred'
        }, { status: 500 });
    }
};
