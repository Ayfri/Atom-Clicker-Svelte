import { createClient } from '@supabase/supabase-js'
import type { Database } from '$lib/types/supabase'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { SUPABASE_SERVICE_ROLE } from '$env/static/private'

// Server-side client with service role key for admin operations
export const supabaseAdmin = createClient<Database>(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
})

// Helper functions for leaderboard operations
export const leaderboardService = {
	async getLeaderboard(limit: number = 100, currentUserId?: string) {
		console.log('Calling get_leaderboard RPC with:', { p_limit: limit, p_current_user_id: currentUserId });

		const { data, error } = await supabaseAdmin.rpc('get_leaderboard', {
			p_limit: limit,
			p_current_user_id: currentUserId
		});

		if (error) {
			console.error('Error fetching leaderboard:', error);
			throw error;
		}

		console.log('Leaderboard RPC returned:', data);
		return data;
	},

	async updateProfileStats(
		userId: string,
		atoms: number,
		level: number,
		username?: string,
		picture?: string
	) {
		const atomsString = atoms.toString();
		console.log('Calling update_profile_stats RPC with:', {
			p_user_id: userId,
			p_atoms: atomsString,
			p_level: level,
			p_username: username,
			p_picture: picture
		});

		const { error } = await supabaseAdmin.rpc('update_profile_stats', {
			p_user_id: userId,
			p_atoms: atomsString,
			p_level: level,
			p_username: username,
			p_picture: picture
		});

		if (error) {
			console.error('Error updating profile stats:', error);
			throw error;
		}

		console.log('Successfully updated profile stats for user:', userId);
	},

	async getProfile(userId: string) {
		const { data, error } = await supabaseAdmin
			.from('profiles')
			.select('*')
			.eq('id', userId)
			.single()

		if (error && error.code !== 'PGRST116') {
			// PGRST116 is "not found" error, which is expected for new users
			console.error('Error fetching profile:', error)
			throw error
		}

		return data
	}
}
