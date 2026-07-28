-- Adds equipped themes (per-realm) and an equipped banner cosmetic to profiles, and surfaces
-- the banner on the leaderboard alongside the existing equipped_skin column.
--
-- Same caution as 20260728000003_add_equipped_skin_to_leaderboard.sql: get_leaderboard returns
-- a TABLE(...) with a fixed column list, so it must be dropped and recreated rather than
-- CREATE OR REPLACE'd. Both statements run inside this one migration's transaction.
--
-- equipped_themes is per-realm (e.g. {"atoms": "theme_atoms_ember"}), so it lives in its own
-- jsonb column rather than a single text column like equipped_skin/equipped_banner. It is not
-- surfaced on the leaderboard - themes only affect the equipping player's own client, unlike
-- skins/banners which other players see.

alter table public.profiles
	add column if not exists equipped_banner text;

alter table public.profiles
	add column if not exists equipped_themes jsonb not null default '{}'::jsonb;

drop function if exists public.get_leaderboard(integer);

create function public.get_leaderboard(p_limit integer)
returns table (
	id text,
	username text,
	atoms text,
	level integer,
	picture text,
	equipped_skin text,
	equipped_banner text,
	last_updated timestamptz,
	updated_at timestamptz,
	is_online boolean
)
language plpgsql
as $$
begin
	return query
	select
		p.id::text,
		coalesce(p.username, 'Anonymous') as username,
		p.atoms,
		p.level,
		p.picture,
		p.equipped_skin,
		p.equipped_banner,
		p.last_updated,
		p.updated_at,
		coalesce(p.is_online, false) as is_online
	from public.profiles p
	where p.atoms is not null
		and p.atoms != ''
		and p.atoms != 'NaN'
		and p.atoms != 'Infinity'
	order by p.atoms::numeric desc, p.level desc, p.last_updated desc
	limit p_limit;
end;
$$;
