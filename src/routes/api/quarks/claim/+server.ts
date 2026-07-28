import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDailyCap, pickDailyQuests } from '$data/dailyQuests';
import { verifyAndDecryptClientData } from '$lib/server/obfuscation.server';
import { quarksService, resolveUserFromRequest } from '$lib/server/supabase.server';

function todayUtcDayKey(): string {
	return new Date().toISOString().slice(0, 10);
}

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

		const { questId } = data;
		if (typeof questId !== 'string') {
			return json({ error: 'Invalid questId' }, { status: 400 });
		}

		// Recompute today's quests server-side. A questId not in today's set is rejected outright,
		// which is the actual anti-cheat: the reward always comes from the server's own pool, never the request.
		const dayKey = todayUtcDayKey();
		const todaysQuests = pickDailyQuests(dayKey);
		const quest = todaysQuests.find(q => q.id === questId);
		if (!quest) {
			return json({ error: 'Quest is not part of today\'s set' }, { status: 400 });
		}

		const result = await quarksService.grantQuarks(userId, quest.reward, 'quest', `quest:${dayKey}:${questId}`, getDailyCap(todaysQuests));

		return json(result);
	} catch (error) {
		console.error('Failed to claim quest:', error);
		return json({ error: 'Failed to claim quest' }, { status: 500 });
	}
};
