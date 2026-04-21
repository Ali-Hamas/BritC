-- ─────────────────────────────────────────────────────────────
-- BritSync Assistant — Team refactor
-- "Chatbot inside a chatbot" model.
-- Run this once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────

-- 1) teams ────────────────────────────────────────────────────
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  owner_id    text not null,
  pin         text unique not null,
  title       text,
  created_at  timestamptz default now()
);

create index if not exists teams_owner_idx on public.teams (owner_id);

-- 2) team_members ─────────────────────────────────────────────
create table if not exists public.team_members (
  team_id       uuid references public.teams(id) on delete cascade,
  user_id       text not null,
  role          text not null check (role in ('owner','member')),
  display_name  text,
  joined_at     timestamptz default now(),
  primary key (team_id, user_id)
);

create index if not exists team_members_user_idx on public.team_members (user_id);

-- 3) team_memory ──────────────────────────────────────────────
create table if not exists public.team_memory (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid references public.teams(id) on delete cascade,
  type        text not null,
  title       text,
  content     text not null,
  status      text default 'active',
  priority    int default 0,
  tags        text[] default '{}',
  updated_at  timestamptz default now()
);

create index if not exists team_memory_team_idx on public.team_memory (team_id);

-- 4) chat_history: add team_id + user_id stamps ──────────────
alter table public.chat_history
  add column if not exists user_id text,
  add column if not exists team_id uuid;

create index if not exists chat_history_user_idx on public.chat_history (user_id);
create index if not exists chat_history_team_idx on public.chat_history (team_id);

-- 5) Join-by-PIN function (server-side validated) ─────────────
create or replace function public.join_team_by_pin(p_pin text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_uid text := auth.uid()::text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_team_id from public.teams where pin = p_pin;
  if v_team_id is null then
    raise exception 'Invalid PIN';
  end if;

  insert into public.team_members (team_id, user_id, role, display_name)
  values (v_team_id, v_uid, 'member', coalesce(p_display_name, 'Member'))
  on conflict (team_id, user_id) do update set display_name = excluded.display_name;

  return v_team_id;
end;
$$;

revoke all on function public.join_team_by_pin(text, text) from public;
grant execute on function public.join_team_by_pin(text, text) to anon, authenticated;

-- 6) Row-Level Security ───────────────────────────────────────
alter table public.teams         enable row level security;
alter table public.team_members  enable row level security;
alter table public.team_memory   enable row level security;
alter table public.chat_history  enable row level security;

-- Idempotent: drop old policies before recreating
drop policy if exists "teams_select_if_member"       on public.teams;
drop policy if exists "teams_insert_owner"           on public.teams;
drop policy if exists "teams_update_owner"           on public.teams;
drop policy if exists "teams_delete_owner"           on public.teams;

drop policy if exists "team_members_select_self"     on public.team_members;
drop policy if exists "team_members_select_owner"    on public.team_members;
drop policy if exists "team_members_delete_self"     on public.team_members;
drop policy if exists "team_members_delete_owner"    on public.team_members;

drop policy if exists "team_memory_select_member"    on public.team_memory;
drop policy if exists "team_memory_write_owner"      on public.team_memory;

drop policy if exists "chat_history_own_select"      on public.chat_history;
drop policy if exists "chat_history_own_insert"      on public.chat_history;
drop policy if exists "chat_history_own_delete"      on public.chat_history;

-- teams
create policy "teams_select_if_member" on public.teams
  for select using (
    owner_id = auth.uid()::text
    or exists (
      select 1 from public.team_members m
      where m.team_id = teams.id and m.user_id = auth.uid()::text
    )
  );

create policy "teams_insert_owner" on public.teams
  for insert with check (owner_id = auth.uid()::text);

create policy "teams_update_owner" on public.teams
  for update using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);

create policy "teams_delete_owner" on public.teams
  for delete using (owner_id = auth.uid()::text);

-- team_members: self sees own row; owner sees all rows of their team
create policy "team_members_select_self" on public.team_members
  for select using (
    user_id = auth.uid()::text
    or exists (
      select 1 from public.teams t
      where t.id = team_members.team_id and t.owner_id = auth.uid()::text
    )
  );

-- Self can leave
create policy "team_members_delete_self" on public.team_members
  for delete using (user_id = auth.uid()::text);

-- Owner can kick
create policy "team_members_delete_owner" on public.team_members
  for delete using (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id and t.owner_id = auth.uid()::text
    )
  );

-- NOTE: no INSERT policy on team_members — all inserts must go through
-- join_team_by_pin() or teams owner-bootstrap (see create trigger below).

-- Auto-insert owner row when a team is created
create or replace function public.bootstrap_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.team_members (team_id, user_id, role, display_name)
  values (new.id, new.owner_id, 'owner', 'Owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_bootstrap_owner on public.teams;
create trigger trg_bootstrap_owner
  after insert on public.teams
  for each row execute function public.bootstrap_owner_membership();

-- team_memory: members read, owners write
create policy "team_memory_select_member" on public.team_memory
  for select using (
    exists (
      select 1 from public.team_members m
      where m.team_id = team_memory.team_id and m.user_id = auth.uid()::text
    )
  );

create policy "team_memory_write_owner" on public.team_memory
  for all using (
    exists (
      select 1 from public.teams t
      where t.id = team_memory.team_id and t.owner_id = auth.uid()::text
    )
  ) with check (
    exists (
      select 1 from public.teams t
      where t.id = team_memory.team_id and t.owner_id = auth.uid()::text
    )
  );

-- chat_history: strictly per-user. team_id is just a stamp; no team-wide reads.
create policy "chat_history_own_select" on public.chat_history
  for select using (user_id = auth.uid()::text);

create policy "chat_history_own_insert" on public.chat_history
  for insert with check (user_id = auth.uid()::text);

create policy "chat_history_own_delete" on public.chat_history
  for delete using (user_id = auth.uid()::text);

-- Done.
