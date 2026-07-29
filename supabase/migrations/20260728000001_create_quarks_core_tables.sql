-- Quarks: premium currency. Server-authoritative, never stored in the client save blob.

create table if not exists public.player_quarks (
	user_id uuid primary key references public.profiles(id) on delete cascade,
	balance integer not null default 0 check (balance >= 0),
	lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
	updated_at timestamptz not null default now()
);

-- Append-only ledger. The unique (user_id, ref) index is the idempotency mechanism:
-- it makes every grant, purchase and refund safely replayable.
create table if not exists public.quark_ledger (
	id bigint generated always as identity primary key,
	user_id uuid not null references public.profiles(id) on delete cascade,
	delta integer not null,
	reason text not null,
	ref text not null,
	item_id text,
	created_at timestamptz not null default now(),
	constraint quark_ledger_user_ref_unique unique (user_id, ref)
);

-- Daily cap sums scan by user + reason + day.
create index if not exists quark_ledger_user_reason_created_idx
	on public.quark_ledger (user_id, reason, created_at desc);

-- Refunds need the most recent purchase row for an item.
create index if not exists quark_ledger_user_item_idx
	on public.quark_ledger (user_id, item_id)
	where item_id is not null;

create table if not exists public.player_entitlements (
	user_id uuid not null references public.profiles(id) on delete cascade,
	item_id text not null,
	acquired_at timestamptz not null default now(),
	primary key (user_id, item_id)
);

alter table public.player_quarks enable row level security;
alter table public.quark_ledger enable row level security;
alter table public.player_entitlements enable row level security;

-- Players may read their own rows. All writes go through the service role,
-- which bypasses RLS, so no insert/update/delete policies are defined on purpose.
create policy player_quarks_select_own on public.player_quarks
	for select using (auth.uid() = user_id);

create policy quark_ledger_select_own on public.quark_ledger
	for select using (auth.uid() = user_id);

create policy player_entitlements_select_own on public.player_entitlements
	for select using (auth.uid() = user_id);
