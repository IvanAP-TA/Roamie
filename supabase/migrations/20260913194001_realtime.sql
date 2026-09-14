-- ════════════════════════════════════════════════════════════════════════════
-- Roamie · 04 · Realtime
-- postgres_changes respects RLS: members only receive rows they can read.
-- ════════════════════════════════════════════════════════════════════════════
alter publication supabase_realtime add table
  public.trips,
  public.trip_members,
  public.destinations,
  public.votes,
  public.comments,
  public.itinerary_days,
  public.itinerary_items;
