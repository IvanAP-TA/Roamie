-- ════════════════════════════════════════════════════════════════════════════
-- Roamie · 11 · Public read-only trip page (opt-in, owner only)
-- ════════════════════════════════════════════════════════════════════════════

-- null = private. Not in the column UPDATE grants: only set_trip_public writes it.
alter table public.trips
  add column public_slug text unique
    check (public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(public_slug) <= 64);

-- Publish (returns the slug, keeping an existing one) or unpublish (returns null).
-- Slug = readable part of the name + 8 random characters, so pages can't be enumerated.
create or replace function public.set_trip_public(p_trip_id uuid, p_public boolean)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_slug text;
  v_name text;
begin
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not coalesce(p_public, false) then
    update public.trips set public_slug = null where id = p_trip_id;
    return null;
  end if;

  select t.public_slug, t.name into v_slug, v_name from public.trips t where t.id = p_trip_id for update;
  if v_slug is not null then
    return v_slug;
  end if;

  v_name := translate(lower(v_name), 'àáâãäåèéêëìíîïòóôõöùúûüñçýÿ', 'aaaaaaeeeeiiiiooooouuuuncyy');
  v_name := trim(both '-' from left(trim(both '-' from regexp_replace(v_name, '[^a-z0-9]+', '-', 'g')), 48));
  v_slug := concat_ws('-', nullif(v_name, ''), lower(public.generate_invite_code()));

  update public.trips set public_slug = v_slug where id = p_trip_id;
  return v_slug;
end;
$$;

-- What a public page shows: trip details, destinations with photo and total points, the itinerary.
-- Never: members, individual votes, comments, links, checklist, invite code.
create or replace function public.get_public_trip(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', t.public_slug,
    'name', t.name,
    'description', t.description,
    'cover_image_url', t.cover_image_url,
    'cover_image_attribution', t.cover_image_attribution,
    'destinations', coalesce((
      select jsonb_agg(to_jsonb(d) - 'status_rank' - 'created_at' order by d.status_rank, d.points desc, d.created_at)
        from (
          select x.id, x.name, x.country, x.country_code, x.lat, x.lng, x.image_url, x.image_attribution,
                 x.mood, x.budget_level, x.status, x.created_at,
                 coalesce((select sum(v.points)::int from public.votes v where v.destination_id = x.id), 0) as points,
                 case x.status when 'selected' then 0 when 'proposed' then 1 else 2 end as status_rank
            from public.destinations x
           where x.trip_id = t.id
        ) d
    ), '[]'::jsonb),
    'days', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'day_number', dd.day_number,
                 'date', dd.date,
                 'title', dd.title,
                 'items', coalesce((
                   select jsonb_agg(
                            jsonb_build_object('time', i.time, 'title', i.title, 'description', i.description,
                                               'place_name', i.place_name, 'lat', i.lat, 'lng', i.lng)
                            order by i.order_index, i.id)
                     from public.itinerary_items i
                    where i.itinerary_day_id = dd.id
                 ), '[]'::jsonb))
               order by dd.day_number)
        from public.itinerary_days dd
       where dd.trip_id = t.id
    ), '[]'::jsonb)
  )
    from public.trips t
   where t.public_slug = lower(btrim(p_slug));
$$;

revoke execute on function public.set_trip_public(uuid, boolean) from public, anon;
grant execute on function public.set_trip_public(uuid, boolean) to authenticated;
revoke execute on function public.get_public_trip(text) from public;
grant execute on function public.get_public_trip(text) to anon, authenticated;
