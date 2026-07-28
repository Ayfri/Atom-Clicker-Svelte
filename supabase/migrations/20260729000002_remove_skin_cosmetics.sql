-- Skins have been replaced by Realm Themes and leaderboard banners.
-- get_leaderboard has a fixed return shape, so it must be recreated before the old column can
-- be dropped from profiles.

drop function if exists public.get_leaderboard(integer);

alter table public.profiles
	drop column if exists equipped_skin;

create function public.get_leaderboard(p_limit integer)
returns table (
	id text,
	username text,
	atoms text,
	level integer,
	picture text,
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
