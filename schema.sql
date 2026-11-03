-- THE BALLOT BOARD 2026
-- Run this script once in a dedicated Supabase project's SQL Editor.
-- All public tables have RLS. Only room members can read room data.
-- Publishable browser key only. NEVER expose a service_role/secret key.
begin;

create table if not exists public.midterm_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{10}$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.midterm_members (
  room_id uuid not null references public.midterm_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 30),
  joined_at timestamptz not null default now(),
  primary key(room_id,user_id)
);

create table if not exists public.midterm_picks (
  room_id uuid not null,
  user_id uuid not null,
  race_id text not null check (char_length(race_id) between 3 and 32),
  party text not null check (party in ('D','R','O')),
  updated_at timestamptz not null default now(),
  primary key(room_id,user_id,race_id),
  foreign key(room_id,user_id) references public.midterm_members(room_id,user_id) on delete cascade
);

create table if not exists public.midterm_results (
  room_id uuid not null references public.midterm_rooms(id) on delete cascade,
  race_id text not null check (char_length(race_id) between 3 and 32),
  party text not null check (party in ('D','R','O')),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key(room_id,race_id)
);

create table if not exists public.midterm_totals (
  room_id uuid not null references public.midterm_rooms(id) on delete cascade,
  chamber text not null check(chamber in ('house','senate')),
  dem integer not null default 0 check(dem between 0 and 435),
  rep integer not null default 0 check(rep between 0 and 435),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key(room_id,chamber),
  check(dem + rep <= case when chamber='house' then 435 else 100 end)
);

create index if not exists midterm_members_user_id_idx on public.midterm_members(user_id);
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Member check is deliberately in an UNEXPOSED schema. This avoids recursive
-- members-table policies, while still requiring an authenticated user ID.
create or replace function private.midterm_is_member(p_room uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.midterm_members m
    where m.room_id = p_room and m.user_id = (select auth.uid())
  );
$$;
revoke all on function private.midterm_is_member(uuid) from public, anon;
grant execute on function private.midterm_is_member(uuid) to authenticated;

alter table public.midterm_rooms enable row level security;
alter table public.midterm_members enable row level security;
alter table public.midterm_picks enable row level security;
alter table public.midterm_results enable row level security;
alter table public.midterm_totals enable row level security;

drop policy if exists midterm_rooms_read on public.midterm_rooms;
create policy midterm_rooms_read on public.midterm_rooms for select to authenticated
using (owner_id = (select auth.uid()) or private.midterm_is_member(id));
drop policy if exists midterm_rooms_insert on public.midterm_rooms;
create policy midterm_rooms_insert on public.midterm_rooms for insert to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists midterm_members_read on public.midterm_members;
create policy midterm_members_read on public.midterm_members for select to authenticated
using (private.midterm_is_member(room_id));
drop policy if exists midterm_members_owner_insert on public.midterm_members;
create policy midterm_members_owner_insert on public.midterm_members for insert to authenticated
with check (
  user_id = (select auth.uid()) and
  exists(select 1 from public.midterm_rooms r
         where r.id=room_id and r.owner_id=(select auth.uid()))
);

drop policy if exists midterm_picks_read on public.midterm_picks;
create policy midterm_picks_read on public.midterm_picks for select to authenticated
using (private.midterm_is_member(room_id));
drop policy if exists midterm_picks_add on public.midterm_picks;
create policy midterm_picks_add on public.midterm_picks for insert to authenticated
with check (user_id=(select auth.uid()) and private.midterm_is_member(room_id));
drop policy if exists midterm_picks_edit on public.midterm_picks;
create policy midterm_picks_edit on public.midterm_picks for update to authenticated
using (user_id=(select auth.uid()) and private.midterm_is_member(room_id))
with check (user_id=(select auth.uid()) and private.midterm_is_member(room_id));
drop policy if exists midterm_picks_delete on public.midterm_picks;
create policy midterm_picks_delete on public.midterm_picks for delete to authenticated
using (user_id=(select auth.uid()) and private.midterm_is_member(room_id));

drop policy if exists midterm_results_read on public.midterm_results;
create policy midterm_results_read on public.midterm_results for select to authenticated
using (private.midterm_is_member(room_id));
drop policy if exists midterm_results_add on public.midterm_results;
create policy midterm_results_add on public.midterm_results for insert to authenticated
with check (updated_by=(select auth.uid()) and private.midterm_is_member(room_id));
drop policy if exists midterm_results_edit on public.midterm_results;
create policy midterm_results_edit on public.midterm_results for update to authenticated
using (private.midterm_is_member(room_id))
with check (updated_by=(select auth.uid()) and private.midterm_is_member(room_id));
drop policy if exists midterm_results_delete on public.midterm_results;
create policy midterm_results_delete on public.midterm_results for delete to authenticated
using (private.midterm_is_member(room_id));

drop policy if exists midterm_totals_read on public.midterm_totals;
create policy midterm_totals_read on public.midterm_totals for select to authenticated
using (private.midterm_is_member(room_id));
drop policy if exists midterm_totals_add on public.midterm_totals;
create policy midterm_totals_add on public.midterm_totals for insert to authenticated
with check (updated_by=(select auth.uid()) and private.midterm_is_member(room_id));
drop policy if exists midterm_totals_edit on public.midterm_totals;
create policy midterm_totals_edit on public.midterm_totals for update to authenticated
using (private.midterm_is_member(room_id))
with check (updated_by=(select auth.uid()) and private.midterm_is_member(room_id));

-- Invite-only joining. The code lookup intentionally bypasses room RLS,
-- but requires a signed-in user, limits seats to two, and returns only room ID.
create or replace function public.join_midterm_room(p_code text,p_name text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_room uuid;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Please sign in first';
  end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 30 then
    raise exception 'Display name must be 1 to 30 characters';
  end if;
  select id into v_room
    from public.midterm_rooms
    where code = upper(trim(p_code))
    for update;
  if v_room is null then
    raise exception 'Invalid invitation code';
  end if;
  if (select count(*) from public.midterm_members where room_id=v_room) >= 2
    and not exists(
      select 1 from public.midterm_members where room_id=v_room and user_id=v_user
    ) then
    raise exception 'This board already has two players';
  end if;
  insert into public.midterm_members (room_id,user_id,display_name)
    values (v_room,v_user,trim(p_name))
    on conflict (room_id,user_id)
    do update set display_name = excluded.display_name;
  return v_room;
end;
$$;
revoke all on function public.join_midterm_room(text,text) from public, anon;
grant execute on function public.join_midterm_room(text,text) to authenticated;

revoke all on public.midterm_rooms, public.midterm_members, public.midterm_picks,
  public.midterm_results, public.midterm_totals from anon;
grant select, insert on public.midterm_rooms to authenticated;
grant select, insert on public.midterm_members to authenticated;
grant select, insert, update, delete on public.midterm_picks to authenticated;
grant select, insert, update, delete on public.midterm_results to authenticated;
grant select, insert, update on public.midterm_totals to authenticated;

-- Enable Postgres change notifications for the four shared collections.
do $$
declare tbl text;
begin
  foreach tbl in array array['midterm_members','midterm_picks','midterm_results','midterm_totals']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I',tbl);
    end if;
  end loop;
end $$;
commit;

-- Verification query (run after committing):
-- select tablename, rowsecurity from pg_tables
-- where schemaname='public' and tablename like 'midterm_%';
