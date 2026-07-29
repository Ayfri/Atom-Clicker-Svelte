import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isQuarkAchievement, QUARK_ACHIEVEMENT_REWARD } from '$data/quarkAchievements';
import { verifyAndDecryptClientData } from '$lib/server/obfuscation.server';
import { quarksService, resolveUserFromRequest } from '$lib/server/supabase.server';

const MAX_ACHIEVEMENT_IDS_PER_REQUEST = 250;

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

		const { achievementIds } = data;
		if (!Array.isArray(achievementIds) || achievementIds.some(id => typeof id !== 'string')) {
			return json({ error: 'Invalid achievementIds' }, { status: 400 });
		}
		if (achievementIds.length > MAX_ACHIEVEMENT_IDS_PER_REQUEST) {
			return json({ error: 'Too many achievementIds' }, { status: 400 });
		}

		// Silently drop ids that aren't real achievements. The reward is our own constant, never the request's.
		const validIds: string[] = achievementIds.filter(isQuarkAchievement);

		let balance = 0;
		let granted = 0;
		for (const achievementId of validIds) {
			const result = await quarksService.grantQuarks(
				userId,
				QUARK_ACHIEVEMENT_REWARD,
				'achievement',
				`achievement:${achievementId}`,
			);
			balance = result.balance;
			if (result.status === 'ok') granted += 1;
		}

		return json({ balance, granted });
	} catch (error) {
		console.error('Failed to grant achievement quarks:', error);
		return json({ error: 'Failed to grant achievement quarks' }, { status: 500 });
	}
};
