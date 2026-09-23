-- ── A guest owns at most one trip: the sample one ──
-- Guests exist to try Roamie and to join friends' trips. Their own trips (the sample, created from the app) are
-- capped at one, so accounts made in bulk can't fill the database with trips; a Google account lifts the cap.

create or replace function public.can_create_trip()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not public.is_guest()
      or not exists (select 1 from public.trips t where t.owner_id = (select auth.uid()))
$$;
revoke execute on function public.can_create_trip() from public, anon;
grant execute on function public.can_create_trip() to authenticated;

drop policy "trips: members create their own" on public.trips;
create policy "trips: members create their own" on public.trips for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.can_create_trip());
