import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabase.server';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const authHeader = request.headers.get('Authorization');
		if (!authHeader) {
			return json({ error: 'No authorization header' }, { status: 401 });
		}

		const token = authHeader.replace('Bearer ', '');
		const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

		if (authError || !user) {
			return json({ error: 'Invalid token' }, { status: 401 });
		}

		const { is_online } = await request.json();

		if (typeof is_online !== 'boolean') {
			return json({ error: 'Invalid is_online value' }, { status: 400 });
		}

		const { error: updateError } = await supabaseAdmin
			.from('profiles')
			.update({
				is_online,
				updated_at: new Date().toISOString()
			})
			.eq('id', user.id);

		if (updateError) {
			console.error('Error updating online status:', updateError);
			return json({ error: 'Failed to update status' }, { status: 500 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error in auth status endpoint:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
