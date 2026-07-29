-- Grant a batch of achievement Quarks while holding the balance row lock once.
-- Achievement ids are validated by the API route; unique ledger refs keep retries idempotent.
create or replace function public.grant_achievement_quarks(
	p_user_id uuid,
	p_achievement_ids text[],
	p_reward integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_balance integer;
	v_granted integer := 0;
begin
	if p_reward <= 0 then
		raise exception 'grant_achievement_quarks requires a positive reward, got %', p_reward;
	end if;

	insert into public.player_quarks (user_id) values (p_user_id)
		on conflict (user_id) do nothing;

	select balance into v_balance
	from public.player_quarks
	where user_id = p_user_id
	for update;

	with inserted as (
		insert into public.quark_ledger (user_id, delta, reason, ref)
		select p_user_id, p_reward, 'achievement', 'achievement:' || achievement_id
		from unnest(p_achievement_ids) as achievement_id
		on conflict (user_id, ref) do nothing
		returning id
	)
	select count(*) into v_granted from inserted;

	if v_granted > 0 then
		update public.player_quarks
		set balance = balance + v_granted * p_reward,
			lifetime_earned = lifetime_earned + v_granted * p_reward,
			updated_at = now()
		where user_id = p_user_id
		returning balance into v_balance;
	end if;

	return jsonb_build_object('balance', v_balance, 'granted', v_granted);
end;
$$;

revoke all on function public.grant_achievement_quarks(uuid, text[], integer) from public, anon, authenticated;
