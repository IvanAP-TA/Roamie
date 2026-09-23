-- ── Guests may create trips; inviting others needs a Google account ──
-- Trying Roamie shouldn't wait for an account: a guest can create a trip (or the sample one) and play with it.
-- Nobody can join a guest's trip, though: guests who never come back are deleted after 60 days with their trips,
-- and that must not take a whole group's work with it. Linking Google keeps the same user, so the trip stays.

drop policy "trips: members with an account create their own" on public.trips;
create policy "trips: members create their own" on public.trips for insert to authenticated
  with check (owner_id = (select auth.uid()));

create or replace function public.join_trip(p_code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_trip_id uuid;
  v_owner_is_guest boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select t.id, coalesce(u.is_anonymous, false) into v_trip_id, v_owner_is_guest
    from public.trips t
    left join auth.users u on u.id = t.owner_id
   where t.invite_code = upper(btrim(p_code));

  if v_trip_id is null then
    raise exception 'invalid_invite_code' using errcode = 'P0002';
  end if;
  if v_owner_is_guest and not exists (select 1 from public.trip_members m where m.trip_id = v_trip_id and m.user_id = v_uid) then
    raise exception 'owner_is_guest' using errcode = 'P0001';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, v_uid, 'editor')
  on conflict (trip_id, user_id) do nothing; -- existing members keep their role

  return v_trip_id;
end;
$$;
