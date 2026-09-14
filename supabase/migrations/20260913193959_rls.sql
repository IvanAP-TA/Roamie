-- ════════════════════════════════════════════════════════════════════════════
-- Roamie · 02 · Row Level Security
--
-- Every policy is based on membership in trip_members. Membership checks live in
-- SECURITY DEFINER helpers: a policy on trip_members that queried trip_members
-- directly would recurse infinitely, and the helpers keep all policies uniform.
--
--   owner  → everything, incl. members/roles, invite code, deleting the trip
--   editor → add/edit destinations & itinerary, spin the roulette
--   viewer → read, vote, comment (own content only)
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Helpers ────────────────────────────────────────────────────────────────
create or replace function public.trip_role(_trip_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
    from public.trip_members m
   where m.trip_id = _trip_id
     and m.user_id = (select auth.uid());
$$;

create or replace function public.is_trip_member(_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.trip_role(_trip_id) is not null;
$$;

create or replace function public.can_edit_trip(_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.trip_role(_trip_id) in ('owner', 'editor'), false);
$$;

create or replace function public.is_trip_owner(_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.trip_role(_trip_id) = 'owner', false);
$$;

create or replace function public.destination_trip_id(_destination_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select d.trip_id from public.destinations d where d.id = _destination_id;
$$;

create or replace function public.itinerary_day_trip_id(_day_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select d.trip_id from public.itinerary_days d where d.id = _day_id;
$$;

create or replace function public.shares_trip_with(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.trip_members mine
      join public.trip_members theirs on theirs.trip_id = mine.trip_id
     where mine.user_id = (select auth.uid())
       and theirs.user_id = _user_id
  );
$$;

-- ─── Enable RLS ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.destinations enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.itinerary_items enable row level security;

-- Anonymous visitors never touch tables directly (the join preview is an RPC).
revoke all on public.profiles, public.trips, public.trip_members, public.destinations,
  public.votes, public.comments, public.itinerary_days, public.itinerary_items from anon;

-- Column-level update grants: immutable columns (ids, trip_id, owner, author…) can't be rewritten.
revoke update on public.profiles, public.trips, public.trip_members, public.destinations,
  public.votes, public.comments, public.itinerary_days, public.itinerary_items from authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant update (name, description, cover_image_url, cover_image_attribution) on public.trips to authenticated;
grant update (role) on public.trip_members to authenticated;
grant update (name, country, lat, lng, image_url, image_attribution, mood, budget_level, expectations, status)
  on public.destinations to authenticated;
grant update (vote_type) on public.votes to authenticated;
grant update (content) on public.comments to authenticated;
grant update (day_number, date, title) on public.itinerary_days to authenticated;
grant update (time, title, description, order_index) on public.itinerary_items to authenticated;

-- ─── profiles ───────────────────────────────────────────────────────────────
create policy "profiles: read self and trip companions"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_trip_with(id));

create policy "profiles: update self"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ─── trips ──────────────────────────────────────────────────────────────────
-- owner_id check lets INSERT … RETURNING see the row before the membership trigger is visible.
create policy "trips: members can read"
  on public.trips for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_trip_member(id));

create policy "trips: authenticated users create their own"
  on public.trips for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "trips: owners and editors can update details"
  on public.trips for update to authenticated
  using (public.can_edit_trip(id))
  with check (public.can_edit_trip(id));

create policy "trips: owners can delete"
  on public.trips for delete to authenticated
  using (public.is_trip_owner(id));

-- ─── trip_members ───────────────────────────────────────────────────────────
-- No INSERT policy: rows are created by the on_trip_created trigger and join_trip().
create policy "trip_members: members can read"
  on public.trip_members for select to authenticated
  using (public.is_trip_member(trip_id));

create policy "trip_members: owners change non-owner roles"
  on public.trip_members for update to authenticated
  using (public.is_trip_owner(trip_id) and role <> 'owner')
  with check (role in ('editor', 'viewer'));

create policy "trip_members: owners remove members, members leave"
  on public.trip_members for delete to authenticated
  using (
    role <> 'owner'
    and (public.is_trip_owner(trip_id) or user_id = (select auth.uid()))
  );

-- ─── destinations ───────────────────────────────────────────────────────────
create policy "destinations: members can read"
  on public.destinations for select to authenticated
  using (public.is_trip_member(trip_id));

create policy "destinations: editors and owners can insert"
  on public.destinations for insert to authenticated
  with check (public.can_edit_trip(trip_id) and created_by = (select auth.uid()));

create policy "destinations: editors and owners can update"
  on public.destinations for update to authenticated
  using (public.can_edit_trip(trip_id))
  with check (public.can_edit_trip(trip_id));

create policy "destinations: owners, or editors on their own"
  on public.destinations for delete to authenticated
  using (
    public.is_trip_owner(trip_id)
    or (created_by = (select auth.uid()) and public.can_edit_trip(trip_id))
  );

-- ─── votes (every role can vote) ────────────────────────────────────────────
create policy "votes: members can read"
  on public.votes for select to authenticated
  using (public.is_trip_member(public.destination_trip_id(destination_id)));

create policy "votes: members vote as themselves"
  on public.votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_trip_member(public.destination_trip_id(destination_id))
  );

create policy "votes: change own vote"
  on public.votes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and public.is_trip_member(public.destination_trip_id(destination_id))
  );

create policy "votes: remove own vote"
  on public.votes for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─── comments (every role can comment) ──────────────────────────────────────
create policy "comments: members can read"
  on public.comments for select to authenticated
  using (public.is_trip_member(public.destination_trip_id(destination_id)));

create policy "comments: members comment as themselves"
  on public.comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_trip_member(public.destination_trip_id(destination_id))
  );

create policy "comments: edit own"
  on public.comments for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "comments: delete own, owners moderate"
  on public.comments for delete to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_trip_owner(public.destination_trip_id(destination_id))
  );

-- ─── itinerary_days ─────────────────────────────────────────────────────────
create policy "itinerary_days: members can read"
  on public.itinerary_days for select to authenticated
  using (public.is_trip_member(trip_id));

create policy "itinerary_days: editors and owners can insert"
  on public.itinerary_days for insert to authenticated
  with check (public.can_edit_trip(trip_id));

create policy "itinerary_days: editors and owners can update"
  on public.itinerary_days for update to authenticated
  using (public.can_edit_trip(trip_id))
  with check (public.can_edit_trip(trip_id));

create policy "itinerary_days: editors and owners can delete"
  on public.itinerary_days for delete to authenticated
  using (public.can_edit_trip(trip_id));

-- ─── itinerary_items ────────────────────────────────────────────────────────
create policy "itinerary_items: members can read"
  on public.itinerary_items for select to authenticated
  using (public.is_trip_member(public.itinerary_day_trip_id(itinerary_day_id)));

create policy "itinerary_items: editors and owners can insert"
  on public.itinerary_items for insert to authenticated
  with check (public.can_edit_trip(public.itinerary_day_trip_id(itinerary_day_id)));

create policy "itinerary_items: editors and owners can update"
  on public.itinerary_items for update to authenticated
  using (public.can_edit_trip(public.itinerary_day_trip_id(itinerary_day_id)))
  with check (public.can_edit_trip(public.itinerary_day_trip_id(itinerary_day_id)));

create policy "itinerary_items: editors and owners can delete"
  on public.itinerary_items for delete to authenticated
  using (public.can_edit_trip(public.itinerary_day_trip_id(itinerary_day_id)));
