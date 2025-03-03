import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { encryptData, decryptData, verifyAndDecryptClientData } from '$lib/server/obfuscation.server';
import { getUserMetadata, updateUserMetadata } from '$lib/server/auth0.server';

const SAVE_COOLDOWN = 30_000; // 30 seconds
const lastSavesByUser = new Map<string, number>();

export const GET: RequestHandler = async ({ url }) => {
    try {
        const userId = url.searchParams.get('userId');
        if (!userId) {
            return json({ error: 'User ID is required' }, { status: 400 });
        }

        const userData = await getUserMetadata(userId);
        if (!userData) {
            return json({ error: 'Failed to retrieve user data' }, { status: 500 });
        }

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

        let updatedMetadata = {...metadata};

        // If this is a game save update
        if (data && signature && timestamp) {
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

            // Add the encrypted save to the metadata
            if (metadata.cloudSaveInfo) {
                updatedMetadata.cloudSaveInfo = encryptedSave;
            }
        }

        // Handle both game saves and simple metadata updates
        const maxRetries = 3;
        let lastError = null;

        // Retry loop for Auth0 API calls
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Attempting to update user metadata (attempt ${attempt}/${maxRetries})`, {
                    userId,
                    timestamp: Date.now()
                });

                await updateUserMetadata(userId, updatedMetadata);

                console.log('Auth0 update successful:', {
                    userId,
                    attempt,
                    timestamp: Date.now()
                });

                // Update last save time if this was a game save
                if (data && signature && timestamp) {
                    lastSavesByUser.set(userId, Date.now());

                    // Clean up old entries every hour
                    if (lastSavesByUser.size > 1000) {
                        const oneHourAgo = Date.now() - 3600000;
                        for (const [id, time] of lastSavesByUser.entries()) {
                            if (time < oneHourAgo) {
                                lastSavesByUser.delete(id);
                            }
                        }
                    }
                }

                return json({
                    success: true,
                    attempt,
                    timestamp: Date.now()
                });
            } catch (auth0Error: any) {
                lastError = auth0Error;
                console.error(`Auth0 API error (attempt ${attempt}/${maxRetries}):`, {
                    error: auth0Error.message,
                    name: auth0Error.name,
                    stack: auth0Error.stack,
                    userId,
                    timestamp: Date.now()
                });

                // For rate limiting, wait before retrying
                if (auth0Error.message.includes('429') || auth0Error.message.includes('Too Many Requests')) {
                    const waitTime = attempt * 2000; // 2 seconds, 4 seconds, 6 seconds
                    console.log(`Rate limited, waiting ${waitTime}ms before retry`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
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
            timestamp: Date.now()
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
