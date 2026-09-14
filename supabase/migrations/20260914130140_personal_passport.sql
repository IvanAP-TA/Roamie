-- ════════════════════════════════════════════════════════════════════════════
-- Roamie · 12 · Personal passport: private visited places, hiding group visits
-- ════════════════════════════════════════════════════════════════════════════

-- Places a user visited outside Roamie's trips. Private: only their author ever sees them.
create table public.visited_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  country text check (char_length(country) <= 80),
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  visited_on date check (visited_on >= date '1900-01-01'),
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  constraint visited_places_coordinates check ((lat is null) = (lng is null))
);

create index visited_places_user_id_idx on public.visited_places (user_id);

alter table public.visited_places enable row level security;
revoke all on public.visited_places from anon;
revoke update on public.visited_places from authenticated;
grant update (name, country, country_code, lat, lng, visited_on, rating) on public.visited_places to authenticated;

create policy "visited_places: own rows" on public.visited_places for select to authenticated
  using (user_id = (select auth.uid()));
create policy "visited_places: add own" on public.visited_places for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "visited_places: edit own" on public.visited_places for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "visited_places: remove own" on public.visited_places for delete to authenticated
  using (user_id = (select auth.uid()));

-- A destination the group marked as visited, hidden from one member's passport ("I wasn't there").
-- It changes nothing for the group or the other members.
create table public.passport_exclusions (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  destination_id uuid not null references public.destinations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, destination_id)
);

create index passport_exclusions_destination_id_idx on public.passport_exclusions (destination_id);

alter table public.passport_exclusions enable row level security;
revoke all on public.passport_exclusions from anon;
revoke update on public.passport_exclusions from authenticated;

create policy "passport_exclusions: own rows" on public.passport_exclusions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "passport_exclusions: members hide trip visits" on public.passport_exclusions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_trip_member(public.destination_trip_id(destination_id))
  );
create policy "passport_exclusions: remove own" on public.passport_exclusions for delete to authenticated
  using (user_id = (select auth.uid()));
