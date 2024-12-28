import { writable, derived, get } from 'svelte/store';
import { atoms, playerLevel } from './gameStore';
import { browser } from '$app/environment';
import { auth } from './auth';

export interface LeaderboardEntry {
    username: string;
    atoms: number;
    level: number;
    lastUpdated: number;
    userId: string;
    picture?: string;
}

let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
let lastUpdate = 0;
const REQUEST_INTERVAL = 60_000; // Keep 1 minute for client updates

function debounce<T extends (...args: any[]) => Promise<void>>(fn: T, interval: number = REQUEST_INTERVAL) {
	return (...args: Parameters<T>) => {
		const now = Date.now();
		if (now - lastUpdate < interval) {
			// If we're still within the debounce interval, clear any pending timeout
			if (debounceTimeout) clearTimeout(debounceTimeout);
			// Schedule the next update at the end of the current interval
			const timeUntilNextUpdate = interval - (now - lastUpdate);
			debounceTimeout = setTimeout(async () => {
				fn(...args);
				lastUpdate = Date.now();
			}, timeUntilNextUpdate);
			return;
		}

		// If we're outside the debounce interval, execute immediately
		fn(...args);
		lastUpdate = now;
	};
}

function createLeaderboardStore() {
    const { subscribe, set } = writable<LeaderboardEntry[]>([]);

    async function fetchLeaderboard() {
        if (!browser) return;
        try {
            const response = await fetch('/api/leaderboard');
            if (!response.ok) throw new Error('Failed to fetch leaderboard');
            const data = await response.json();
            set(data);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        }
    }

    async function updateScore(atoms: number, level: number) {
        const authState = get(auth);
        if (!browser || !authState.isAuthenticated || !authState.user) return;

        try {
            const response = await fetch('/api/leaderboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: authState.user.name || authState.user.email?.split('@')[0] || 'Anonymous',
                    atoms,
                    level,
                    userId: authState.user.sub,
                    picture: authState.user.picture
                })
            });

            if (!response.ok) throw new Error('Failed to update leaderboard');
            await debouncedFetch();
        } catch (error) {
            console.error('Error updating leaderboard:', error);
        }
    }

    const debouncedFetch = debounce(fetchLeaderboard);

    return {
        subscribe,
        fetchLeaderboard,
        updateScore
    };
}

export const leaderboard = createLeaderboardStore();

// Subscribe to atoms and level changes to update leaderboard
if (browser) {
    derived([atoms, playerLevel, auth], ([$atoms, $level, $auth]) => ({ atoms: $atoms, level: $level, auth: $auth }))
        .subscribe(({ atoms, level, auth }) => {
            if (auth.isAuthenticated) {
                debounce(() => leaderboard.updateScore(atoms, level))();
            }
        });
}
