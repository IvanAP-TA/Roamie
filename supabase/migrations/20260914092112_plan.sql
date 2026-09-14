-- ════════════════════════════════════════════════════════════════════════════
-- Roamie · 08 · Trip plan: useful links and a shared checklist
--   · trip_links: bookings and references (links + notes only, no file uploads)
--   · checklist_items: things to book or pack, optionally assigned to a member
-- Members read; owners and editors write (same split as destinations and itinerary).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Helper ─────────────────────────────────────────────────────────────────
create or replace function public.is_member_of_trip(_trip_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members m where m.trip_id = _trip_id and m.user_id = _user_id
  );
$$;

-- ─── Tables ─────────────────────────────────────────────────────────────────
create table public.trip_links (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  category text not null default 'other' check (category in ('flight', 'stay', 'ticket', 'transport', 'other')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  -- http(s) only, and nothing that could break out of an href attribute.
  url text check (url is null or (char_length(url) <= 2048 and url ~ '^https?://[^\s<>"'']+$')),
  note text check (char_length(note) <= 1000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  kind text not null default 'pack' check (kind in ('book', 'pack')),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  assignee_id uuid references public.profiles (id) on delete set null,
  done boolean not null default false,
  done_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index trip_links_trip_id_idx on public.trip_links (trip_id, created_at);
create index trip_links_created_by_idx on public.trip_links (created_by);
create index checklist_items_trip_id_idx on public.checklist_items (trip_id, created_at);
create index checklist_items_assignee_id_idx on public.checklist_items (assignee_id);
create index checklist_items_created_by_idx on public.checklist_items (created_by);

-- done_at follows done.
create or replace function public.handle_checklist_done()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.done and (tg_op = 'INSERT' or not old.done) then
    new.done_at := now();
  elsif not new.done then
    new.done_at := null;
  end if;
  return new;
end;
$$;

create trigger on_checklist_done
  before insert or update of done on public.checklist_items
  for each row execute function public.handle_checklist_done();

-- ─── Privileges & RLS ───────────────────────────────────────────────────────
alter table public.trip_links enable row level security;
alter table public.checklist_items enable row level security;

revoke all on public.trip_links, public.checklist_items from anon;
revoke update on public.trip_links, public.checklist_items from authenticated;
grant update (category, title, url, note) on public.trip_links to authenticated;
grant update (kind, title, assignee_id, done) on public.checklist_items to authenticated;

create policy "trip_links: members can read"
  on public.trip_links for select to authenticated
  using (public.is_trip_member(trip_id));

create policy "trip_links: editors and owners can insert"
  on public.trip_links for insert to authenticated
  with check (public.can_edit_trip(trip_id) and created_by = (select auth.uid()));

create policy "trip_links: editors and owners can update"
  on public.trip_links for update to authenticated
  using (public.can_edit_trip(trip_id))
  with check (public.can_edit_trip(trip_id));

create policy "trip_links: editors and owners can delete"
  on public.trip_links for delete to authenticated
  using (public.can_edit_trip(trip_id));

create policy "checklist_items: members can read"
  on public.checklist_items for select to authenticated
  using (public.is_trip_member(trip_id));

create policy "checklist_items: editors and owners can insert"
  on public.checklist_items for insert to authenticated
  with check (
    public.can_edit_trip(trip_id)
    and created_by = (select auth.uid())
    and (assignee_id is null or public.is_member_of_trip(trip_id, assignee_id))
  );

create policy "checklist_items: editors and owners can update"
  on public.checklist_items for update to authenticated
  using (public.can_edit_trip(trip_id))
  with check (
    public.can_edit_trip(trip_id)
    and (assignee_id is null or public.is_member_of_trip(trip_id, assignee_id))
  );

create policy "checklist_items: editors and owners can delete"
  on public.checklist_items for delete to authenticated
  using (public.can_edit_trip(trip_id));

revoke execute on function public.is_member_of_trip(uuid, uuid) from public, anon;
revoke execute on function public.handle_checklist_done() from public, anon, authenticated;

-- ─── Realtime ───────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.trip_links, public.checklist_items;
