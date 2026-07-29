import { gameManager } from '$helpers/GameManager.svelte';
import type { LeaderboardEntry } from '$lib/types/leaderboard';
import { supabaseAuth } from '$stores/supabaseAuth.svelte';

export function createCurrentPlayerPreview(bannerId: string): LeaderboardEntry {
	const username =
		supabaseAuth.profile?.username ??
		supabaseAuth.user?.user_metadata?.username ??
		supabaseAuth.user?.user_metadata?.full_name ??
		supabaseAuth.user?.email?.split('@')[0] ??
		'Preview Player';

	return {
		atoms: gameManager.atoms,
		equippedBanner: bannerId,
		is_online: supabaseAuth.isAuthenticated,
		lastUpdated: Date.now(),
		level: gameManager.playerLevel,
		picture:
			supabaseAuth.profile?.picture ??
			supabaseAuth.user?.user_metadata?.avatar_url ??
			supabaseAuth.user?.user_metadata?.picture,
		rank: 1,
		username,
	};
}
