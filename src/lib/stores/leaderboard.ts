import { writable, derived, get } from 'svelte/store';
import { atoms, playerLevel } from './gameStore';
import { browser } from '$app/environment';
import { supabaseAuth } from './supabaseAuth';
import type { LeaderboardEntry } from '$lib/types/leaderboard';
import { obfuscateClientData } from '$lib/utils/obfuscation';

// Constantes de temps (en millisecondes)
const REFRESH_INTERVAL = 1 * 60_000; // 1 minute entre chaque rafraîchissement du leaderboard
const MIN_UPDATE_INTERVAL = 10_000; // 10 secondes minimum entre les mises à jour

// Seuils de mise à jour
const MIN_ATOMS_CHANGE_PERCENT = 0.05; // 5% de changement minimum dans les atoms

function createLeaderboardStore() {
	const { subscribe, set } = writable<LeaderboardEntry[]>([]);

	// Variables de contrôle des mises à jour
	let isUpdating = false;

	async function fetchLeaderboard() {
		if (!browser) return;
		try {
			const authState = get(supabaseAuth);
			const userId = authState.isAuthenticated ? authState.user?.id : '';
			const response = await fetch(`/api/leaderboard?userId=${userId}`);
			if (!response.ok) throw new Error('Failed to fetch leaderboard');
			const data = await response.json();
			set(data);
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
					console.log(`Rate limited. Next update in ${errorData.nextUpdateIn} seconds`);
					return;
				}
				throw new Error('Failed to update leaderboard');
			}

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
		subscribe,
		fetchLeaderboard,
		updateScore
	};
}

export const leaderboard = createLeaderboardStore();

if (browser) {
	let lastAtoms = 0;
	let lastLevel = 0;
	let lastUpdate = 0;

	derived([atoms, playerLevel, supabaseAuth], ([$atoms, $level, $auth]) => ({ atoms: $atoms, level: $level, auth: $auth }))
		.subscribe(({ atoms, level, auth }) => {
			if (!auth.isAuthenticated) return;

			const now = Date.now();
			if (now - lastUpdate < MIN_UPDATE_INTERVAL) return;

			const atomsChange = Math.abs(atoms - lastAtoms) / Math.max(lastAtoms, 1);
			const shouldUpdate =
				lastAtoms === 0 ||
				atomsChange > MIN_ATOMS_CHANGE_PERCENT ||
				level !== lastLevel;

			if (shouldUpdate) {
				lastAtoms = atoms;
				lastLevel = level;
				lastUpdate = now;
				leaderboard.updateScore(atoms, level);
			}
		});
}
