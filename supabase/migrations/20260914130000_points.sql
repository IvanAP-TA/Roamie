-- ════════════════════════════════════════════════════════════════════════════
-- Roamie · 07 · Point voting
-- Every member has 10 points per trip to spread across its proposed destinations; the roulette is
-- weighted by points. Replaces up/down votes: an up vote becomes 1 point, down votes are dropped.
-- ════════════════════════════════════════════════════════════════════════════

delete from public.votes where vote_type = 'down';
alter table public.votes add column points smallint not null default 1;
alter table public.votes drop column vote_type;
alter table public.votes alter column points drop default;
alter table public.votes add constraint votes_points_range check (points between 1 and 10);

revoke update on public.votes from authenticated;
grant update (points) on public.votes to authenticated;

-- ─── Budget ─────────────────────────────────────────────────────────────────
-- ≤ 10 points per member across a trip's proposed destinations, and points only go to proposed ones.
-- Selected/visited destinations don't count, so a spin gives their points back.
create or replace function public.check_points_budget()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip_id uuid;
  v_status text;
  v_used int;
begin
  select d.trip_id, d.status into v_trip_id, v_status
    from public.destinations d
   where d.id = new.destination_id;

  if v_status is distinct from 'proposed' then
    raise exception 'destination_not_proposed' using errcode = '22023';
  end if;

  -- Serialise one member's allocations within a trip, so concurrent requests can't overspend.
  perform pg_advisory_xact_lock(hashtextextended(v_trip_id::text || new.user_id::text, 0));

  -- Everything else this member gave in the trip. Excluded by destination rather than row id: with
  -- insert … on conflict, BEFORE INSERT runs on the proposed row, whose id isn't the existing one's.
  select coalesce(sum(v.points), 0) into v_used
    from public.votes v
    join public.destinations d on d.id = v.destination_id
   where d.trip_id = v_trip_id
     and d.status = 'proposed'
     and v.user_id = new.user_id
     and v.destination_id <> new.destination_id;

  if v_used + new.points > 10 then
    raise exception 'points_budget_exceeded' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger on_vote_points
  before insert or update of points on public.votes
  for each row execute function public.check_points_budget();

-- ─── RPCs ───────────────────────────────────────────────────────────────────
drop function public.cast_vote(uuid, text);

-- Set the caller's points for a destination (0 removes them). Runs as the caller, so RLS and the
-- budget trigger apply. Returns the points the caller has left in that trip.
create or replace function public.set_points(p_destination_id uuid, p_points int)
returns int
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_trip_id uuid;
  v_left int;
begin
  if p_points is null or p_points < 0 or p_points > 10 then
    raise exception 'invalid_points' using errcode = '22023';
  end if;

  if p_points = 0 then
    delete from public.votes where destination_id = p_destination_id and user_id = v_uid;
  else
    insert into public.votes (destination_id, user_id, points)
    values (p_destination_id, v_uid, p_points)
    on conflict (destination_id, user_id) do update set points = excluded.points;
  end if;

  select d.trip_id into v_trip_id from public.destinations d where d.id = p_destination_id;
  select 10 - coalesce(sum(v.points), 0) into v_left
    from public.votes v
    join public.destinations d on d.id = v.destination_id
   where d.trip_id = v_trip_id
     and d.status = 'proposed'
     and v.user_id = v_uid;
  return v_left;
end;
$$;

-- Same weighted draw as before, with points as the weight.
create or replace function public.spin_roulette(p_trip_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_winner uuid;
begin
  if not public.can_edit_trip(p_trip_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Serialise concurrent spins on the same trip.
  perform 1 from public.trips t where t.id = p_trip_id for update;

  with scores as (
    select d.id, sum(v.points) as score
      from public.destinations d
      join public.votes v on v.destination_id = d.id
     where d.trip_id = p_trip_id
       and d.status = 'proposed'
     group by d.id
    having sum(v.points) > 0
  ),
  cumulative as (
    select id,
           sum(score) over (order by id) as upper_bound,
           sum(score) over () as total
      from scores
  ),
  draw as (
    select random() * (select max(total) from cumulative) as ticket
  )
  select c.id into v_winner
    from cumulative c, draw
   where c.upper_bound > draw.ticket
   order by c.upper_bound
   limit 1;

  if v_winner is null then
    raise exception 'no_eligible_destinations' using errcode = 'P0002';
  end if;

  update public.destinations set status = 'selected' where id = v_winner;
  return v_winner;
end;
$$;

revoke execute on function public.check_points_budget() from public, anon, authenticated;
revoke execute on function public.set_points(uuid, int) from public, anon;
grant execute on function public.set_points(uuid, int) to authenticated;
