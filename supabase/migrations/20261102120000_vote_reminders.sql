-- Reminding the members who haven't given any points: the groups stop between proposing and choosing.
-- 1) missing_voters: who in the trip hasn't voted yet, for the "Tell who's missing" card (whether, never what: it
--    works in a secret round too, like vote_progress).
-- 2) A push notification, once per member and trip, a day after joining, while the places are still open.

create or replace function public.missing_voters(p_trip_id uuid)
returns setof uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_trip_member(p_trip_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select m.user_id from public.trip_members m
     where m.trip_id = p_trip_id and public.points_used(p_trip_id, m.user_id) = 0
     order by m.joined_at;
end;
$$;

revoke execute on function public.missing_voters(uuid) from public, anon;
grant execute on function public.missing_voters(uuid) to authenticated;

-- ── The push ──
alter table public.push_outbox drop constraint push_outbox_kind_check;
alter table public.push_outbox add constraint push_outbox_kind_check
  check (kind in ('destination', 'roulette', 'dates_open', 'dates_fixed', 'member', 'comment', 'mention', 'vote_reminder'));

-- Who has been reminded, so nobody is reminded twice for the same trip.
create table public.vote_reminders (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
alter table public.vote_reminders enable row level security;
revoke all on public.vote_reminders from anon, authenticated;

-- Members who joined 1–14 days ago and haven't given a point, in a trip with at least two places to vote on and none
-- chosen yet. Hourly; enqueue_push skips those without a device or with the "destinations" category off.
create or replace function public.queue_vote_reminders()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select m.trip_id, m.user_id,
           (select count(*) from public.destinations d where d.trip_id = m.trip_id and d.status = 'proposed') as places
      from public.trip_members m
     where m.joined_at between now() - interval '14 days' and now() - interval '1 day'
       and not exists (select 1 from public.vote_reminders v where v.trip_id = m.trip_id and v.user_id = m.user_id)
       and not exists (select 1 from public.destinations d where d.trip_id = m.trip_id and d.status <> 'proposed')
       and (select count(*) from public.destinations d where d.trip_id = m.trip_id and d.status = 'proposed') >= 2
       and public.points_used(m.trip_id, m.user_id) = 0
  loop
    insert into public.vote_reminders (trip_id, user_id) values (r.trip_id, r.user_id) on conflict do nothing;
    perform public.enqueue_push(r.trip_id, 'vote_reminder', 'destinations', jsonb_build_object('places', r.places), array[r.user_id]);
  end loop;
end;
$$;

revoke execute on function public.queue_vote_reminders() from public, anon, authenticated;

do $$
begin
  -- Hosted database only: the local test harness has no pg_cron.
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    execute $cron$select cron.schedule('vote-reminders', '7 * * * *', 'select public.queue_vote_reminders()')$cron$;
  end if;
end;
$$;
