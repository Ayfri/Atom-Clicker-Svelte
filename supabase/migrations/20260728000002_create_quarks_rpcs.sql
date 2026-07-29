-- Quark RPCs. All are called by the service role from SvelteKit API routes; the caller's
-- identity is established there via supabaseAdmin.auth.getUser(token), never from the payload.
--
-- Concurrency: every function takes a row lock on player_quarks first, which serialises all
-- Quark mutations for a given user. The unique (user_id, ref) index stays as a second line of
-- defence so a replayed request can never double-credit even if the lock is bypassed.

-- Grant Quarks for a quest claim or an achievement unlock.
-- p_daily_cap is enforced per (user, reason) over the current UTC day; pass null to skip it.
create or replace function public.grant_quarks(
	p_user_id uuid,
	p_delta integer,
	p_reason text,
	p_ref text,
	p_daily_cap integer default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_balance integer;
	v_today_total integer := 0;
	v_utc_day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
begin
	if p_delta <= 0 then
		raise exception 'grant_quarks requires a positive delta, got %', p_delta;
	end if;

	insert into public.player_quarks (user_id) values (p_user_id)
		on conflict (user_id) do nothing;

	select balance into v_balance
	from public.player_quarks
	where user_id = p_user_id
	for update;

	-- Idempotency: the same ref is never credited twice.
	if exists (select 1 from public.quark_ledger where user_id = p_user_id and ref = p_ref) then
		return jsonb_build_object('status', 'already_claimed', 'balance', v_balance);
	end if;

	if p_daily_cap is not null then
		select coalesce(sum(delta), 0) into v_today_total
		from public.quark_ledger
		where user_id = p_user_id
			and reason = p_reason
			and delta > 0
			and created_at >= v_utc_day_start;

		if v_today_total + p_delta > p_daily_cap then
			return jsonb_build_object('status', 'cap_reached', 'balance', v_balance);
		end if;
	end if;

	insert into public.quark_ledger (user_id, delta, reason, ref)
	values (p_user_id, p_delta, p_reason, p_ref);

	update public.player_quarks
	set balance = balance + p_delta,
		lifetime_earned = lifetime_earned + p_delta,
		updated_at = now()
	where user_id = p_user_id
	returning balance into v_balance;

	return jsonb_build_object('status', 'ok', 'balance', v_balance);
end;
$$;

-- Buy a shop item. Cost is supplied by the server from its own shop data, never by the client.
create or replace function public.purchase_quark_item(
	p_user_id uuid,
	p_item_id text,
	p_cost integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_balance integer;
	v_attempt integer;
begin
	if p_cost < 0 then
		raise exception 'purchase_quark_item requires a non-negative cost, got %', p_cost;
	end if;

	insert into public.player_quarks (user_id) values (p_user_id)
		on conflict (user_id) do nothing;

	select balance into v_balance
	from public.player_quarks
	where user_id = p_user_id
	for update;

	if exists (
		select 1 from public.player_entitlements
		where user_id = p_user_id and item_id = p_item_id
	) then
		return jsonb_build_object('status', 'already_owned', 'balance', v_balance);
	end if;

	if v_balance < p_cost then
		return jsonb_build_object('status', 'insufficient_balance', 'balance', v_balance);
	end if;

	-- Refundable boosts mean buy/refund/rebuy is a normal action, so the ledger ref carries an
	-- attempt counter. Without it the unique index would silently swallow every re-purchase.
	select count(*) into v_attempt
	from public.quark_ledger
	where user_id = p_user_id and reason = 'purchase' and item_id = p_item_id;

	insert into public.player_entitlements (user_id, item_id)
	values (p_user_id, p_item_id);

	insert into public.quark_ledger (user_id, delta, reason, ref, item_id)
	values (p_user_id, -p_cost, 'purchase', 'purchase:' || p_item_id || ':' || v_attempt, p_item_id);

	update public.player_quarks
	set balance = balance - p_cost,
		updated_at = now()
	where user_id = p_user_id
	returning balance into v_balance;

	return jsonb_build_object('status', 'ok', 'balance', v_balance);
end;
$$;

-- Respec: refund a boost or convenience unlock at 100%.
-- Skins are not refundable; that rule is enforced in the API route, which owns the shop data.
-- The credit is read from the original purchase row, NOT from the current shop price, so a
-- later rebalance can never be arbitraged into free Quarks.
create or replace function public.refund_quark_item(
	p_user_id uuid,
	p_item_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_balance integer;
	v_paid integer;
	v_attempt integer;
begin
	insert into public.player_quarks (user_id) values (p_user_id)
		on conflict (user_id) do nothing;

	select balance into v_balance
	from public.player_quarks
	where user_id = p_user_id
	for update;

	if not exists (
		select 1 from public.player_entitlements
		where user_id = p_user_id and item_id = p_item_id
	) then
		return jsonb_build_object('status', 'not_owned', 'balance', v_balance);
	end if;

	select -delta into v_paid
	from public.quark_ledger
	where user_id = p_user_id and reason = 'purchase' and item_id = p_item_id
	order by id desc
	limit 1;

	if v_paid is null then
		return jsonb_build_object('status', 'no_purchase_record', 'balance', v_balance);
	end if;

	select count(*) into v_attempt
	from public.quark_ledger
	where user_id = p_user_id and reason = 'refund' and item_id = p_item_id;

	delete from public.player_entitlements
	where user_id = p_user_id and item_id = p_item_id;

	insert into public.quark_ledger (user_id, delta, reason, ref, item_id)
	values (p_user_id, v_paid, 'refund', 'refund:' || p_item_id || ':' || v_attempt, p_item_id);

	-- lifetime_earned is intentionally not incremented: a refund returns spent Quarks,
	-- it does not earn new ones.
	update public.player_quarks
	set balance = balance + v_paid,
		updated_at = now()
	where user_id = p_user_id
	returning balance into v_balance;

	return jsonb_build_object('status', 'ok', 'balance', v_balance, 'refunded', v_paid);
end;
$$;

revoke all on function public.grant_quarks(uuid, integer, text, text, integer) from public, anon, authenticated;
revoke all on function public.purchase_quark_item(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.refund_quark_item(uuid, text) from public, anon, authenticated;
