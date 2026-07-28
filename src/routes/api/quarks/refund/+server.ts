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
		if (typeof itemId !== 'string') {
			return json({ error: 'Invalid itemId' }, { status: 400 });
		}

		const item = getQuarkShopItem(itemId);
		if (!item) {
			return json({ error: 'Unknown item' }, { status: 400 });
		}
		// Skins are a permanent sink, never refundable.
		if (item.type === 'skin') {
			return json({ error: 'Skins are not refundable' }, { status: 400 });
		}

		const result = await quarksService.refundItem(userId, itemId);

		return json(result);
	} catch (error) {
		console.error('Failed to refund quark item:', error);
		return json({ error: 'Failed to refund quark item' }, { status: 500 });
	}
};
