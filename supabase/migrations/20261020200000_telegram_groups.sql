-- Roamie in the group chat (supabase/functions/telegram-bot): a Telegram group linked to a trip hears what happens
-- in it (a place proposed, someone joining, the wheel's pick, the dates fixed) with the link to vote. A group is
-- linked by adding the bot with the trip's invite code (t.me/<bot>?startgroup=<code>) or with /collega <code>;
-- anyone in the group can unlink it with /scollega. Service role only: the app never reads these tables.

create table public.telegram_chats (
  chat_id bigint primary key,
  trip_id uuid not null references public.trips (id) on delete cascade,
  lang text not null default 'it' check (lang in ('it', 'en', 'es')),
  linked_at timestamptz not null default now()
);
create index telegram_chats_trip on public.telegram_chats (trip_id);
alter table public.telegram_chats enable row level security;
revoke all on public.telegram_chats from anon, authenticated;

create table public.telegram_outbox (
  id bigint generated always as identity primary key,
  chat_id bigint not null,
  trip_id uuid not null,
  kind text not null check (kind in ('destination', 'roulette', 'member', 'dates_fixed')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
alter table public.telegram_outbox enable row level security;
revoke all on public.telegram_outbox from anon, authenticated;

-- One row per group linked to the trip; nothing at all for the many trips without one.
create or replace function public.enqueue_telegram(p_trip_id uuid, p_kind text, p_data jsonb)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.telegram_outbox (chat_id, trip_id, kind, data)
  select c.chat_id, p_trip_id, p_kind, p_data from public.telegram_chats c where c.trip_id = p_trip_id;
$$;
revoke all on function public.enqueue_telegram(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.telegram_on_destination()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.telegram_chats c where c.trip_id = new.trip_id) then
    return null;
  end if;
  if tg_op = 'INSERT' and new.status = 'proposed' then
    perform public.enqueue_telegram(new.trip_id, 'destination', jsonb_build_object(
      'actor', (select p.display_name from public.profiles p where p.id = new.created_by),
      'destination', new.name));
  elsif tg_op = 'UPDATE' and new.status = 'selected' and old.status = 'proposed' then
    perform public.enqueue_telegram(new.trip_id, 'roulette', jsonb_build_object('destination', new.name));
  end if;
  return null;
end;
$$;
create trigger destinations_telegram after insert or update of status on public.destinations
  for each row execute function public.telegram_on_destination();

create or replace function public.telegram_on_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.telegram_chats c where c.trip_id = new.trip_id)
     and new.user_id <> (select t.owner_id from public.trips t where t.id = new.trip_id) then
    perform public.enqueue_telegram(new.trip_id, 'member', jsonb_build_object(
      'actor', (select p.display_name from public.profiles p where p.id = new.user_id)));
  end if;
  return null;
end;
$$;
create trigger trip_members_telegram after insert on public.trip_members
  for each row execute function public.telegram_on_member();

create or replace function public.telegram_on_trip_dates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.start_date is not null and new.start_date is distinct from old.start_date then
    perform public.enqueue_telegram(new.id, 'dates_fixed', jsonb_build_object('start', new.start_date, 'end', new.end_date));
  end if;
  return null;
end;
$$;
create trigger trips_telegram_dates after update of start_date on public.trips
  for each row execute function public.telegram_on_trip_dates();

-- Delivery, like push_outbox: pg_net calls the bot's function after the transaction commits, and it drains the queue.
create or replace function public.telegram_dispatch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'net') then
    perform net.http_post(
      url := 'https://tvcumfzhnuljngdzuuue.supabase.co/functions/v1/telegram-bot',
      body := '{"drain": true}'::jsonb,
      timeout_milliseconds := 10000
    );
  end if;
  return null;
end;
$$;
create trigger telegram_outbox_dispatch after insert on public.telegram_outbox
  for each statement execute function public.telegram_dispatch();

-- For the Edge Function: takes the pending messages (concurrent calls get different ones) with what they need.
create or replace function public.claim_telegram_batch(p_limit int default 100)
returns table (id bigint, chat_id bigint, kind text, data jsonb, trip_name text, invite_code text, lang text)
language sql
volatile
security definer
set search_path = ''
as $$
  with claimed as (
    update public.telegram_outbox o set claimed_at = now()
    where o.id in (
      select o2.id from public.telegram_outbox o2
      where o2.claimed_at is null
      order by o2.id
      limit p_limit
      for update skip locked
    )
    returning o.id, o.chat_id, o.trip_id, o.kind, o.data
  )
  select c.id, c.chat_id, c.kind, c.data, t.name, t.invite_code, coalesce(tc.lang, 'it')
  from claimed c
  join public.trips t on t.id = c.trip_id
  left join public.telegram_chats tc on tc.chat_id = c.chat_id
  order by c.id;
$$;
revoke all on function public.claim_telegram_batch(int) from public, anon, authenticated;
grant execute on function public.claim_telegram_batch(int) to service_role;

-- Sent messages are kept a week, for checking; then they go.
create or replace function public.prune_telegram_outbox()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.telegram_outbox where created_at < now() - interval '7 days';
$$;
revoke all on function public.prune_telegram_outbox() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    execute $cron$select cron.schedule('telegram-outbox-prune', '15 3 * * *', 'select public.prune_telegram_outbox()')$cron$;
  end if;
end;
$$;
