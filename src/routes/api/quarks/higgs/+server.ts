import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
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

		if (Math.random() >= 1 / 300) {
			return json({ granted: 0 });
		}

		const result = await quarksService.grantQuarks(userId, 1, 'higgs_boson', `higgs:${crypto.randomUUID()}`);
		return json({ balance: result.balance, granted: result.status === 'ok' ? 1 : 0 });
	} catch (error) {
		console.error('Failed to grant Higgs Boson Quark:', error);
		return json({ error: 'Failed to grant Higgs Boson Quark' }, { status: 500 });
	}
};
