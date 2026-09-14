-- ════════════════════════════════════════════════════════════════════════════
-- Roamie · 13 · Choosing the dates together: a window, everyone's availability, the final dates
-- ════════════════════════════════════════════════════════════════════════════

-- The period the group is considering, how long the trip lasts, and the dates once they're fixed.
alter table public.trips
  add column date_window_start date,
  add column date_window_end date,
  add column trip_length smallint check (trip_length between 1 and 60),
  add column start_date date,
  add column end_date date,
  add constraint trips_date_window check (
    date_window_start is null or date_window_end is null
    or (date_window_end >= date_window_start and date_window_end - date_window_start <= 366)
  ),
  add constraint trips_fixed_dates check ((start_date is null) = (end_date is null) and (end_date is null or end_date >= start_date));

-- The existing "owners and editors can update details" policy applies to these columns too.
grant update (date_window_start, date_window_end, trip_length, start_date, end_date) on public.trips to authenticated;

-- One row per member per day they can travel: 'yes' or 'maybe'. No row means "not available".
create table public.availability (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day date not null,
  status text not null check (status in ('yes', 'maybe')),
  updated_at timestamptz not null default now(),
  primary key (trip_id, user_id, day)
);

create index availability_user_id_idx on public.availability (user_id);

alter table public.availability enable row level security;
revoke all on public.availability from anon;
revoke update on public.availability from authenticated;
grant update (status, updated_at) on public.availability to authenticated;

create policy "availability: members can read" on public.availability for select to authenticated
  using (public.is_trip_member(trip_id));
create policy "availability: members mark their own days" on public.availability for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_trip_member(trip_id));
create policy "availability: change own days" on public.availability for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_trip_member(trip_id));
create policy "availability: clear own days" on public.availability for delete to authenticated
  using (user_id = (select auth.uid()));

-- Sets the caller's status for several days at once; no status (null) clears them. Runs as the caller (RLS applies).
create or replace function public.set_availability(p_trip_id uuid, p_days date[], p_status text default null)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if p_status is not null and p_status not in ('yes', 'maybe') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  if coalesce(array_length(p_days, 1), 0) > 400 then
    raise exception 'too_many_days' using errcode = '22023';
  end if;

  if p_status is null then
    delete from public.availability
     where trip_id = p_trip_id and user_id = (select auth.uid()) and day = any (p_days);
  else
    insert into public.availability (trip_id, user_id, day, status)
    select p_trip_id, (select auth.uid()), d, p_status from unnest(p_days) as d
    on conflict (trip_id, user_id, day) do update set status = excluded.status, updated_at = now();
  end if;
end;
$$;

revoke execute on function public.set_availability(uuid, date[], text) from public, anon;
grant execute on function public.set_availability(uuid, date[], text) to authenticated;

alter publication supabase_realtime add table public.availability;
