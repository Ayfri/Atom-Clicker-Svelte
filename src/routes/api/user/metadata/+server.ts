import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ManagementClient } from 'auth0';
import { AUTH0_MGMT_CLIENT_SECRET, AUTH0_MGMT_CLIENT_ID } from '$env/static/private';
import { PUBLIC_AUTH0_DOMAIN } from '$env/static/public';
import { encryptData, decryptData, verifyAndDecryptClientData } from '$lib/server/obfuscation.server';

let auth0Management: ManagementClient;
const SAVE_COOLDOWN = 30000; // 30 seconds
const lastSavesByUser = new Map<string, number>();

function getAuth0Client() {
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
            } catch (error) {
                console.error('Error decrypting save data:', error);
                delete metadata.cloudSaveInfo;
            }
        }

        return json({ user_metadata: metadata });
    } catch (error) {
        console.error('Failed to fetch user metadata:', error);
        return json({ error: 'Failed to fetch user metadata' }, { status: 500 });
    }
};

export const PATCH: RequestHandler = async ({ request }) => {
    try {
        const { userId, data, signature, timestamp } = await request.json();
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
            console.error('Invalid or expired data:', data, signature, timestamp, saveData);
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
    } catch (error) {
        console.error('Failed to update user metadata:', error);
        return json({ error: 'Failed to update user metadata' }, { status: 500 });
    }
};
