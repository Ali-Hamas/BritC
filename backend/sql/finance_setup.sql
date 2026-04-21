-- ─────────────────────────────────────────────────────────────
-- BritSync Assistant — Finance Intelligence (Phase 1)
-- Run this once in the Supabase SQL Editor.
-- Requires a Supabase project with Better-Auth integration.
-- ─────────────────────────────────────────────────────────────

-- 1) Entries table
create table if not exists public.finance_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  entry_date date not null,
  type       text not null check (type in ('revenue','expense')),
  category   text not null,
  amount     numeric(12,2) not null check (amount >= 0),
  note       text,
  created_at timestamptz default now()
);

create index if not exists finance_entries_user_date
  on public.finance_entries (user_id, entry_date desc);

-- 2) Goals table (one row per user)
create table if not exists public.finance_goals (
  user_id                 text primary key,
  target_monthly_revenue  numeric(12,2),
  target_margin_pct       numeric(5,2),
  updated_at              timestamptz default now()
);

-- 3) Row-Level Security
alter table public.finance_entries enable row level security;
alter table public.finance_goals   enable row level security;

-- Drop old policies if they exist, so this script is idempotent
drop policy if exists "finance_entries_select_own" on public.finance_entries;
drop policy if exists "finance_entries_insert_own" on public.finance_entries;
drop policy if exists "finance_entries_update_own" on public.finance_entries;
drop policy if exists "finance_entries_delete_own" on public.finance_entries;
drop policy if exists "finance_goals_all_own"      on public.finance_goals;

-- Policies — user_id column is text, Better-Auth stores ids as text.
-- If you use Supabase Auth instead, swap the RHS with auth.uid()::text.
create policy "finance_entries_select_own"
  on public.finance_entries for select
  using (user_id = auth.uid()::text);

create policy "finance_entries_insert_own"
  on public.finance_entries for insert
  with check (user_id = auth.uid()::text);

create policy "finance_entries_update_own"
  on public.finance_entries for update
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy "finance_entries_delete_own"
  on public.finance_entries for delete
  using (user_id = auth.uid()::text);

create policy "finance_goals_all_own"
  on public.finance_goals for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

-- Done.
