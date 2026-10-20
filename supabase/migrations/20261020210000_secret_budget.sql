-- The secret budget: each member says privately how much they'd spend on the trip (a band, per person); the group
-- sees only the ceiling everyone is comfortable with, and only once at least three have answered, so no answer can be
-- told apart. Nobody, the owner included, can read another member's band: the table has no select policy for it.

create table public.trip_budgets (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 1: up to 300 €, 2: 300–700 €, 3: 700–1,200 €, 4: over 1,200 € (per person, the whole trip)
  band smallint not null check (band between 1 and 4),
  updated_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
alter table public.trip_budgets enable row level security;
revoke all on public.trip_budgets from anon, authenticated;

-- Answers below this many stay hidden: with two, the ceiling would give away the other person's answer.
create or replace function public.group_budget(p_trip_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_answered int;
begin
  if v_uid is null or not exists (select 1 from public.trip_members m where m.trip_id = p_trip_id and m.user_id = v_uid) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  select count(*) into v_answered from public.trip_budgets b
  where b.trip_id = p_trip_id and exists (select 1 from public.trip_members m where m.trip_id = p_trip_id and m.user_id = b.user_id);
  return jsonb_build_object(
    'members', (select count(*) from public.trip_members m where m.trip_id = p_trip_id),
    'answered', v_answered,
    'mine', (select b.band from public.trip_budgets b where b.trip_id = p_trip_id and b.user_id = v_uid),
    'ceiling', case when v_answered >= 3 then (
      select min(b.band) from public.trip_budgets b
      where b.trip_id = p_trip_id and exists (select 1 from public.trip_members m where m.trip_id = p_trip_id and m.user_id = b.user_id)
    ) end
  );
end;
$$;
revoke all on function public.group_budget(uuid) from public, anon;
grant execute on function public.group_budget(uuid) to authenticated;

-- One's own answer, changed or taken back (null).
create or replace function public.set_my_budget(p_trip_id uuid, p_band smallint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not exists (select 1 from public.trip_members m where m.trip_id = p_trip_id and m.user_id = v_uid) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  if p_band is null then
    delete from public.trip_budgets where trip_id = p_trip_id and user_id = v_uid;
  else
    insert into public.trip_budgets (trip_id, user_id, band) values (p_trip_id, v_uid, p_band)
    on conflict (trip_id, user_id) do update set band = excluded.band, updated_at = now();
  end if;
end;
$$;
revoke all on function public.set_my_budget(uuid, smallint) from public, anon;
grant execute on function public.set_my_budget(uuid, smallint) to authenticated;
