import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import type { GameState } from '$lib/types';
import type { Database } from '$lib/types/supabase';
import { gameManager } from '$helpers/GameManager.svelte';
import { isValidGameState, SAVE_VERSION, migrateSavedState, validateAndRepairGameState } from '$helpers/saves';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface SupabaseAuthStore {
	isAuthenticated: boolean;
	user: User | null;
	profile: Profile | null;
	loading: boolean;
	supabase: SupabaseClient<Database> | null;
	error: Error | null;
}

function createSupabaseAuthStore() {
	const { subscribe, set, update } = writable<SupabaseAuthStore>({
		isAuthenticated: false,
		user: null,
		profile: null,
		loading: true,
		supabase: null,
		error: null
	});

	let supabase: SupabaseClient<Database>;

	async function init() {
		if (!browser) {
			update(state => ({ ...state, loading: false }));
			return;
		}

		try {
			supabase = createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
				auth: {
					autoRefreshToken: true,
					persistSession: true,
					detectSessionInUrl: true
				}
			});

			update(state => ({ ...state, supabase }));

			// Get initial session
			const { data: { session } } = await supabase.auth.getSession();
			await handleAuthStateChange(session?.user || null);

			// Listen for auth changes
			supabase.auth.onAuthStateChange(async (event, session) => {
				console.log('Auth state changed:', event);
				await handleAuthStateChange(session?.user || null);
			});

		} catch (error) {
			console.error('Supabase auth initialization error:', error);
			update(state => ({
				...state,
				error: error as Error,
				loading: false
			}));
		}
	}

	async function handleAuthStateChange(user: User | null) {
		try {
			if (user) {
				update(state => ({
					...state,
					isAuthenticated: true,
					user,
					loading: true
				}));

				console.log('Auth state change for user:', user.id, user.email);

				// Fetch user profile - try multiple ways to find it
				let profile = null;

				// First, try with the Supabase UUID
				const { data: directProfile, error: directError } = await supabase
					.from('profiles')
					.select('*')
					.eq('id', user.id)
					.single();

				console.log('Direct profile lookup result:', { directProfile, error: directError?.message });

				if (directProfile) {
					profile = directProfile;
					console.log('Found direct profile:', profile.username);
				}

				// If still no profile, create a new one
				if (!profile) {
					console.log('No profile found, creating new one...');

					const newProfile = {
						id: user.id,
						username: user.user_metadata?.full_name || user.user_metadata?.username || user.email?.split('@')[0] || 'Anonymous',
						atoms: '0', // Default leaderboard data for new users
						level: 1,   // Default leaderboard data for new users
						picture: user.user_metadata?.avatar_url || user.user_metadata?.picture,
						save: null,
						last_updated: new Date().toISOString(),
						updated_at: new Date().toISOString(),
						created_at: new Date().toISOString()
					};

					console.log('Creating fresh profile with data:', newProfile);

					const { error: createError } = await supabase
						.from('profiles')
						.insert(newProfile);

					if (createError) {
						console.error('Error creating profile:', createError);
					} else {
						profile = newProfile;
						console.log('Successfully created fresh profile for:', profile.username);
					}
				}

				console.log('Final profile result:', profile);

				update(state => ({
					...state,
					profile: profile || null,
					loading: false,
					error: null
				}));
			} else {
				console.log('User signed out');
				update(state => ({
					...state,
					isAuthenticated: false,
					user: null,
					profile: null,
					loading: false,
					error: null
				}));
			}
		} catch (error) {
			console.error('Error handling auth state change:', error);
			update(state => ({
				...state,
				error: error as Error,
				loading: false
			}));
		}
	}

	async function signInWithProvider(provider: 'google' | 'discord' | 'twitter') {
		if (!browser || !supabase) return;

		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider,
				options: {
					redirectTo: `${window.location.origin}/callback`,
					queryParams: {
						access_type: 'offline',
						prompt: 'consent'
					}
				}
			});

			if (error) {
				update(state => ({ ...state, error }));
				throw error;
			}
		} catch (error) {
			console.error('Sign in error:', error);
			throw error;
		}
	}

	async function signOut() {
		if (!browser || !supabase) return;

		try {
			const { error } = await supabase.auth.signOut();
			if (error) {
				update(state => ({ ...state, error }));
				throw error;
			}
		} catch (error) {
			console.error('Sign out error:', error);
			throw error;
		}
	}

	async function updateProfile(updates: Partial<Profile>) {
		if (!browser || !supabase) return;

		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) throw new Error('No authenticated user');

			const { error } = await supabase
				.from('profiles')
				.update({
					...updates,
					updated_at: new Date().toISOString()
				})
				.eq('id', user.id);

			if (error) throw error;

			// Update local state
			update(state => ({
				...state,
				profile: state.profile ? { ...state.profile, ...updates } : null
			}));
		} catch (error) {
			console.error('Error updating profile:', error);
			throw error;
		}
	}

	async function saveGameToCloud() {
		if (!browser || !supabase) return;

		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) throw new Error('No authenticated user');

			const currentState = gameManager.getCurrentState();
			const saveData = {
				...currentState,
				version: SAVE_VERSION,
				lastSaveDate: Date.now()
			};

			const { error } = await supabase
				.from('profiles')
				.update({
					save: saveData as any,
					updated_at: new Date().toISOString()
					// Don't update last_updated as it's used for leaderboard tracking
				})
				.eq('id', user.id);

			if (error) throw error;

			// Update local profile state
			update(state => ({
				...state,
				profile: state.profile ? {
					...state.profile,
					save: saveData as any,
					updated_at: new Date().toISOString()
				} : null
			}));
		} catch (error) {
			console.error('Error saving game to cloud:', error);
			throw error;
		}
	}

	async function loadGameFromCloud() {
		if (!browser || !supabase) return false;

		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) throw new Error('No authenticated user');

			const { data: profile, error } = await supabase
				.from('profiles')
				.select('save')
				.eq('id', user.id)
				.single();

			if (error) throw error;
			if (!profile?.save) return false;

			const savedState = profile.save as any;
			const migratedState = migrateSavedState(savedState);

			if (migratedState && isValidGameState(migratedState)) {
				gameManager.loadSaveData(migratedState);
				return true;
			}
			return false;
		} catch (error) {
			console.error('Error loading game from cloud:', error);
			throw error;
		}
	}

	async function getCloudSaveInfo() {
		if (!browser || !supabase) return null;

		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return null;

			const { data: profile, error } = await supabase
				.from('profiles')
				.select('save, last_updated')
				.eq('id', user.id)
				.single();

			if (error) throw error;
			if (!profile?.save) return null;

			const saveData = profile.save as any;
			const migratedData = migrateSavedState(saveData);
			if (!migratedData) return null;

			// Repair to ensure all fields exist
			const repairResult = validateAndRepairGameState(migratedData);
			const finalData = repairResult.state || (migratedData as GameState);

			return {
				lastSaveDate: saveData.lastSaveDate || null,
				...finalData
			};
		} catch (error) {
			console.error('Error getting cloud save info:', error);
			return null;
		}
	}

	return {
		subscribe,
		init,
		signInWithProvider,
		signOut,
		updateProfile,
		saveGameToCloud,
		loadGameFromCloud,
		getCloudSaveInfo
	};
}

export const supabaseAuth = createSupabaseAuthStore();
export const userProfile = derived(supabaseAuth, $auth => $auth.profile);
