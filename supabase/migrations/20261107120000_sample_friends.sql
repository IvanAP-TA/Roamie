-- Friends for the sample trip: someone who tries Roamie alone (a guest, a tester) can't see the part that matters most, a
-- group voting. The sample trip now comes with two demo friends who have already voted, and a button that brings in a
-- third one, who votes a few seconds later. They are real rows (so every screen and the wheel treat them like anyone), in
-- accounts that can't sign in, named "· demo"; the numbers that count real groups leave sample trips and them out.

alter table public.trips add column is_sample boolean not null default false;

-- Set when the app makes the sample trip (insert grants on trips are by column).
grant insert (is_sample) on public.trips to authenticated;

-- Guests only ever have the sample trip (one trip, see can_create_trip).
update public.trips t set is_sample = true
 where exists (select 1 from auth.users u where u.id = t.owner_id and coalesce(u.is_anonymous, false));

-- The demo friends: accounts with no password and an address that can't exist, so nobody can sign in as them.
insert into auth.users (id, email, raw_user_meta_data) values
  ('d0000000-0000-4000-8000-000000000001', 'marco@demo.roamie.invalid', '{"full_name": "Marco · demo"}'),
  ('d0000000-0000-4000-8000-000000000002', 'sara@demo.roamie.invalid', '{"full_name": "Sara · demo"}'),
  ('d0000000-0000-4000-8000-000000000003', 'luca@demo.roamie.invalid', '{"full_name": "Luca · demo"}');

-- Marco and Sara, with the points they gave (by country, as the sample's places are Lisbon, Valencia, Budapest, Kraków).
create or replace function public.add_demo_friends(p_trip_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_trip_owner(p_trip_id) or not exists (select 1 from public.trips t where t.id = p_trip_id and t.is_sample) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.trip_members (trip_id, user_id, role) values
    (p_trip_id, 'd0000000-0000-4000-8000-000000000001', 'editor'),
    (p_trip_id, 'd0000000-0000-4000-8000-000000000002', 'editor')
  on conflict (trip_id, user_id) do nothing;
  insert into public.votes (destination_id, user_id, points)
  select d.id, x.person, x.points
    from public.destinations d
    join (values
      ('HU', 'd0000000-0000-4000-8000-000000000002'::uuid, 6),
      ('ES', 'd0000000-0000-4000-8000-000000000002'::uuid, 2),
      ('PT', 'd0000000-0000-4000-8000-000000000001'::uuid, 5),
      ('HU', 'd0000000-0000-4000-8000-000000000001'::uuid, 3)
    ) as x (country_code, person, points) on x.country_code = d.country_code
   where d.trip_id = p_trip_id and d.status = 'proposed'
  on conflict (destination_id, user_id) do nothing;
end;
$$;

-- The third friend comes in when the button is tapped, and votes in a second call a few seconds later.
create or replace function public.demo_friend_joins(p_trip_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_trip_owner(p_trip_id) or not exists (select 1 from public.trips t where t.id = p_trip_id and t.is_sample) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.trip_members (trip_id, user_id, role) values (p_trip_id, 'd0000000-0000-4000-8000-000000000003', 'editor')
  on conflict (trip_id, user_id) do nothing;
end;
$$;

create or replace function public.demo_friend_votes(p_trip_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_trip_owner(p_trip_id) or not exists (select 1 from public.trips t where t.id = p_trip_id and t.is_sample) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.votes (destination_id, user_id, points)
  select d.id, 'd0000000-0000-4000-8000-000000000003'::uuid, x.points
    from public.destinations d
    join (values ('ES', 6), ('PL', 3)) as x (country_code, points) on x.country_code = d.country_code
   where d.trip_id = p_trip_id and d.status = 'proposed'
     and exists (select 1 from public.trip_members m where m.trip_id = p_trip_id and m.user_id = 'd0000000-0000-4000-8000-000000000003')
  on conflict (destination_id, user_id) do nothing;
end;
$$;

revoke execute on function public.add_demo_friends(uuid), public.demo_friend_joins(uuid), public.demo_friend_votes(uuid) from public, anon;
grant execute on function public.add_demo_friends(uuid), public.demo_friend_joins(uuid), public.demo_friend_votes(uuid) to authenticated;

-- The weekly numbers count real groups: sample trips and the demo friends are left out.
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
    where not coalesce(u.is_anonymous, false) and not t.is_sample
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
      'google_users', (select count(*) from auth.users where created_at > now() - interval '7 days' and not coalesce(is_anonymous, false) and email not like '%@demo.roamie.invalid'),
      'guests', (select count(*) from auth.users where created_at > now() - interval '7 days' and coalesce(is_anonymous, false)),
      'trips', (select count(*) from real_trips where created_at > now() - interval '7 days'),
      'joins', (select count(*) from public.trip_members m join public.trips t on t.id = m.trip_id
                where m.joined_at > now() - interval '7 days' and m.user_id <> t.owner_id and not t.is_sample),
      'proposals', (select count(*) from public.destinations d join public.trips t on t.id = d.trip_id
                    where d.created_at > now() - interval '7 days' and not t.is_sample),
      'votes', (select count(*) from public.votes v join public.destinations d on d.id = v.destination_id join public.trips t on t.id = d.trip_id
                where v.created_at > now() - interval '7 days' and not t.is_sample),
      'spins', (select count(*) from public.roulette_spins s join public.trips t on t.id = s.trip_id
                where s.created_at > now() - interval '7 days' and not t.is_sample)
    ),
    'cohort', jsonb_build_object(
      'trips', (select count(*) from cohort),
      'two_members', (select count(*) from cohort where members >= 2),
      'three_members', (select count(*) from cohort where members >= 3),
      'two_voters', (select count(*) from cohort where voters >= 2),
      'decided', (select count(*) from cohort where decided),
      'north_star', (select count(*) from cohort where members >= 3 and decided)
    ),
    'total', jsonb_build_object(
      'users', (select count(*) from auth.users where email is null or email not like '%@demo.roamie.invalid'),
      'trips', (select count(*) from real_trips)
    )
  );
$$;

-- "The places of the moment" leave sample trips out (they would all be Lisbon, Valencia, Budapest and Kraków).
create or replace function public.refresh_trending_places()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.trending_places where true;
  insert into public.trending_places (rank, name, country, country_code, image_url, image_attribution, trips, chosen)
  select row_number() over (order by c.chosen desc, c.trips desc, c.name),
         c.name, c.country, c.country_code, c.image_url, c.image_attribution, c.trips, c.chosen
    from (
      select d.country_code,
             count(distinct d.trip_id)::int as trips,
             count(distinct t.owner_id) as owners,
             (count(distinct d.trip_id) filter (where d.status in ('selected', 'visited')))::int as chosen,
             mode() within group (order by btrim(d.name)) as name,
             mode() within group (order by d.country) as country,
             (array_agg(d.image_url order by d.created_at desc) filter (where d.image_url like 'https://%'))[1] as image_url,
             (array_agg(d.image_attribution order by d.created_at desc) filter (where d.image_url like 'https://%'))[1] as image_attribution
        from public.destinations d
        join public.trips t on t.id = d.trip_id
       where d.country_code is not null
         and d.lat is not null
         and d.lng is not null
         and d.created_at > now() - interval '90 days'
         and not t.is_sample
         and (select count(*) from public.trip_members m where m.trip_id = d.trip_id) >= 2
       -- The same place, whatever language it was written in: same country, coordinates within about 10 km.
       group by d.country_code, round(d.lat::numeric, 1), round(d.lng::numeric, 1)
    ) c
   where c.trips >= 3 and c.owners >= 3
   order by 1
   limit 24;
end;
$$;
