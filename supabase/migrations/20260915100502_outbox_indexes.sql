-- Deleting a profile or a trip cascades to its queued notifications: index the foreign keys (database advisor).
create index push_outbox_user_id_idx on public.push_outbox (user_id);
create index push_outbox_trip_id_idx on public.push_outbox (trip_id);
