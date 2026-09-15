-- Scheduled spins: owners and editors pick a day and time, and a pg_cron job spins the wheel then, even with nobody
-- online. The result reaches members like any other spin (realtime, and the "roulette" push notification).

alter table public.trips add column roulette_spin_at timestamptz;
create index trips_roulette_spin_at_idx on public.trips (roulette_spin_at) where roulette_spin_at is not null;

-- The weighted draw on its own, without the permission check: shared by manual and scheduled spins.
create or replace function public.draw_roulette(p_trip_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_winner uuid;
begin
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

-- A spin by hand replaces a scheduled one.
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
  v_winner := public.draw_roulette(p_trip_id);
  update public.trips set roulette_spin_at = null where id = p_trip_id and roulette_spin_at is not null;
  return v_winner;
end;
$$;

-- No time (null) cancels. At least a minute ahead (the job runs every minute) and at most a year.
create or replace function public.schedule_roulette(p_trip_id uuid, p_at timestamptz default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.can_edit_trip(p_trip_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_at is not null and (p_at < now() + interval '1 minute' or p_at > now() + interval '1 year') then
    raise exception 'invalid_spin_time' using errcode = '22023';
  end if;
  update public.trips set roulette_spin_at = p_at where id = p_trip_id;
end;
$$;

-- Run by pg_cron every minute. A schedule is used up either way: with no destination holding points there is simply
-- nothing to draw.
create or replace function public.run_scheduled_spins()
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_trip uuid;
  v_spun int := 0;
begin
  for v_trip in
    select t.id from public.trips t where t.roulette_spin_at <= now() for update skip locked
  loop
    update public.trips set roulette_spin_at = null where id = v_trip;
    begin
      perform public.draw_roulette(v_trip);
      v_spun := v_spun + 1;
    exception when sqlstate 'P0002' then
      null;
    end;
  end loop;
  return v_spun;
end;
$$;

revoke execute on function public.draw_roulette(uuid), public.run_scheduled_spins() from public, anon, authenticated;
revoke execute on function public.schedule_roulette(uuid, timestamptz) from public, anon;
grant execute on function public.schedule_roulette(uuid, timestamptz) to authenticated;

do $$
begin
  -- Hosted database only: the local test harness has no pg_cron.
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    execute $cron$select cron.schedule('roulette-scheduled-spins', '* * * * *', 'select public.run_scheduled_spins()')$cron$;
  end if;
end;
$$;
