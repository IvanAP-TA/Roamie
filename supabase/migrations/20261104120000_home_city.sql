-- Where the user usually leaves from (a city, as they write it), for the "Flights" buttons: they open a flight
-- search already filled in. Not in profiles, which the other members of a trip can read: its own table, which only
-- its owner reads and writes, and it goes nowhere until they tap a button.
create table public.profile_private (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  home_city text check (char_length(btrim(home_city)) between 1 and 80),
  updated_at timestamptz not null default now()
);

alter table public.profile_private enable row level security;
revoke all on public.profile_private from anon, authenticated;
grant select, insert, delete on public.profile_private to authenticated;
-- user_id too: the app saves with an upsert, which sets every column it sends (the policies keep it to your own row).
grant update (user_id, home_city, updated_at) on public.profile_private to authenticated;

create policy "profile_private: own" on public.profile_private for select to authenticated
  using (user_id = (select auth.uid()));
create policy "profile_private: create own" on public.profile_private for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "profile_private: change own" on public.profile_private for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "profile_private: remove own" on public.profile_private for delete to authenticated
  using (user_id = (select auth.uid()));
