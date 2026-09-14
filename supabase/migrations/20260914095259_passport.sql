-- ════════════════════════════════════════════════════════════════════════════
-- Roamie · 10 · Passport: visit dates, country codes and final ratings
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Destinations ───────────────────────────────────────────────────────────
alter table public.destinations
  add column visited_at timestamptz,
  add column country_code text check (country_code ~ '^[A-Z]{2}$');

grant update (country_code) on public.destinations to authenticated;

update public.destinations set visited_at = coalesce(selected_at, created_at) where status = 'visited';

-- selected_at and visited_at follow status changes.
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

  if new.status = 'visited' and (tg_op = 'INSERT' or old.status is distinct from 'visited') then
    new.visited_at := now();
  elsif new.status <> 'visited' then
    new.visited_at := null;
  end if;
  return new;
end;
$$;

-- ─── Ratings ────────────────────────────────────────────────────────────────
create or replace function public.destination_is_visited(_destination_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.destinations d where d.id = _destination_id and d.status = 'visited');
$$;

create table public.destination_reviews (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (destination_id, user_id)
);

create index destination_reviews_user_id_idx on public.destination_reviews (user_id);

alter table public.destination_reviews enable row level security;
revoke all on public.destination_reviews from anon;
revoke update on public.destination_reviews from authenticated;
grant update (rating) on public.destination_reviews to authenticated;

create policy "destination_reviews: members can read"
  on public.destination_reviews for select to authenticated
  using (public.is_trip_member(public.destination_trip_id(destination_id)));

create policy "destination_reviews: members rate visited destinations"
  on public.destination_reviews for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_trip_member(public.destination_trip_id(destination_id))
    and public.destination_is_visited(destination_id)
  );

create policy "destination_reviews: change own rating"
  on public.destination_reviews for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.destination_is_visited(destination_id));

create policy "destination_reviews: remove own rating"
  on public.destination_reviews for delete to authenticated
  using (user_id = (select auth.uid()));

-- Set the caller's rating (1..5) for a visited destination; 0 removes it. Runs as the caller (RLS applies).
create or replace function public.set_rating(p_destination_id uuid, p_rating int)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if p_rating is null or p_rating < 0 or p_rating > 5 then
    raise exception 'invalid_rating' using errcode = '22023';
  end if;

  if p_rating = 0 then
    delete from public.destination_reviews where destination_id = p_destination_id and user_id = v_uid;
  else
    insert into public.destination_reviews (destination_id, user_id, rating)
    values (p_destination_id, v_uid, p_rating)
    on conflict (destination_id, user_id) do update set rating = excluded.rating;
  end if;
end;
$$;

revoke execute on function public.destination_is_visited(uuid) from public, anon;
revoke execute on function public.set_rating(uuid, int) from public, anon;
grant execute on function public.set_rating(uuid, int) to authenticated;

alter publication supabase_realtime add table public.destination_reviews;
