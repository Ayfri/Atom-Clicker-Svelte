import { writable, derived, get } from 'svelte/store';
import { atoms, playerLevel } from './gameStore';
import { browser } from '$app/environment';
import { auth } from './auth';
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
			const authState = get(auth);
			const userId = authState.isAuthenticated ? authState.user?.sub : '';
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
			const authState = get(auth);
			if (!authState.isAuthenticated || !authState.user) return;

			const username = authState.user.user_metadata?.username ??
				authState.user.preferred_username ??
				authState.user.name ??
				authState.user.email?.split('@')[0] ??
				'Anonymous';

			const data = {
				username,
				atoms,
				level,
				userId: authState.user.sub,
				picture: authState.user.picture
			};

			const obfuscatedData = obfuscateClientData(data);

			const response = await fetch('/api/leaderboard', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(obfuscatedData)
			});

			if (!response.ok) throw new Error('Failed to update leaderboard');
			
			// Rafraîchir le leaderboard après la mise à jour
			await fetchLeaderboard();
		} catch (error) {
			console.error('Error updating leaderboard:', error);
		} finally {
			isUpdating = false;
		}
	}

	// Rafraîchir le leaderboard périodiquement
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

// Subscribe to atoms and level changes to update leaderboard
if (browser) {
	let lastAtoms = 0;
	let lastLevel = 0;
	let lastUpdate = 0;

	derived([atoms, playerLevel, auth], ([$atoms, $level, $auth]) => ({ atoms: $atoms, level: $level, auth: $auth }))
		.subscribe(({ atoms, level, auth }) => {
			if (!auth.isAuthenticated) return;

			const now = Date.now();
			if (now - lastUpdate < MIN_UPDATE_INTERVAL) return;

			// Vérifier si la mise à jour est nécessaire
			const atomsChange = Math.abs(atoms - lastAtoms) / Math.max(lastAtoms, 1);
			const shouldUpdate = 
				lastAtoms === 0 || // Première mise à jour
				atomsChange > MIN_ATOMS_CHANGE_PERCENT || // Changement significatif dans les atoms
				level !== lastLevel; // Changement de niveau

			if (shouldUpdate) {
				lastAtoms = atoms;
				lastLevel = level;
				lastUpdate = now;
				leaderboard.updateScore(atoms, level);
			}
		});
}
