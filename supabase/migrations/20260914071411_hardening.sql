-- ════════════════════════════════════════════════════════════════════════════
-- Roamie · 05 · Hardening
--   · RLS helpers and trigger functions are not part of the public API
--   · images can only be Wikimedia Commons files or built-in illustrated scenes
--   · avatars can only come from Google; display names are capped
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Function privileges ────────────────────────────────────────────────────
-- Policies call the helpers as the signed-in user, so `authenticated` keeps EXECUTE.
-- `anon` never reads tables, so it has no reason to call them over /rest/v1/rpc.
revoke execute on function
  public.trip_role(uuid),
  public.is_trip_member(uuid),
  public.can_edit_trip(uuid),
  public.is_trip_owner(uuid),
  public.destination_trip_id(uuid),
  public.itinerary_day_trip_id(uuid),
  public.shares_trip_with(uuid)
from public, anon;

-- ─── Image URLs ─────────────────────────────────────────────────────────────
-- Any other host would let a group member hot-link a tracking pixel (leaking the IP of everyone in
-- the trip) or smuggle quotes into CSS url(). Mirrors safeImageUrl() in src/lib/utils.ts.
-- (Postgres regex bounds stop at 255, hence the separate length checks.)
alter table public.trips
  add constraint trips_cover_image_url_safe check (
    cover_image_url is null
    or (
      char_length(cover_image_url) <= 2048
      and (
        cover_image_url ~ '^scene:[A-Za-z0-9_-]{1,40}$'
        or cover_image_url ~ '^https://upload\.wikimedia\.org/[^\s''"\\<>]+$'
      )
    )
  ),
  add constraint trips_cover_image_attribution_length check (char_length(cover_image_attribution) <= 2000);

alter table public.destinations
  add constraint destinations_image_url_safe check (
    image_url is null
    or (
      char_length(image_url) <= 2048
      and (
        image_url ~ '^scene:[A-Za-z0-9_-]{1,40}$'
        or image_url ~ '^https://upload\.wikimedia\.org/[^\s''"\\<>]+$'
      )
    )
  ),
  add constraint destinations_image_attribution_length check (char_length(image_attribution) <= 2000);

-- ─── Profiles ───────────────────────────────────────────────────────────────
-- A trigger rather than a check constraint: an unexpected avatar host from Google must never block sign-up.
create or replace function public.sanitize_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.avatar_url is not null
     and (char_length(new.avatar_url) > 2048
          or new.avatar_url !~ '^https://[a-z0-9-]+\.googleusercontent\.com/[^\s''"\\<>]+$') then
    new.avatar_url := null;
  end if;
  new.display_name := left(nullif(btrim(new.display_name), ''), 80);
  return new;
end;
$$;

create trigger on_profile_write
  before insert or update of display_name, avatar_url on public.profiles
  for each row execute function public.sanitize_profile();

-- Triggers don't need the caller to hold EXECUTE.
revoke execute on function
  public.sanitize_profile(),
  public.handle_new_user(),
  public.handle_user_metadata_update(),
  public.handle_new_trip(),
  public.handle_destination_status()
from public, anon, authenticated;
