-- The Telegram triggers' functions (20261020200000_telegram_groups.sql) run only as triggers: nobody calls them
-- through the API. Postgres would refuse such a call anyway; revoking EXECUTE keeps them off the API's surface, as the
-- security advisor asks.
revoke all on function public.telegram_on_destination() from public, anon, authenticated;
revoke all on function public.telegram_on_member() from public, anon, authenticated;
revoke all on function public.telegram_on_trip_dates() from public, anon, authenticated;
revoke all on function public.telegram_dispatch() from public, anon, authenticated;
