-- The weekly numbers (video/automation/report.mjs, on Telegram every Monday): the funnel that decides what to build
-- next. Counts only, nothing about who: the function is for the service role alone, read by the funnel-report Edge
-- Function. Real trips are the ones a Google account made (guests only get the sample trip).

create or replace function public.funnel_report()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with real_trips as (
    select t.id, t.created_at
    from public.trips t
    join auth.users u on u.id = t.owner_id
    where not coalesce(u.is_anonymous, false)
  ),
  members as (
    select m.trip_id, count(*) as n from public.trip_members m group by m.trip_id
  ),
  voters as (
    select d.trip_id, count(distinct v.user_id) as n
    from public.votes v join public.destinations d on d.id = v.destination_id
    group by d.trip_id
  ),
  decided as (
    select distinct trip_id from public.roulette_spins
    union
    select distinct trip_id from public.destinations where status in ('selected', 'visited')
  ),
  -- The cohort: real trips made in the last 28 days, at least a day old (a trip needs a moment to fill up).
  cohort as (
    select rt.id,
      coalesce(m.n, 0) as members,
      coalesce(v.n, 0) as voters,
      exists (select 1 from decided d where d.trip_id = rt.id) as decided
    from real_trips rt
    left join members m on m.trip_id = rt.id
    left join voters v on v.trip_id = rt.id
    where rt.created_at > now() - interval '28 days' and rt.created_at < now() - interval '1 day'
  )
  select jsonb_build_object(
    'week', jsonb_build_object(
      'google_users', (select count(*) from auth.users where created_at > now() - interval '7 days' and not coalesce(is_anonymous, false)),
      'guests', (select count(*) from auth.users where created_at > now() - interval '7 days' and coalesce(is_anonymous, false)),
      'trips', (select count(*) from real_trips where created_at > now() - interval '7 days'),
      'joins', (select count(*) from public.trip_members m join public.trips t on t.id = m.trip_id
                where m.joined_at > now() - interval '7 days' and m.user_id <> t.owner_id),
      'proposals', (select count(*) from public.destinations where created_at > now() - interval '7 days'),
      'votes', (select count(*) from public.votes where created_at > now() - interval '7 days'),
      'spins', (select count(*) from public.roulette_spins where created_at > now() - interval '7 days')
    ),
    'cohort', jsonb_build_object(
      'trips', (select count(*) from cohort),
      'two_members', (select count(*) from cohort where members >= 2),
      'three_members', (select count(*) from cohort where members >= 3),
      'two_voters', (select count(*) from cohort where voters >= 2),
      'decided', (select count(*) from cohort where decided),
      -- The north star: three or more people and a destination picked.
      'north_star', (select count(*) from cohort where members >= 3 and decided)
    ),
    'total', jsonb_build_object(
      'users', (select count(*) from auth.users),
      'trips', (select count(*) from real_trips)
    )
  );
$$;

revoke all on function public.funnel_report() from public, anon, authenticated;
grant execute on function public.funnel_report() to service_role;

-- Every Monday at 07:30 UTC, pg_cron starts the "Weekly report" workflow (like the social bots' daily starts).
create or replace function public.dispatch_weekly_report()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text := (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'github_actions_token' limit 1);
begin
  if token is null or not exists (select 1 from pg_catalog.pg_namespace where nspname = 'net') then
    return;
  end if;
  perform net.http_post(
    url := 'https://api.github.com/repos/IvanAP-TA/Roamie/actions/workflows/report.yml/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'roamie-supabase-cron',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('ref', 'main'),
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function public.dispatch_weekly_report() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    execute $cron$select cron.schedule('weekly-report', '30 7 * * 1', 'select public.dispatch_weekly_report()')$cron$;
  end if;
end;
$$;
