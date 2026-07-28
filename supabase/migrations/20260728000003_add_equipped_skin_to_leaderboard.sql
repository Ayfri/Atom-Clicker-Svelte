-- Adds the equipped cosmetic skin to profiles and surfaces it on the leaderboard.
--
-- CAUTION: this is the only migration in the Quarks set that touches a live code path.
-- get_leaderboard returns a TABLE(...) with a fixed column list, and Postgres rejects
-- CREATE OR REPLACE when the return type changes, so the function must be dropped and
-- recreated. Both statements run inside this one migration's transaction, so the swap is
-- atomic and no request can observe a missing function.
--
-- The recreated body is otherwise byte-for-byte the current production definition
-- (captured 2026-07-28) with the single equipped_skin column added.

alter table public.profiles
	add column if not exists equipped_skin text;

drop function if exists public.get_leaderboard(integer);

create function public.get_leaderboard(p_limit integer)
returns table (
	id text,
	username text,
	atoms text,
	level integer,
	picture text,
	equipped_skin text,
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
