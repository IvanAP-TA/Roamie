-- Secret voting and the live wheel.
--
-- Secret voting: while a round is on, members read only their own points (RLS, so realtime too). The votes come out
-- when every member has used all their points, when an owner or editor reveals them, or when the wheel spins.
-- Live wheel: every spin is recorded with the wheel as drawn and where it landed, so everyone with the trip open can
-- watch the same spin at the same time, even if their device couldn't see the votes a moment before.

-- ── Secret voting ──
alter table public.trips
  add column secret_voting boolean not null default false,
  add column votes_revealed_at timestamptz;

create or replace function public.votes_hidden(_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select t.secret_voting and t.votes_revealed_at is null from public.trips t where t.id = _trip_id), false)
$$;

drop policy "votes: members can read" on public.votes;
create policy "votes: members can read"
  on public.votes for select to authenticated
  using (
    public.is_trip_member(public.destination_trip_id(destination_id))
    and (user_id = (select auth.uid()) or not public.votes_hidden(public.destination_trip_id(destination_id)))
  );

-- On: a new secret round (points already given stay, now hidden). Off: votes visible again, without a reveal.
create or replace function public.set_secret_voting(p_trip_id uuid, p_secret boolean)
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
  update public.trips set secret_voting = p_secret, votes_revealed_at = null where id = p_trip_id;
end;
$$;

create or replace function public.reveal_votes(p_trip_id uuid)
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
  update public.trips set votes_revealed_at = now() where id = p_trip_id and secret_voting and votes_revealed_at is null;
end;
$$;

-- Points each member has given to a trip's proposed destinations.
create or replace function public.points_used(_trip_id uuid, _user_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(v.points), 0)::int
    from public.votes v
    join public.destinations d on d.id = v.destination_id
   where d.trip_id = _trip_id and d.status = 'proposed' and v.user_id = _user_id
$$;

-- The secret round ends by itself when nobody has points left to give.
create or replace function public.reveal_when_everyone_voted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip uuid := public.destination_trip_id(new.destination_id);
begin
  if v_trip is null or not public.votes_hidden(v_trip) then
    return null;
  end if;
  if not exists (select 1 from public.trip_members m where m.trip_id = v_trip and public.points_used(v_trip, m.user_id) < 10) then
    update public.trips set votes_revealed_at = now() where id = v_trip and votes_revealed_at is null;
  end if;
  return null;
end;
$$;
create trigger votes_reveal_when_everyone_voted after insert or update of points on public.votes
  for each row execute function public.reveal_when_everyone_voted();

-- How the secret round is going, without saying who gave what.
create or replace function public.vote_progress(p_trip_id uuid)
returns table (voted int, done int, members int)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_trip_member(p_trip_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select (count(*) filter (where s.used > 0))::int, (count(*) filter (where s.used >= 10))::int, count(*)::int
      from (select public.points_used(p_trip_id, m.user_id) as used from public.trip_members m where m.trip_id = p_trip_id) s;
end;
$$;

-- The public page shows no points while they are secret.
create or replace function public.get_public_trip(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', t.public_slug,
    'name', t.name,
    'description', t.description,
    'cover_image_url', t.cover_image_url,
    'cover_image_attribution', t.cover_image_attribution,
    'destinations', coalesce((
      select jsonb_agg(to_jsonb(d) - 'status_rank' - 'created_at' order by d.status_rank, d.points desc nulls last, d.created_at)
        from (
          select x.id, x.name, x.country, x.country_code, x.lat, x.lng, x.image_url, x.image_attribution,
                 x.mood, x.budget_level, x.status, x.created_at,
                 case when public.votes_hidden(t.id) then null
                      else coalesce((select sum(v.points)::int from public.votes v where v.destination_id = x.id), 0) end as points,
                 case x.status when 'selected' then 0 when 'proposed' then 1 else 2 end as status_rank
            from public.destinations x
           where x.trip_id = t.id
        ) d
    ), '[]'::jsonb),
    'days', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'day_number', dd.day_number,
                 'date', dd.date,
                 'title', dd.title,
                 'items', coalesce((
                   select jsonb_agg(
                            jsonb_build_object('time', i.time, 'title', i.title, 'description', i.description,
                                               'place_name', i.place_name, 'lat', i.lat, 'lng', i.lng)
                            order by i.order_index, i.id)
                     from public.itinerary_items i
                    where i.itinerary_day_id = dd.id
                 ), '[]'::jsonb))
               order by dd.day_number)
        from public.itinerary_days dd
       where dd.trip_id = t.id
    ), '[]'::jsonb)
  )
    from public.trips t
   where t.public_slug = lower(btrim(p_slug));
$$;

-- ── Live wheel ──
create table public.roulette_spins (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  winner_id uuid references public.destinations (id) on delete set null,
  -- The wheel as drawn, in slice order: [{ id, name, points }]
  entries jsonb not null,
  -- Where the pointer stops inside the winner's slice, 0..1
  landing double precision not null check (landing >= 0 and landing < 1),
  -- This spin ended a secret round: the reveal comes first
  revealed_votes boolean not null default false,
  -- Null when the wheel spun by itself at the scheduled time
  spun_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index roulette_spins_trip_id_idx on public.roulette_spins (trip_id, created_at desc);
create index roulette_spins_winner_id_idx on public.roulette_spins (winner_id);
create index roulette_spins_spun_by_idx on public.roulette_spins (spun_by);

alter table public.roulette_spins enable row level security;
revoke all on public.roulette_spins from anon, authenticated;
grant select on public.roulette_spins to authenticated;
create policy "roulette_spins: members can read" on public.roulette_spins for select to authenticated
  using (public.is_trip_member(trip_id));

alter publication supabase_realtime add table public.roulette_spins;

-- The weighted draw, now recording the wheel it drew (and ending a secret round).
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
       where d.trip_id = p_trip_id and d.status = 'proposed'
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

-- ── The roulette notification waits for the live wheel to stop ──
alter table public.push_outbox add column send_after timestamptz not null default now();

drop function public.enqueue_push(uuid, text, text, jsonb, uuid[]);
create or replace function public.enqueue_push(
  p_trip_id uuid, p_kind text, p_category text, p_data jsonb, p_recipients uuid[], p_delay interval default interval '0 seconds'
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  insert into public.push_outbox (user_id, trip_id, kind, data, send_after)
  select distinct r.id, p_trip_id, p_kind, p_data, now() + p_delay
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
    -- After the countdown and the spin, so the notification doesn't spoil the wheel for anyone watching it.
    perform public.enqueue_push(new.trip_id, 'roulette', 'roulette',
      jsonb_build_object('destination', new.name, 'destination_id', new.id),
      v_members, interval '12 seconds');
  end if;
  return null;
end;
$$;

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
        select p.id from public.push_outbox p
         where p.claimed_at is null and p.send_after <= now()
         order by p.id limit p_limit for update skip locked
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

-- Seconds until the next queued notification is due (negative: overdue), null when nothing waits.
create or replace function public.push_next_due()
returns double precision
language sql
stable
security definer
set search_path = ''
as $$
  select extract(epoch from (min(o.send_after) - now()))::double precision from public.push_outbox o where o.claimed_at is null
$$;

revoke execute on function
  public.votes_hidden(uuid),
  public.set_secret_voting(uuid, boolean),
  public.reveal_votes(uuid),
  public.points_used(uuid, uuid),
  public.vote_progress(uuid)
from public, anon;
revoke execute on function
  public.reveal_when_everyone_voted(),
  public.draw_roulette(uuid),
  public.enqueue_push(uuid, text, text, jsonb, uuid[], interval),
  public.push_next_due()
from public, anon, authenticated;
grant execute on function public.votes_hidden(uuid), public.set_secret_voting(uuid, boolean), public.reveal_votes(uuid),
  public.vote_progress(uuid) to authenticated;
grant execute on function public.push_next_due() to service_role;

-- ── Private realtime channel per trip (presence and reactions), members only ──
do $$
begin
  -- Hosted database only: the local test harness has no realtime schema.
  if to_regclass('realtime.messages') is not null then
    execute $policy$
      create policy "trip-live: members listen" on realtime.messages for select to authenticated
        using (
          realtime.messages.extension in ('broadcast', 'presence')
          and public.is_trip_member(
            case when (select realtime.topic()) ~ '^trip-live:[0-9a-f-]{36}$' then split_part((select realtime.topic()), ':', 2)::uuid end
          )
        )
    $policy$;
    execute $policy$
      create policy "trip-live: members send" on realtime.messages for insert to authenticated
        with check (
          realtime.messages.extension in ('broadcast', 'presence')
          and public.is_trip_member(
            case when (select realtime.topic()) ~ '^trip-live:[0-9a-f-]{36}$' then split_part((select realtime.topic()), ':', 2)::uuid end
          )
        )
    $policy$;
  end if;
end;
$$;
