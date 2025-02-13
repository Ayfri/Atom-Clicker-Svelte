import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { encryptData, decryptData, verifyAndDecryptClientData } from '$lib/server/obfuscation.server';
import { getAuth0Client } from '$lib/server/auth0.server';

const SAVE_COOLDOWN = 30000; // 30 seconds
const lastSavesByUser = new Map<string, number>();

export const GET: RequestHandler = async ({ url }) => {
    try {
        const userId = url.searchParams.get('userId');
        if (!userId) {
            return json({ error: 'User ID is required' }, { status: 400 });
        }

        const client = getAuth0Client();
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
    } catch {
        return json({ error: 'Failed to fetch user metadata' }, { status: 500 });
    }
};

export const PATCH: RequestHandler = async ({ request }) => {
    try {
        const { userId, metadata, data, signature, timestamp } = await request.json();
        if (!userId) {
            return json({ error: 'User ID is required' }, { status: 400 });
        }

        // Si nous avons des métadonnées directes, les mettre à jour
        if (metadata) {
            const client = getAuth0Client();
            await client.users.update({ id: userId }, { user_metadata: metadata });
            return json({ success: true });
        }

        // Sinon, traiter comme une sauvegarde de jeu
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
            return json({ error: 'Invalid or expired data' }, { status: 400 });
        }

        // Encrypt save data for storage
        const encryptedSave = encryptData(saveData);

        const client = getAuth0Client();
        await client.users.update({ id: userId }, {
            user_metadata: {
                lastCloudSave: now,
                cloudSaveInfo: encryptedSave
            }
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

        return json({ success: true });
    } catch {
        return json({ error: 'Failed to update user metadata' }, { status: 500 });
    }
};
