-- ─────────────────────────────────────────────────────────────
-- BritSync Assistant — FULL SCHEMA FIX
-- Run this ONCE in Supabase SQL Editor. It fixes:
--   1. Missing profiles + chat_history tables
--   2. user_id columns wrongly typed as uuid instead of text
--   3. RLS policies using auth.uid() (always NULL for Better-Auth)
--
-- Safe to run multiple times (idempotent).
-- ─────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────
-- 1) PROFILES TABLE (was missing; user_id must be text for Better-Auth)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  business_name text,
  industry      text,
  summary       text,
  goals         text[] default '{}',
  plan          text default 'pro',
  created_at    timestamptz default now()
);

-- If the table already existed with user_id typed as uuid, convert it.
do $outer$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'user_id' and data_type = 'uuid'
  ) then
    execute 'alter table public.profiles alter column user_id type text using user_id::text';
  end if;
end
$outer$;

create index if not exists profiles_user_idx on public.profiles (user_id);

-- ──────────────────────────────────────────────────────────────
-- 2) CHAT_HISTORY TABLE (was only ALTERed, never CREATEd)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.chat_history (
  id          uuid primary key default gen_random_uuid(),
  session_id  text,
  user_id     text,
  team_id     uuid,
  role        text,
  content     text,
  attachments jsonb,
  sender_id   text,
  sender_name text,
  created_at  timestamptz default now()
);

-- Idempotent: make sure the columns added by team_refactor.sql are present.
alter table public.chat_history
  add column if not exists user_id text,
  add column if not exists team_id uuid,
  add column if not exists sender_id text,
  add column if not exists sender_name text,
  add column if not exists attachments jsonb;

create index if not exists chat_history_session_idx on public.chat_history (session_id);
create index if not exists chat_history_user_idx    on public.chat_history (user_id);
create index if not exists chat_history_team_idx    on public.chat_history (team_id);

-- ──────────────────────────────────────────────────────────────
-- 3) RLS — drop every auth.uid() policy, replace with open anon
--    (App enforces user scoping via Better-Auth + client filters.)
-- ──────────────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.chat_history   enable row level security;
alter table public.teams          enable row level security;
alter table public.team_members   enable row level security;
alter table public.team_memory    enable row level security;
alter table public.finance_entries enable row level security;
alter table public.finance_goals  enable row level security;

-- Drop every old policy we might have created. Safe if absent.
drop policy if exists "profiles_all_own"               on public.profiles;
drop policy if exists "profiles_all_anon"              on public.profiles;
drop policy if exists "chat_history_own_select"        on public.chat_history;
drop policy if exists "chat_history_own_insert"        on public.chat_history;
drop policy if exists "chat_history_own_delete"        on public.chat_history;
drop policy if exists "chat_history_all_anon"          on public.chat_history;
drop policy if exists "teams_select_if_member"         on public.teams;
drop policy if exists "teams_select_if_member_or_pin"  on public.teams;
drop policy if exists "teams_select_signed_in"         on public.teams;
drop policy if exists "teams_insert_owner"             on public.teams;
drop policy if exists "teams_update_owner"             on public.teams;
drop policy if exists "teams_delete_owner"             on public.teams;
drop policy if exists "teams_all_anon"                 on public.teams;
drop policy if exists "team_members_select_self"         on public.team_members;
drop policy if exists "team_members_select_self_or_owner" on public.team_members;
drop policy if exists "team_members_insert_self"         on public.team_members;
drop policy if exists "team_members_delete_self"         on public.team_members;
drop policy if exists "team_members_delete_owner"        on public.team_members;
drop policy if exists "team_members_all_anon"            on public.team_members;
drop policy if exists "team_memory_select_member"        on public.team_memory;
drop policy if exists "team_memory_write_owner"          on public.team_memory;
drop policy if exists "team_memory_all_anon"             on public.team_memory;
drop policy if exists "finance_entries_select_own"       on public.finance_entries;
drop policy if exists "finance_entries_insert_own"       on public.finance_entries;
drop policy if exists "finance_entries_update_own"       on public.finance_entries;
drop policy if exists "finance_entries_delete_own"       on public.finance_entries;
drop policy if exists "finance_entries_all_anon"         on public.finance_entries;
drop policy if exists "finance_goals_all_own"            on public.finance_goals;
drop policy if exists "finance_goals_all_anon"           on public.finance_goals;

-- Create permissive anon policies (app-level security via Better-Auth).
create policy "profiles_all_anon"        on public.profiles        for all using (true) with check (true);
create policy "chat_history_all_anon"    on public.chat_history    for all using (true) with check (true);
create policy "teams_all_anon"           on public.teams           for all using (true) with check (true);
create policy "team_members_all_anon"    on public.team_members    for all using (true) with check (true);
create policy "team_memory_all_anon"     on public.team_memory     for all using (true) with check (true);
create policy "finance_entries_all_anon" on public.finance_entries for all using (true) with check (true);
create policy "finance_goals_all_anon"   on public.finance_goals   for all using (true) with check (true);

-- ──────────────────────────────────────────────────────────────
-- 4) Drop stale RPC + trigger that never worked in this app's auth model.
-- ──────────────────────────────────────────────────────────────
drop trigger if exists trg_bootstrap_owner on public.teams;
drop function if exists public.bootstrap_owner_membership();
drop function if exists public.join_team_by_pin(text, text);

-- Done.
