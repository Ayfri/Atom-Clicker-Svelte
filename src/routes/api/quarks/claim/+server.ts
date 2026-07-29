import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDailyCap, getDailyQuestCount, pickDailyQuests, QUEST_POOL } from '$data/dailyQuests';
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

		// Quest eligibility relies on the player's local save, so the server verifies the pool and derives
		// the reward from its own definition rather than accepting a client-supplied amount.
		const dayKey = todayUtcDayKey();
		const entitlements = await quarksService.getEntitlements(userId);
		const todaysQuests = pickDailyQuests(dayKey, getDailyQuestCount(entitlements));
		const quest = QUEST_POOL.find(candidate => candidate.id === questId);
		if (!quest) {
			return json({ error: 'Unknown quest' }, { status: 400 });
		}
		if (quest.id === 'complete_other_daily_quests' && todaysQuests.length < 3) {
			return json({ error: 'The Third Daily Quest upgrade is required' }, { status: 400 });
		}

		const result = await quarksService.grantQuarks(userId, quest.reward, 'quest', `quest:${dayKey}:${questId}`, getDailyCap(todaysQuests));

		return json(result);
	} catch (error) {
		console.error('Failed to claim quest:', error);
		return json({ error: 'Failed to claim quest' }, { status: 500 });
	}
};
