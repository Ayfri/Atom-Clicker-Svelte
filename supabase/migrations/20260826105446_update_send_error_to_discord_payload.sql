CREATE OR REPLACE FUNCTION public.send_error_to_discord()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
	webhook_url TEXT;
	discord_payload JSONB;
	browser_ua TEXT;
	screen_info TEXT;
	client_info TEXT;
	game_state_summary JSONB;
	warnings_count INT;
	save_status TEXT;
	embed_color INT;
BEGIN
	webhook_url := get_secret('DISCORD_ERROR_WEBHOOK_URL');

	IF webhook_url IS NULL OR webhook_url = '' THEN
		RETURN NEW;
	END IF;

	-- Client context, appVersion and sessionId are only present on reports from the new client
	browser_ua := NEW.browser_info->>'userAgent';
	screen_info := COALESCE(
		(NEW.browser_info->>'screenWidth')::TEXT || 'x' || (NEW.browser_info->>'screenHeight')::TEXT,
		'Unknown'
	);
	client_info := COALESCE(SUBSTRING(browser_ua, 1, 120), 'Unknown') ||
		E'\nScreen: ' || screen_info ||
		E'\nLang: ' || COALESCE(NEW.browser_info->>'language', 'Unknown') ||
		E'\nBuild: ' || COALESCE(NEW.browser_info->>'appVersion', 'Unknown') ||
		E'\nSession: ' || COALESCE(NEW.browser_info->>'sessionId', 'Unknown');

	-- Save integrity, tells a genuine bug apart from an edited save at a glance
	warnings_count := CASE
		WHEN jsonb_typeof(NEW.game_state->'saveWarnings') = 'array' THEN jsonb_array_length(NEW.game_state->'saveWarnings')
		ELSE 0
	END;
	save_status := CASE
		WHEN NEW.game_state->>'saveTampered' = 'true' THEN '⚠️ Edited outside the game'
		WHEN NEW.game_state->>'saveTampered' = 'false' AND warnings_count > 0 THEN '⚠️ ' || warnings_count::TEXT || ' plausibility warning(s)'
		WHEN NEW.game_state->>'saveTampered' = 'false' THEN '✅ Clean'
		ELSE '❔ Unknown'
	END;
	embed_color := CASE WHEN NEW.game_state->>'saveTampered' = 'true' THEN 16753920 ELSE 16711680 END;

	-- Curated summary, each COALESCE falls back to the pre-allow-list payload shape
	game_state_summary := jsonb_build_object(
		'atoms', COALESCE(NEW.game_state->'atoms', NEW.game_state->'currencies'->'Atoms'->'amount'),
		'protons', COALESCE(NEW.game_state->'protons', NEW.game_state->'currencies'->'Protons'->'amount'),
		'electrons', COALESCE(NEW.game_state->'electrons', NEW.game_state->'currencies'->'Electrons'->'amount'),
		'photons', COALESCE(NEW.game_state->'photons', NEW.game_state->'currencies'->'Photons'->'amount'),
		'totalXP', NEW.game_state->'totalXP',
		'totalClicks', COALESCE(NEW.game_state->'totalClicks', NEW.game_state->'totalClicksAllTime'),
		'upgrades', NEW.game_state->'upgrades',
		'achievements', NEW.game_state->'achievements',
		'realm', COALESCE(NEW.game_state->'realm', NEW.game_state->'selectedRealmId'),
		'radiationMass', COALESCE(NEW.game_state->'radiationMass', NEW.game_state->'radiation'->'mass'),
		'saveVersion', NEW.game_state->'version'
	);

	discord_payload := jsonb_build_object(
		'username', 'Atom Clicker Errors',
		'embeds', jsonb_build_array(
			jsonb_build_object(
				'title', '🚨 Production Error',
				'url', 'https://supabase.com/dashboard/project/lsdiecobeqxchkiffdwj/editor/254431',
				'description', '```' || SUBSTRING(COALESCE(NEW.error_message, 'Unknown error'), 1, 2000) || '```',
				'color', embed_color,
				'timestamp', NEW.created_at::TEXT,
				'fields',
					jsonb_build_array(
						jsonb_build_object(
							'name', '🔗 URL',
							'value', SUBSTRING(COALESCE(NEW.url, 'Unknown'), 1, 256),
							'inline', true
						),
						jsonb_build_object(
							'name', '👤 User ID',
							'value', '`' || COALESCE(NEW.user_id::TEXT, 'Anonymous') || '`',
							'inline', true
						),
						jsonb_build_object(
							'name', '🛡️ Save',
							'value', save_status,
							'inline', true
						),
						jsonb_build_object(
							'name', '🖥️ Client',
							'value', '```' || SUBSTRING(client_info, 1, 900) || '```',
							'inline', false
						),
						jsonb_build_object(
							'name', '🎮 Game State',
							'value', '```json' || E'\n' || SUBSTRING(game_state_summary::TEXT, 1, 800) || E'\n```',
							'inline', false
						)
					)
					||
					CASE
						WHEN NEW.stack_trace IS NOT NULL THEN
							jsonb_build_array(
								jsonb_build_object(
									'name', '📜 Stack Trace',
									'value', '```' || SUBSTRING(NEW.stack_trace, 1, 1000) || '```',
									'inline', false
								)
							)
						ELSE '[]'::JSONB
					END,
				'footer', jsonb_build_object(
					'text', 'Error ID: ' || NEW.id::TEXT
				)
			)
		)
	);

	PERFORM net.http_post(
		url := webhook_url,
		body := discord_payload,
		headers := jsonb_build_object(
			'Content-Type', 'application/json'
		)
	);
	RETURN NEW;
END;
$function$;
