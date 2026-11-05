-- Vetoes: a member can take one proposed place off the wheel, so nobody ends up somewhere they really dislike. The wheel
-- stays random among the rest. Each member has `vetoes_per_year` of them (the owner sets it, default 1) in a trip, counted
-- over the last 12 months. A veto is anonymous: the place shows how many vetoes it has, never whose.
alter table public.trips add column vetoes_per_year smallint not null default 1 check (vetoes_per_year between 0 and 5);
alter table public.destinations add column vetoes smallint not null default 0;

create table public.destination_vetoes (
  destination_id uuid not null references public.destinations (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- A veto taken back is kept, marked: nothing is deleted, and it counts as unused again.
  withdrawn_at timestamptz,
  primary key (destination_id, user_id)
);
create index destination_vetoes_user_idx on public.destination_vetoes (user_id, created_at);

-- Only your own: the others' stay secret. Written only through cast_veto / remove_veto.
alter table public.destination_vetoes enable row level security;
revoke all on public.destination_vetoes from anon, authenticated;
grant select on public.destination_vetoes to authenticated;
create policy "destination_vetoes: own" on public.destination_vetoes for select to authenticated
  using (user_id = (select auth.uid()));

-- destinations.vetoes: how many, kept in step with the table, so everyone sees it without reading the rows.
create or replace function public.sync_destination_vetoes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_destination uuid := coalesce(new.destination_id, old.destination_id);
begin
  update public.destinations d
     set vetoes = (select count(*) from public.destination_vetoes v where v.destination_id = v_destination and v.withdrawn_at is null)
   where d.id = v_destination;
  return null;
end;
$$;
create trigger destination_vetoes_sync after insert or delete on public.destination_vetoes
  for each row execute function public.sync_destination_vetoes();
create trigger destination_vetoes_sync_withdrawn after update of withdrawn_at on public.destination_vetoes
  for each row execute function public.sync_destination_vetoes();

-- A veto: the place goes off the wheel for everyone.
create or replace function public.cast_veto(p_destination_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_trip uuid := public.destination_trip_id(p_destination_id);
  v_limit smallint;
  v_status text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if v_trip is null or not public.is_trip_member(v_trip) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- One veto at a time per trip, so two at once can't leave fewer than two places.
  select t.vetoes_per_year into v_limit from public.trips t where t.id = v_trip for update;
  select d.status into v_status from public.destinations d where d.id = p_destination_id;
  if v_status <> 'proposed' then
    raise exception 'destination_not_proposed';
  end if;
  if exists (select 1 from public.destination_vetoes v where v.destination_id = p_destination_id and v.user_id = v_uid and v.withdrawn_at is null) then
    return;
  end if;
  -- Points on it say you want it: take them off first.
  if exists (select 1 from public.votes v where v.destination_id = p_destination_id and v.user_id = v_uid) then
    raise exception 'veto_has_points';
  end if;
  if (select count(*)
        from public.destination_vetoes v
        join public.destinations d on d.id = v.destination_id
       where v.user_id = v_uid and d.trip_id = v_trip and v.withdrawn_at is null and v.created_at > now() - interval '1 year') >= v_limit then
    raise exception 'no_vetoes_left';
  end if;
  -- The wheel needs something to choose from.
  if (select count(*) from public.destinations d where d.trip_id = v_trip and d.status = 'proposed' and d.vetoes = 0 and d.id <> p_destination_id) < 2 then
    raise exception 'veto_too_few';
  end if;
  insert into public.destination_vetoes (destination_id, user_id) values (p_destination_id, v_uid)
  on conflict (destination_id, user_id) do update set created_at = now(), withdrawn_at = null;
end;
$$;

-- Taking your veto back, while the place is still in the running: it counts as unused again.
create or replace function public.remove_veto(p_destination_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if (select d.status from public.destinations d where d.id = p_destination_id) is distinct from 'proposed' then
    raise exception 'destination_not_proposed';
  end if;
  update public.destination_vetoes set withdrawn_at = now() where destination_id = p_destination_id and user_id = v_uid and withdrawn_at is null;
end;
$$;

-- The owner decides how many vetoes each member has per year.
create or replace function public.set_vetoes_per_year(p_trip_id uuid, p_count int)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_count is null or p_count < 0 or p_count > 5 then
    raise exception 'invalid_points' using errcode = '22023';
  end if;
  update public.trips set vetoes_per_year = p_count where id = p_trip_id;
end;
$$;

revoke execute on function public.sync_destination_vetoes() from public, anon, authenticated;
revoke execute on function public.cast_veto(uuid), public.remove_veto(uuid), public.set_vetoes_per_year(uuid, int) from public, anon;
grant execute on function public.cast_veto(uuid), public.remove_veto(uuid), public.set_vetoes_per_year(uuid, int) to authenticated;

-- The weighted draw (see 20260915163925): a place with a veto is not on the wheel.
create or replace function public.draw_roulette(p_trip_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_entries jsonb;
  v_total numeric;
  v_ticket numeric;
  v_winner uuid;
  v_landing double precision;
  v_revealed boolean := false;
begin
  -- Serialise concurrent spins on the same trip.
  perform 1 from public.trips t where t.id = p_trip_id for update;

  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'points', s.score) order by s.score desc, s.name, s.id), '[]'::jsonb),
         coalesce(sum(s.score), 0)
    into v_entries, v_total
    from (
      select d.id, d.name, sum(v.points)::int as score
        from public.destinations d
        join public.votes v on v.destination_id = d.id
       where d.trip_id = p_trip_id and d.status = 'proposed' and d.vetoes = 0
       group by d.id, d.name
      having sum(v.points) > 0
    ) s;

  if v_total = 0 then
    raise exception 'no_eligible_destinations' using errcode = 'P0002';
  end if;

  v_ticket := random()::numeric * v_total;
  select (w.e ->> 'id')::uuid,
         least(greatest(((v_ticket - (w.upper_bound - (w.e ->> 'points')::numeric)) / (w.e ->> 'points')::numeric)::double precision, 0), 0.999999)
    into v_winner, v_landing
    from (
      select x.e, sum((x.e ->> 'points')::numeric) over (order by x.ord) as upper_bound
        from jsonb_array_elements(v_entries) with ordinality as x (e, ord)
    ) w
   where w.upper_bound > v_ticket
   order by w.upper_bound
   limit 1;

  if public.votes_hidden(p_trip_id) then
    update public.trips set votes_revealed_at = now() where id = p_trip_id;
    v_revealed := true;
  end if;

  update public.destinations set status = 'selected' where id = v_winner;
  insert into public.roulette_spins (trip_id, winner_id, entries, landing, revealed_votes, spun_by)
  values (p_trip_id, v_winner, v_entries, v_landing, v_revealed, (select auth.uid()));
  return v_winner;
end;
$$;
