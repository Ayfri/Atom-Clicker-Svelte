import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getQuarkShopItem } from '$data/quarkShop';
import { verifyAndDecryptClientData } from '$lib/server/obfuscation.server';
import { quarksService, resolveUserFromRequest } from '$lib/server/supabase.server';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const userId = await resolveUserFromRequest(request);
		if (!userId) {
			return json({ error: 'No authorization header' }, { status: 401 });
		}

		const { data: encryptedData, signature, timestamp } = await request.json();
		const data = verifyAndDecryptClientData(encryptedData, signature, timestamp);
		if (!data) {
			return json({ error: 'Invalid or expired data' }, { status: 400 });
		}

		const { itemId } = data;
		if (itemId !== null && typeof itemId !== 'string') {
			return json({ error: 'Invalid itemId' }, { status: 400 });
		}

		if (itemId !== null) {
			const item = getQuarkShopItem(itemId);
			if (!item || item.type !== 'banner') {
				return json({ error: 'Unknown banner' }, { status: 400 });
			}

			const owned = await quarksService.getEntitlements(userId);
			if (!owned.includes(itemId)) {
				return json({ error: 'Banner not owned' }, { status: 403 });
			}
		}

		await quarksService.equipBanner(userId, itemId);

		return json({ equippedBanner: itemId });
	} catch (error) {
		console.error('Failed to equip banner:', error);
		return json({ error: 'Failed to equip banner' }, { status: 500 });
	}
};
