-- ════════════════════════════════════════════════════════════════════════════
-- Roamie · 03 · RPC functions (invites, votes, roulette, account deletion)
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Public invite preview (callable without login) ─────────────────────────
-- Deliberately minimal: name, cover (+ its CC attribution) and member count.
create or replace function public.get_trip_preview(p_code text)
returns table (
  id uuid,
  name text,
  cover_image_url text,
  cover_image_attribution text,
  member_count int,
  is_member boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id,
         t.name,
         t.cover_image_url,
         t.cover_image_attribution,
         (select count(*)::int from public.trip_members m where m.trip_id = t.id),
         exists (
           select 1 from public.trip_members m
            where m.trip_id = t.id and m.user_id = (select auth.uid())
         )
    from public.trips t
   where t.invite_code = upper(btrim(p_code));
$$;

-- ─── Join through an invite code → editor ───────────────────────────────────
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
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select t.id into v_trip_id
    from public.trips t
   where t.invite_code = upper(btrim(p_code));

  if v_trip_id is null then
    raise exception 'invalid_invite_code' using errcode = 'P0002';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, v_uid, 'editor')
  on conflict (trip_id, user_id) do nothing; -- existing members keep their role

  return v_trip_id;
end;
$$;

-- ─── Regenerate invite code (old link stops working) ────────────────────────
create or replace function public.regenerate_invite_code(p_trip_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_code := public.generate_invite_code();
  update public.trips set invite_code = v_code where id = p_trip_id;
  return v_code;
end;
$$;

-- ─── Vote toggle ────────────────────────────────────────────────────────────
-- Same vote again → removes it; different vote → switches it. Runs as the caller (RLS applies).
-- Returns the resulting vote ('up' | 'down') or null when removed.
create or replace function public.cast_vote(p_destination_id uuid, p_vote_type text)
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_existing text;
begin
  if p_vote_type not in ('up', 'down') then
    raise exception 'invalid_vote_type' using errcode = '22023';
  end if;

  select v.vote_type into v_existing
    from public.votes v
   where v.destination_id = p_destination_id and v.user_id = v_uid;

  if v_existing = p_vote_type then
    delete from public.votes where destination_id = p_destination_id and user_id = v_uid;
    return null;
  elsif v_existing is not null then
    update public.votes set vote_type = p_vote_type
     where destination_id = p_destination_id and user_id = v_uid;
  else
    insert into public.votes (destination_id, user_id, vote_type)
    values (p_destination_id, v_uid, p_vote_type);
  end if;

  return p_vote_type;
end;
$$;

-- ─── Roulette ───────────────────────────────────────────────────────────────
-- Eligible: status = 'proposed' AND net score (up − down) > 0.
-- Weighted draw: P(destination) = score / Σ scores. The draw happens server-side
-- so nobody can pick the winner from their own browser; the client only animates it.
create or replace function public.spin_roulette(p_trip_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_winner uuid;
begin
  if not public.can_edit_trip(p_trip_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Serialise concurrent spins on the same trip.
  perform 1 from public.trips t where t.id = p_trip_id for update;

  with scores as (
    select d.id,
           sum(case v.vote_type when 'up' then 1 when 'down' then -1 else 0 end) as score
      from public.destinations d
      left join public.votes v on v.destination_id = d.id
     where d.trip_id = p_trip_id
       and d.status = 'proposed'
     group by d.id
    having sum(case v.vote_type when 'up' then 1 when 'down' then -1 else 0 end) > 0
  ),
  cumulative as (
    select id,
           sum(score) over (order by id) as upper_bound,
           sum(score) over () as total
      from scores
  ),
  draw as (
    select random() * (select max(total) from cumulative) as ticket
  )
  select c.id into v_winner
    from cumulative c, draw
   where c.upper_bound > draw.ticket
   order by c.upper_bound
   limit 1;

  if v_winner is null then
    raise exception 'no_eligible_destinations' using errcode = 'P0002';
  end if;

  update public.destinations set status = 'selected' where id = v_winner;
  return v_winner;
end;
$$;

-- ─── Account deletion (GDPR right to erasure) ───────────────────────────────
-- Cascades: profile → owned trips (and everything in them), memberships, votes,
-- comments. Destinations proposed in other people's trips stay, with created_by = null.
create or replace function public.delete_account()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

-- ─── Execute privileges ─────────────────────────────────────────────────────
revoke execute on function
  public.generate_invite_code(),
  public.handle_new_user(),
  public.handle_user_metadata_update(),
  public.handle_new_trip(),
  public.handle_destination_status(),
  public.join_trip(text),
  public.regenerate_invite_code(uuid),
  public.cast_vote(uuid, text),
  public.spin_roulette(uuid),
  public.delete_account()
from public, anon;

grant execute on function public.get_trip_preview(text) to anon, authenticated;
grant execute on function
  public.join_trip(text),
  public.regenerate_invite_code(uuid),
  public.cast_vote(uuid, text),
  public.spin_roulette(uuid),
  public.delete_account()
to authenticated;
