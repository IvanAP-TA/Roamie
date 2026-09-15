-- ── "Perché andarci": members' reasons for a destination, with likes ──
-- Anyone in the trip can write up to 3 reasons per destination and like the others'. During a secret vote a like
-- hints at a vote, so each member sees only their own until the reveal.

create table public.destination_reasons (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 120),
  created_at timestamptz not null default now()
);
create index destination_reasons_destination_idx on public.destination_reasons (destination_id, created_at);
create index destination_reasons_user_idx on public.destination_reasons (user_id);

-- A surrogate key: realtime DELETE payloads carry only the primary key, which then says nothing about who liked what.
create table public.reason_likes (
  id uuid primary key default gen_random_uuid(),
  reason_id uuid not null references public.destination_reasons (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (reason_id, user_id)
);
create index reason_likes_user_idx on public.reason_likes (user_id);

create or replace function public.reason_trip_id(_reason_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select d.trip_id
  from public.destination_reasons r
  join public.destinations d on d.id = r.destination_id
  where r.id = _reason_id
$$;

create or replace function public.destination_reasons_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.destination_reasons r
    where r.destination_id = new.destination_id and r.user_id = new.user_id
  ) >= 3 then
    raise exception 'reasons_limit' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger destination_reasons_limit before insert on public.destination_reasons
  for each row execute function public.destination_reasons_limit();

alter table public.destination_reasons enable row level security;
alter table public.reason_likes enable row level security;
revoke all on public.destination_reasons, public.reason_likes from anon, authenticated;
grant select, insert, delete on public.destination_reasons to authenticated;
grant update (text) on public.destination_reasons to authenticated;
grant select, insert, delete on public.reason_likes to authenticated;

create policy "destination_reasons: members read" on public.destination_reasons for select to authenticated
  using (public.is_trip_member(public.destination_trip_id(destination_id)));
create policy "destination_reasons: members write as themselves" on public.destination_reasons for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_trip_member(public.destination_trip_id(destination_id)));
create policy "destination_reasons: edit own" on public.destination_reasons for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "destination_reasons: delete own, owners moderate" on public.destination_reasons for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_trip_owner(public.destination_trip_id(destination_id)));

create policy "reason_likes: members read, only their own during a secret vote" on public.reason_likes for select to authenticated
  using (
    public.is_trip_member(public.reason_trip_id(reason_id))
    and (user_id = (select auth.uid()) or not public.votes_hidden(public.reason_trip_id(reason_id)))
  );
create policy "reason_likes: members like as themselves" on public.reason_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_trip_member(public.reason_trip_id(reason_id)));
create policy "reason_likes: remove own" on public.reason_likes for delete to authenticated
  using (user_id = (select auth.uid()));

revoke execute on function public.reason_trip_id(uuid) from public, anon;
grant execute on function public.reason_trip_id(uuid) to authenticated;
revoke execute on function public.destination_reasons_limit() from public, anon, authenticated;

alter publication supabase_realtime add table public.destination_reasons, public.reason_likes;
