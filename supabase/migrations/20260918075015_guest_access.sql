-- ── Guests: join an invite with just a name (Supabase anonymous sign-in), link Google later ──
-- A guest is a regular signed-in user whose auth.users row is anonymous: they can do everything a member can
-- inside the trips they join, but not create trips of their own. Linking Google keeps the same user id, so
-- nothing is lost.

create or replace function public.is_guest()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select u.is_anonymous from auth.users u where u.id = (select auth.uid())), false)
$$;
revoke execute on function public.is_guest() from public, anon;
grant execute on function public.is_guest() to authenticated;

drop policy "trips: authenticated users create their own" on public.trips;
create policy "trips: members with an account create their own" on public.trips for insert to authenticated
  with check (owner_id = (select auth.uid()) and not public.is_guest());

-- Guests who never came back: removed after 60 days without any activity. Their votes and comments go with them;
-- the destinations they proposed stay with the group, as when anyone deletes their account.
create or replace function public.delete_stale_guests()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  delete from auth.users u
   where u.is_anonymous
     and u.created_at < now() - interval '60 days'
     and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '60 days'
     and not exists (select 1 from auth.sessions s where s.user_id = u.id and s.updated_at > now() - interval '60 days');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.delete_stale_guests() from public, anon, authenticated;

do $$
begin
  -- Hosted database only: the local test harness has no pg_cron.
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
    execute $cron$select cron.schedule('delete-stale-guests', '40 4 * * *', 'select public.delete_stale_guests()')$cron$;
  end if;
end;
$$;
