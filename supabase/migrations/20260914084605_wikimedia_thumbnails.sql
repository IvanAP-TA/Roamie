-- ════════════════════════════════════════════════════════════════════════════
-- Roamie · 06 · Wikimedia thumbnail host
-- The Commons API now returns thumbnails on thumb.wikimedia.org as well as upload.wikimedia.org,
-- which the image URL rules from 05 rejected. Mirrors safeImageUrl() in src/lib/utils.ts.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.trips
  drop constraint trips_cover_image_url_safe,
  add constraint trips_cover_image_url_safe check (
    cover_image_url is null
    or (
      char_length(cover_image_url) <= 2048
      and (
        cover_image_url ~ '^scene:[A-Za-z0-9_-]{1,40}$'
        or cover_image_url ~ '^https://(upload|thumb)\.wikimedia\.org/[^\s''"\\<>]+$'
      )
    )
  );

alter table public.destinations
  drop constraint destinations_image_url_safe,
  add constraint destinations_image_url_safe check (
    image_url is null
    or (
      char_length(image_url) <= 2048
      and (
        image_url ~ '^scene:[A-Za-z0-9_-]{1,40}$'
        or image_url ~ '^https://(upload|thumb)\.wikimedia\.org/[^\s''"\\<>]+$'
      )
    )
  );
