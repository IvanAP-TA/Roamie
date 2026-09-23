-- ── "Cosa è successo": what happened in a trip, for members coming back after a while ──
-- Written only by triggers on the tables members already change; members read their trips' events.
-- Repeated small actions by the same person (comments on one place, points, itinerary edits, dates) fold into one
-- event with a count, so the feed reads "Sara added 4 comments on Lisbon", not four lines.
-- While votes are secret nothing about points is recorded: the feed would tell who has voted.

create table public.trip_events (
  id bigint generated always as identity primary key,
  trip_id uuid not null references public.trips (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('joined', 'proposed', 'chosen', 'visited', 'commented', 'reason', 'voted', 'revealed', 'itinerary', 'availability', 'dates_set')),
  destination_id uuid references public.destinations (id) on delete set null,
  -- { name: destination name at the time, text: a reason, count: folded actions }
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index trip_events_trip_created on public.trip_events (trip_id, created_at desc);
create index trip_events_actor on public.trip_events (actor_id);
create index trip_events_destination on public.trip_events (destination_id);

alter table public.trip_events enable row level security;
revoke all on public.trip_events from public, anon, authenticated;
grant select on public.trip_events to authenticated;
create policy "trip_events: members read" on public.trip_events for select to authenticated
  using (public.is_trip_member(trip_id));

alter publication supabase_realtime add table public.trip_events;

-- Records an event, or folds it into the same person's event of the same kind (and place) from the last `p_fold`.
create or replace function public.log_trip_event(
  p_trip_id uuid, p_actor uuid, p_kind text, p_destination_id uuid default null, p_data jsonb default '{}',
  p_fold interval default null, p_delay interval default interval '0 seconds'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if p_fold is not null then
    select e.id into v_id
      from public.trip_events e
     where e.trip_id = p_trip_id
       and e.kind = p_kind
       and e.actor_id is not distinct from p_actor
       and e.destination_id is not distinct from p_destination_id
       and e.created_at > now() - p_fold
     order by e.created_at desc
     limit 1;
    if v_id is not null then
      update public.trip_events
         set created_at = now(),
             data = data || p_data || jsonb_build_object('count', coalesce((data ->> 'count')::int, 1) + 1)
       where id = v_id;
      return;
    end if;
  end if;
  insert into public.trip_events (trip_id, actor_id, kind, destination_id, data, created_at)
  values (p_trip_id, p_actor, p_kind, p_destination_id, p_data, now() + p_delay);
end;
$$;
revoke execute on function public.log_trip_event(uuid, uuid, text, uuid, jsonb, interval, interval) from public, anon, authenticated;

create or replace function public.events_on_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The owner joining their own new trip isn't news.
  if not exists (select 1 from public.trips t where t.id = new.trip_id and t.owner_id = new.user_id) then
    perform public.log_trip_event(new.trip_id, new.user_id, 'joined');
  end if;
  return null;
end;
$$;
create trigger trip_members_events after insert on public.trip_members
  for each row execute function public.events_on_member();

create or replace function public.events_on_destination()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_trip_event(new.trip_id, new.created_by, 'proposed', new.id, jsonb_build_object('name', new.name));
  elsif new.status is distinct from old.status and new.status = 'selected' then
    -- Shown once the wheel has stopped (like its notification), so the feed doesn't spoil a live spin.
    perform public.log_trip_event(new.trip_id, (select auth.uid()), 'chosen', new.id, jsonb_build_object('name', new.name),
      null, interval '12 seconds');
  elsif new.status is distinct from old.status and new.status = 'visited' then
    perform public.log_trip_event(new.trip_id, (select auth.uid()), 'visited', new.id, jsonb_build_object('name', new.name));
  end if;
  return null;
end;
$$;
create trigger destinations_events after insert or update of status on public.destinations
  for each row execute function public.events_on_destination();

create or replace function public.events_on_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_destination record;
begin
  select d.trip_id, d.name into v_destination from public.destinations d where d.id = new.destination_id;
  perform public.log_trip_event(v_destination.trip_id, new.user_id, 'commented', new.destination_id,
    jsonb_build_object('name', v_destination.name), interval '2 hours');
  return null;
end;
$$;
create trigger comments_events after insert on public.comments
  for each row execute function public.events_on_comment();

create or replace function public.events_on_reason()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_destination record;
begin
  select d.trip_id, d.name into v_destination from public.destinations d where d.id = new.destination_id;
  perform public.log_trip_event(v_destination.trip_id, new.user_id, 'reason', new.destination_id,
    jsonb_build_object('name', v_destination.name, 'text', new.text));
  return null;
end;
$$;
create trigger destination_reasons_events after insert on public.destination_reasons
  for each row execute function public.events_on_reason();

create or replace function public.events_on_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip uuid;
begin
  select d.trip_id into v_trip from public.destinations d where d.id = new.destination_id;
  if v_trip is not null and not public.votes_hidden(v_trip) then
    perform public.log_trip_event(v_trip, new.user_id, 'voted', null, '{}', interval '3 hours');
  end if;
  return null;
end;
$$;
create trigger votes_events after insert or update of points on public.votes
  for each row execute function public.events_on_vote();

create or replace function public.events_on_trip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.votes_revealed_at is not null and old.votes_revealed_at is null then
    -- With the wheel's result: the reveal is part of the spin.
    perform public.log_trip_event(new.id, (select auth.uid()), 'revealed', null, '{}', null, interval '12 seconds');
  end if;
  if new.start_date is not null and new.start_date is distinct from old.start_date then
    perform public.log_trip_event(new.id, (select auth.uid()), 'dates_set', null,
      jsonb_build_object('start', new.start_date, 'end', new.end_date));
  end if;
  return null;
end;
$$;
create trigger trips_events after update of votes_revealed_at, start_date on public.trips
  for each row execute function public.events_on_trip();

create or replace function public.events_on_itinerary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip uuid;
begin
  if tg_table_name = 'itinerary_days' then
    v_trip := coalesce(new.trip_id, old.trip_id);
  else
    select d.trip_id into v_trip from public.itinerary_days d where d.id = coalesce(new.itinerary_day_id, old.itinerary_day_id);
  end if;
  -- A deleted trip (cascade) has nothing left to tell.
  if v_trip is not null and exists (select 1 from public.trips t where t.id = v_trip) then
    perform public.log_trip_event(v_trip, (select auth.uid()), 'itinerary', null, '{}', interval '3 hours');
  end if;
  return null;
end;
$$;
create trigger itinerary_days_events after insert or delete on public.itinerary_days
  for each row execute function public.events_on_itinerary();
create trigger itinerary_items_events after insert on public.itinerary_items
  for each row execute function public.events_on_itinerary();

create or replace function public.events_on_availability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.log_trip_event(new.trip_id, new.user_id, 'availability', null, '{}', interval '6 hours');
  return null;
end;
$$;
create trigger availability_events after insert on public.availability
  for each row execute function public.events_on_availability();

revoke execute on function public.events_on_member() from public, anon, authenticated;
revoke execute on function public.events_on_destination() from public, anon, authenticated;
revoke execute on function public.events_on_comment() from public, anon, authenticated;
revoke execute on function public.events_on_reason() from public, anon, authenticated;
revoke execute on function public.events_on_vote() from public, anon, authenticated;
revoke execute on function public.events_on_trip() from public, anon, authenticated;
revoke execute on function public.events_on_itinerary() from public, anon, authenticated;
revoke execute on function public.events_on_availability() from public, anon, authenticated;

-- Four months of history is plenty to catch up on.
create or replace function public.prune_trip_events()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.trip_events where created_at < now() - interval '120 days';
$$;
revoke execute on function public.prune_trip_events() from public, anon, authenticated;

do $$
begin
  -- Hosted database only: the local test harness has no pg_cron.
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
    execute $cron$select cron.schedule('prune-trip-events', '55 4 * * *', 'select public.prune_trip_events()')$cron$;
  end if;
end;
$$;
