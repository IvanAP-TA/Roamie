-- ════════════════════════════════════════════════════════════════════════════
-- Roamie · 09 · Itinerary stops on the map
-- A stop can have a place (name + coordinates, from the same place search as destinations).
-- ════════════════════════════════════════════════════════════════════════════
alter table public.itinerary_items
  add column place_name text check (char_length(place_name) <= 160),
  add column lat double precision check (lat between -90 and 90),
  add column lng double precision check (lng between -180 and 180),
  add constraint itinerary_items_coords_pair check ((lat is null) = (lng is null));

revoke update on public.itinerary_items from authenticated;
grant update (time, title, description, order_index, place_name, lat, lng) on public.itinerary_items to authenticated;
