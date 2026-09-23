-- ── What a guest can't do before linking Google, and what a new trip can't be created with ──
-- Guests try Roamie inside trips; anything that reaches beyond them waits for a Google account: inviting people
-- (join_trip), publishing a public page (here) and the AI features (checked in the Edge Functions).
--
-- A new trip used to accept any column, so the public slug, the invite code, a scheduled spin or secret voting
-- could be set at creation, skipping the RPCs that check them. Only what the trip forms write is insertable now.

revoke insert on public.trips from authenticated;
grant insert (owner_id, name, description, cover_image_url, cover_image_attribution, date_window_start, date_window_end, trip_length, start_date, end_date)
  on public.trips to authenticated;

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

  if public.is_guest() then
    raise exception 'guest_account_required' using errcode = '42501';
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
