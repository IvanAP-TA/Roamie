-- Shared expenses were removed from the app (groups already use a dedicated app for this). The tables were empty.
alter publication supabase_realtime drop table public.expense_lists, public.expenses;
drop function if exists public.save_expense(uuid, text, text, numeric, text, numeric, uuid, date, jsonb, text, uuid);
drop table if exists public.expense_shares;
drop table if exists public.expenses;
drop table if exists public.expense_lists;
drop function if exists public.can_manage_expense(uuid);
drop function if exists public.expense_trip_id(uuid);
drop function if exists public.expense_list_trip_id(uuid);
