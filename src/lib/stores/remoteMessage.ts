import { writable, get } from 'svelte/store';
import { supabaseAuth } from '$stores/supabaseAuth';
import { browser } from '$app/environment';
import type { GameMessage } from '$lib/types/supabase';

function createRemoteMessageStore() {
	const { subscribe, set, update } = writable<{
		message: GameMessage | null;
		dismissedIds: string[];
		isVisible: boolean;
	}>({
		message: null,
		dismissedIds: browser ? JSON.parse(localStorage.getItem('dismissed_messages') || '[]') : [],
		isVisible: true
	});

	let interval: ReturnType<typeof setInterval> | null = null;
	let supabaseAvailable = false;

	// Listen for supabase availability
	if (browser) {
		supabaseAuth.subscribe(($auth) => {
			if ($auth.supabase && !supabaseAvailable) {
				supabaseAvailable = true;
				fetchMessage();
			}
		});
	}

	async function fetchMessage() {
		if (!browser) return;

		const authStore = get(supabaseAuth);
		const supabase = authStore.supabase;

		if (!supabase) {
			return;
		}

		try {
			const { data, error } = await supabase
				.from('game_messages')
				.select('*')
				.eq('is_active', true)
				.order('created_at', { ascending: false })
				.limit(1)
				.maybeSingle();

			if (error) {
				if (error.code !== '42P01') {
					console.error('Error fetching remote message:', error);
				}
				return;
			}

			update(state => {
				const isNewMessage = data && data.id !== state.message?.id;
				return {
					...state,
					message: data,
					// If it's a new message, make it visible even if the previous one was dismissed
					isVisible: isNewMessage ? !state.dismissedIds.includes(data.id) : state.isVisible
				};
			});
		} catch (err) {
			console.error('Failed to fetch remote message:', err);
		}
	}

	function dismiss() {
		update(state => {
			if (!state.message) return state;
			const newDismissedIds = [...new Set([...state.dismissedIds, state.message.id])];
			if (browser) {
				localStorage.setItem('dismissed_messages', JSON.stringify(newDismissedIds));
			}
			return {
				...state,
				dismissedIds: newDismissedIds,
				isVisible: false
			};
		});
	}

	function show() {
		update(state => ({ ...state, isVisible: true }));
	}

	function startPolling() {
		if (!browser) return;
		if (interval) return;

		fetchMessage();
		interval = setInterval(fetchMessage, 30000); // 30 seconds
	}

	function stopPolling() {
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	}

	return {
		subscribe,
		dismiss,
		show,
		startPolling,
		stopPolling,
		refresh: fetchMessage
	};
}

export const remoteMessage = createRemoteMessageStore();
