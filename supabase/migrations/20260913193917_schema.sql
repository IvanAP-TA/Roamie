-- ════════════════════════════════════════════════════════════════════════════
-- Roamie · 01 · Core schema
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Invite codes ───────────────────────────────────────────────────────────
-- 8 characters from an alphabet without look-alikes (no 0/O, 1/I/L).
-- Randomness comes from gen_random_uuid() (CSPRNG) instead of random().
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  -- uuid bytes 6 and 8 carry version/variant bits: skip them
  byte_idx constant int[] := array[0, 1, 2, 3, 4, 5, 10, 11];
  raw bytea;
  code text;
  i int;
begin
  loop
    raw := uuid_send(gen_random_uuid());
    code := '';
    foreach i in array byte_idx loop
      code := code || substr(alphabet, 1 + (get_byte(raw, i) % length(alphabet)), 1);
    end loop;
    exit when not exists (select 1 from public.trips t where t.invite_code = code);
  end loop;
  return code;
end;
$$;

-- ─── Tables ─────────────────────────────────────────────────────────────────
-- Synced automatically from auth.users (see trigger below).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (char_length(description) <= 500),
  cover_image_url text,
  cover_image_attribution text, -- CC attribution when the cover comes from Wikimedia Commons
  invite_code text unique not null default public.generate_invite_code(),
  created_at timestamptz not null default now()
);

create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')) default 'editor',
  joined_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  country text,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  image_url text,
  image_attribution text, -- required for Wikimedia Commons sources (CC licences)
  mood text[] not null default '{}'
    check (mood <@ array['adventure','relax','nightlife','culture','nature','food_wine','family','romantic']::text[]),
  budget_level smallint check (budget_level between 1 and 3), -- € / €€ / €€€
  expectations text check (char_length(expectations) <= 2000), -- "What to expect"
  status text not null check (status in ('proposed', 'selected', 'visited')) default 'proposed',
  selected_at timestamptz, -- set automatically when status becomes 'selected'
  -- set null (not cascade) so deleting an account keeps the group's shared list intact
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  vote_type text not null check (vote_type in ('up', 'down')),
  created_at timestamptz not null default now(),
  unique (destination_id, user_id) -- one vote per user per destination, can be changed
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day_number int not null check (day_number > 0),
  date date,
  title text check (char_length(title) <= 120)
);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  itinerary_day_id uuid not null references public.itinerary_days (id) on delete cascade,
  time text check (char_length(time) <= 20),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text check (char_length(description) <= 1000),
  order_index int not null default 0
);

-- ─── Indexes (FKs used by RLS helpers and list queries) ─────────────────────
create index trip_members_user_id_idx on public.trip_members (user_id);
create index destinations_trip_id_idx on public.destinations (trip_id);
create index destinations_created_by_idx on public.destinations (created_by);
create index votes_user_id_idx on public.votes (user_id);
create index comments_destination_id_idx on public.comments (destination_id, created_at);
create index comments_user_id_idx on public.comments (user_id);
create index itinerary_days_trip_id_idx on public.itinerary_days (trip_id, day_number);
create index itinerary_items_day_idx on public.itinerary_items (itinerary_day_id, order_index);
create index trips_owner_id_idx on public.trips (owner_id);

-- ─── Triggers ───────────────────────────────────────────────────────────────
-- New auth user → profile row (Google gives full_name/name and avatar_url/picture).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the Google avatar fresh (display_name stays user-editable).
create or replace function public.handle_user_metadata_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set avatar_url = coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', avatar_url)
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function public.handle_user_metadata_update();

-- New trip → creator becomes its owner member.
create or replace function public.handle_new_trip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (trip_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.handle_new_trip();

-- Track when a destination gets selected (drives the "next destination" highlight).
create or replace function public.handle_destination_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'selected' and (tg_op = 'INSERT' or old.status is distinct from 'selected') then
    new.selected_at := now();
  elsif new.status = 'proposed' then
    new.selected_at := null;
  end if;
  return new;
end;
$$;

create trigger on_destination_status
  before insert or update of status on public.destinations
  for each row execute function public.handle_destination_status();
