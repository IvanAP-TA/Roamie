-- ── Limits against abuse, before the app goes public ──

-- Push: only the browsers' own push services (Chrome, Edge and Samsung through FCM, Firefox, Safari, Windows), so
-- the delivery function never sends requests to a server of someone's choosing.
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_service check (
  endpoint ~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'
);

-- At most tg_argv[1] rows sharing the id in column tg_argv[0]. Counted past RLS, so rows the author can't see count too.
create or replace function public.enforce_row_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_column text := tg_argv[0];
  v_limit int := tg_argv[1]::int;
  v_key uuid := (to_jsonb(new) ->> v_column)::uuid;
  v_count int;
begin
  if v_key is null then
    return new;
  end if;
  execute format('select count(*) from %I.%I where %I = $1', tg_table_schema, tg_table_name, v_column) into v_count using v_key;
  if v_count >= v_limit then
    raise exception 'limit_reached' using errcode = 'P0001', detail = format('%s per %s on %s', v_limit, v_column, tg_table_name);
  end if;
  return new;
end;
$$;

create trigger trips_limit before insert on public.trips
  for each row execute function public.enforce_row_limit('owner_id', '50');
create trigger trip_members_per_trip_limit before insert on public.trip_members
  for each row execute function public.enforce_row_limit('trip_id', '50');
create trigger trip_members_per_user_limit before insert on public.trip_members
  for each row execute function public.enforce_row_limit('user_id', '200');
create trigger destinations_limit before insert on public.destinations
  for each row execute function public.enforce_row_limit('trip_id', '150');
create trigger itinerary_days_limit before insert on public.itinerary_days
  for each row execute function public.enforce_row_limit('trip_id', '90');
create trigger itinerary_items_limit before insert on public.itinerary_items
  for each row execute function public.enforce_row_limit('itinerary_day_id', '60');
create trigger trip_links_limit before insert on public.trip_links
  for each row execute function public.enforce_row_limit('trip_id', '100');
create trigger checklist_items_limit before insert on public.checklist_items
  for each row execute function public.enforce_row_limit('trip_id', '300');
create trigger visited_places_limit before insert on public.visited_places
  for each row execute function public.enforce_row_limit('user_id', '2000');

-- Up to 10 devices per person; saving a device already known (again, or from another account) is always fine.
create or replace function public.push_subscriptions_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.push_subscriptions s where s.endpoint = new.endpoint)
     and (select count(*) from public.push_subscriptions s where s.user_id = new.user_id) >= 10 then
    raise exception 'limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger push_subscriptions_limit before insert on public.push_subscriptions
  for each row execute function public.push_subscriptions_limit();

-- 30 comments in 10 minutes per person: plenty for a conversation, and it stops notification floods.
create or replace function public.comments_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.comments c
    where c.user_id = new.user_id and c.created_at > now() - interval '10 minutes'
  ) >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger comments_rate_limit before insert on public.comments
  for each row execute function public.comments_rate_limit();

revoke execute on function public.enforce_row_limit(), public.push_subscriptions_limit(), public.comments_rate_limit()
  from public, anon, authenticated;

-- The API never needs these; row-level security doesn't apply to TRUNCATE, so don't leave it granted.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke truncate, trigger, references on tables from anon, authenticated;
