import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDailyCap, pickDailyQuests } from '$data/dailyQuests';
import { leaderboardService, quarksService, resolveUserFromRequest } from '$lib/server/supabase.server';

function todayUtcDayKey(): string {
	return new Date().toISOString().slice(0, 10);
}

export const GET: RequestHandler = async ({ request }) => {
	try {
		const userId = await resolveUserFromRequest(request);
		const dayKey = todayUtcDayKey();
		const quests = pickDailyQuests(dayKey);

		if (!userId) {
			return json({
				balance: 0,
				claimedQuestIds: [],
				dailyCap: getDailyCap(quests),
				dayKey,
				entitlements: [],
				equippedSkin: null,
				quests,
			});
		}

		const [balanceRow, claimedQuestIds, entitlements] = await Promise.all([
			quarksService.getBalance(userId),
			quarksService.getClaimedQuestIds(userId, dayKey),
			quarksService.getEntitlements(userId),
		]);
		const profile = await leaderboardService.getProfile(userId);

		return json({
			balance: balanceRow?.balance ?? 0,
			claimedQuestIds,
			dailyCap: getDailyCap(quests),
			dayKey,
			entitlements,
			equippedSkin: (profile as { equipped_skin?: string | null } | null)?.equipped_skin ?? null,
			quests,
		});
	} catch (error) {
		console.error('Failed to fetch quarks state:', error);
		return json({ error: 'Failed to fetch quarks state' }, { status: 500 });
	}
};
