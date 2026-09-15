-- Web Push notifications. Devices subscribe from the profile (push_subscriptions), each member picks the categories
-- (notification_preferences), triggers queue a row per recipient (push_outbox), and the push-send Edge Function,
-- called through pg_net once those rows are committed, encrypts and delivers them.

-- ── Devices ──
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 80 and 100),
  auth text not null check (char_length(auth) between 16 and 32),
  lang text not null default 'it' check (lang in ('it', 'en', 'es')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;
create policy "push_subscriptions: own devices" on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "push_subscriptions: remove own devices" on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- A device's endpoint belongs to whoever is signed in on it now: saving takes it over from a previous account,
-- so notifications meant for someone else never reach this device.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_lang text)
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
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, lang)
  values (v_uid, p_endpoint, p_p256dh, p_auth, p_lang)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang, updated_at = now();
end;
$$;
revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- ── Categories (a missing row means everything on) ──
create table public.notification_preferences (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  destinations boolean not null default true,
  roulette boolean not null default true,
  dates boolean not null default true,
  members boolean not null default true,
  comments boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from anon, authenticated;
grant select, insert on public.notification_preferences to authenticated;
grant update (destinations, roulette, dates, members, comments, updated_at) on public.notification_preferences to authenticated;
create policy "notification_preferences: own" on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notification_preferences: create own" on public.notification_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "notification_preferences: change own" on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── Outbox: server-side only ──
create table public.push_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete cascade,
  kind text not null check (kind in ('destination', 'roulette', 'dates_open', 'dates_fixed', 'member', 'comment')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
create index push_outbox_pending_idx on public.push_outbox (id) where claimed_at is null;

alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from anon, authenticated;

-- One row per recipient who is still in the trip, has a device subscribed and hasn't turned the category off.
-- Whoever caused the event isn't notified about it.
create or replace function public.enqueue_push(p_trip_id uuid, p_kind text, p_category text, p_data jsonb, p_recipients uuid[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  insert into public.push_outbox (user_id, trip_id, kind, data)
  select distinct r.id, p_trip_id, p_kind, p_data
  from unnest(p_recipients) as r (id)
  where r.id is not null
    and r.id is distinct from (select auth.uid())
    and exists (select 1 from public.trip_members m where m.trip_id = p_trip_id and m.user_id = r.id)
    and exists (select 1 from public.push_subscriptions s where s.user_id = r.id)
    and coalesce(
      (select (to_jsonb(p) ->> p_category)::boolean from public.notification_preferences p where p.user_id = r.id),
      true
    );
end;
$$;

create or replace function public.push_on_destination()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_members uuid[] := array(select m.user_id from public.trip_members m where m.trip_id = new.trip_id);
begin
  if tg_op = 'INSERT' and new.status = 'proposed' then
    perform public.enqueue_push(new.trip_id, 'destination', 'destinations',
      jsonb_build_object(
        'actor', (select p.display_name from public.profiles p where p.id = new.created_by),
        'destination', new.name,
        'destination_id', new.id
      ),
      v_members);
  elsif tg_op = 'UPDATE' and new.status = 'selected' and old.status = 'proposed' then
    perform public.enqueue_push(new.trip_id, 'roulette', 'roulette',
      jsonb_build_object('destination', new.name, 'destination_id', new.id),
      v_members);
  end if;
  return null;
end;
$$;
create trigger destinations_push after insert or update of status on public.destinations
  for each row execute function public.push_on_destination();

create or replace function public.push_on_trip_dates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_members uuid[] := array(select m.user_id from public.trip_members m where m.trip_id = new.id);
begin
  if new.start_date is not null and new.start_date is distinct from old.start_date then
    perform public.enqueue_push(new.id, 'dates_fixed', 'dates',
      jsonb_build_object('start', new.start_date, 'end', new.end_date), v_members);
  elsif new.date_window_start is not null and old.date_window_start is null then
    perform public.enqueue_push(new.id, 'dates_open', 'dates',
      jsonb_build_object('actor', (select p.display_name from public.profiles p where p.id = (select auth.uid()))),
      v_members);
  end if;
  return null;
end;
$$;
create trigger trips_push_dates after update of start_date, date_window_start on public.trips
  for each row execute function public.push_on_trip_dates();

create or replace function public.push_on_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enqueue_push(new.trip_id, 'member', 'members',
    jsonb_build_object('actor', (select p.display_name from public.profiles p where p.id = new.user_id)),
    array(select m.user_id from public.trip_members m where m.trip_id = new.trip_id and m.user_id <> new.user_id));
  return null;
end;
$$;
create trigger trip_members_push after insert on public.trip_members
  for each row execute function public.push_on_member();

-- Comments reach whoever proposed the destination and whoever commented on it before.
create or replace function public.push_on_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_destination public.destinations;
begin
  select * into v_destination from public.destinations d where d.id = new.destination_id;
  perform public.enqueue_push(v_destination.trip_id, 'comment', 'comments',
    jsonb_build_object(
      'actor', (select p.display_name from public.profiles p where p.id = new.user_id),
      'destination', v_destination.name,
      'destination_id', v_destination.id,
      'excerpt', left(new.content, 140)
    ),
    array(
      select v_destination.created_by
      union
      select c.user_id from public.comments c where c.destination_id = new.destination_id and c.id <> new.id
    ));
  return null;
end;
$$;
create trigger comments_push after insert on public.comments
  for each row execute function public.push_on_comment();

-- ── Delivery ──
do $$
begin
  -- Hosted database only: the local test harness has no pg_net.
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
  end if;
end;
$$;

-- pg_net sends the request after the transaction commits, so the function finds the new rows.
create or replace function public.push_dispatch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'net') then
    perform net.http_post(
      url := 'https://tvcumfzhnuljngdzuuue.supabase.co/functions/v1/push-send',
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  end if;
  return null;
end;
$$;
create trigger push_outbox_dispatch after insert on public.push_outbox
  for each statement execute function public.push_dispatch();

-- For the Edge Function: takes pending rows (concurrent calls get different ones) with the devices to send them to.
create or replace function public.claim_push_batch(p_limit int default 200)
returns table (outbox_id bigint, kind text, data jsonb, trip_id uuid, trip_name text, endpoint text, p256dh text, auth text, lang text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  delete from public.push_outbox o where o.claimed_at < now() - interval '1 day';
  return query
    with claimed as (
      update public.push_outbox o set claimed_at = now()
      where o.id in (
        select p.id from public.push_outbox p where p.claimed_at is null order by p.id limit p_limit for update skip locked
      )
      returning o.id, o.user_id, o.trip_id, o.kind, o.data
    )
    select c.id, c.kind, c.data, c.trip_id, t.name, s.endpoint, s.p256dh, s.auth, s.lang
    from claimed c
    join public.push_subscriptions s on s.user_id = c.user_id
    left join public.trips t on t.id = c.trip_id
    order by c.id;
end;
$$;

-- The VAPID key pair lives in Vault. The Edge Function creates it on first use, so the private key never leaves
-- the server.
create or replace function public.push_vapid_keys()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return (select s.decrypted_secret::jsonb from vault.decrypted_secrets s where s.name = 'push_vapid_keys' limit 1);
end;
$$;

create or replace function public.push_store_vapid_keys(p_keys jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(4242001);
  if not exists (select 1 from vault.secrets s where s.name = 'push_vapid_keys') then
    perform vault.create_secret(p_keys::text, 'push_vapid_keys', 'Web Push VAPID key pair, created by the push-send function');
  end if;
  return (select s.decrypted_secret::jsonb from vault.decrypted_secrets s where s.name = 'push_vapid_keys' limit 1);
end;
$$;

revoke execute on function
  public.enqueue_push(uuid, text, text, jsonb, uuid[]),
  public.push_on_destination(),
  public.push_on_trip_dates(),
  public.push_on_member(),
  public.push_on_comment(),
  public.push_dispatch(),
  public.claim_push_batch(int),
  public.push_vapid_keys(),
  public.push_store_vapid_keys(jsonb)
from public, anon, authenticated;
grant execute on function public.claim_push_batch(int), public.push_vapid_keys(), public.push_store_vapid_keys(jsonb)
  to service_role;
