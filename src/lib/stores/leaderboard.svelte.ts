import { writable, get } from 'svelte/store';
import { gameManager } from '$helpers/GameManager.svelte';
import { browser } from '$app/environment';
import { supabaseAuth } from '$stores/supabaseAuth';
import type { LeaderboardEntry } from '$lib/types/leaderboard';
import { obfuscateClientData } from '$lib/utils/obfuscation';

const REFRESH_INTERVAL = 1 * 60_000; // 1 minute between leaderboard refreshes
const MIN_UPDATE_INTERVAL = 30_000; // 30 seconds minimum between updates

const MIN_ATOMS_CHANGE_PERCENT = 0.05; // 5% minimum change in atoms

interface LeaderboardStats {
	totalUsers: number;
	totalAtoms: number;
	averageAtoms: number;
	medianAtoms: number;
}

interface LeaderboardData {
	entries: LeaderboardEntry[];
	stats: LeaderboardStats;
}

function createLeaderboardStore() {
	const { subscribe, set } = writable<LeaderboardEntry[]>([]);
	const { subscribe: subscribeStats, set: setStats } = writable<LeaderboardStats>({
		totalUsers: 0,
		totalAtoms: 0,
		averageAtoms: 0,
		medianAtoms: 0
	});

	// Update control variables
	let isUpdating = false;

	async function fetchLeaderboard() {
		if (!browser) return;
		try {
			const authState = get(supabaseAuth);
			const userId = authState.isAuthenticated ? authState.user?.id : '';
			const response = await fetch(`/api/leaderboard?userId=${userId}`);
			if (!response.ok) throw new Error('Failed to fetch leaderboard');
			const data: LeaderboardData = await response.json();
			set(data.entries);
			setStats(data.stats);
		} catch (error) {
			console.error('Error fetching leaderboard:', error);
		}
	}

	async function updateScore(atoms: number, level: number) {
		if (!browser || isUpdating) return;

		try {
			isUpdating = true;
			const authState = get(supabaseAuth);
			if (!authState.isAuthenticated || !authState.user) return;

			const username = authState.profile?.username ??
				authState.user.user_metadata?.username ??
				authState.user.user_metadata?.full_name ??
				authState.user.email?.split('@')[0] ??
				'Anonymous';

			const data = {
				username,
				atoms,
				level,
				userId: authState.user.id,
				picture: authState.profile?.picture ?? authState.user.user_metadata?.avatar_url ?? authState.user.user_metadata?.picture
			};

			const obfuscatedData = obfuscateClientData(data);

			const response = await fetch('/api/leaderboard', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(obfuscatedData)
			});

			if (!response.ok) {
				const errorData = await response.json();
				if (response.status === 429) {
					console.log(`Leaderboard rate limited. Next update in ${errorData.nextUpdateIn} seconds`);
					return;
				}
				throw new Error('Failed to update leaderboard');
			}

			// Refresh leaderboard after update
			await fetchLeaderboard();
		} catch (error) {
			console.error('Error updating leaderboard:', error);
		} finally {
			isUpdating = false;
		}
	}

	if (browser) {
		setInterval(fetchLeaderboard, REFRESH_INTERVAL);
	}

	return {
		entries: { subscribe },
		fetchLeaderboard,
		stats: { subscribe: subscribeStats },
		updateScore
	};
}

const leaderboardStore = createLeaderboardStore();

export const leaderboard = leaderboardStore.entries;
export const leaderboardStats = leaderboardStore.stats;
export const fetchLeaderboard = leaderboardStore.fetchLeaderboard;
export const updateLeaderboardScore = leaderboardStore.updateScore;

if (browser) {
	let lastAtoms = 0;
	let lastLevel = 0;
	let lastUpdate = 0;

	$effect.root(() => {
		$effect(() => {
			const atoms = gameManager.atoms;
			const level = gameManager.playerLevel;
			const auth = get(supabaseAuth);

			if (!auth.isAuthenticated) return;

			const now = Date.now();
			if (now - lastUpdate < MIN_UPDATE_INTERVAL) return;

			const atomsChange = Math.abs(atoms - lastAtoms) / Math.max(lastAtoms, 1);
			const shouldUpdate =
				lastAtoms === 0 || // First update
				atomsChange > MIN_ATOMS_CHANGE_PERCENT || // Significant change in atoms
				level !== lastLevel; // Level change

			if (shouldUpdate) {
				lastAtoms = atoms;
				lastLevel = level;
				lastUpdate = now;
				updateLeaderboardScore(atoms, level);
			}
		});
	});
}
