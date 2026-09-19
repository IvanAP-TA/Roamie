-- ── AI comparison of destinations (Edge Function compare-destinations, Mistral) ──
-- The model sees only public facts (place names, countries, month, trip length, group size, the country flights
-- leave from), never what members wrote. So answers are cached for everyone: two groups comparing the same places
-- in the same month and language share one answer. Both tables are reached only by the Edge Function (service role).

create table public.ai_comparisons (
  key text primary key,
  result jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.ai_comparisons enable row level security;
revoke all on public.ai_comparisons from public, anon, authenticated;

-- One row per answer actually asked to the model (cache misses), for the limits below.
create table public.ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index ai_requests_user_created on public.ai_requests (user_id, created_at);
create index ai_requests_created on public.ai_requests (created_at);
alter table public.ai_requests enable row level security;
revoke all on public.ai_requests from public, anon, authenticated;

-- Takes a slot for a new answer, or says which limit is reached: 'ok', 'user_limit' or 'global_limit'.
-- A lock serialises callers so the global cap holds under concurrent requests.
create or replace function public.claim_ai_request(p_user uuid, p_per_user int, p_global int)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('claim_ai_request'));
  if (select count(*) from public.ai_requests where created_at > now() - interval '1 day') >= p_global then
    return 'global_limit';
  end if;
  if (select count(*) from public.ai_requests where user_id = p_user and created_at > now() - interval '1 day') >= p_per_user then
    return 'user_limit';
  end if;
  insert into public.ai_requests (user_id) values (p_user);
  return 'ok';
end;
$$;
revoke execute on function public.claim_ai_request(uuid, int, int) from public, anon, authenticated;
grant execute on function public.claim_ai_request(uuid, int, int) to service_role;

-- Gives the slot back when the model didn't answer, so a failure doesn't cost the user one of their tries.
create or replace function public.release_ai_request(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.ai_requests
   where id = (select max(id) from public.ai_requests where user_id = p_user and created_at > now() - interval '5 minutes');
$$;
revoke execute on function public.release_ai_request(uuid) from public, anon, authenticated;
grant execute on function public.release_ai_request(uuid) to service_role;

grant select, insert, update, delete on public.ai_comparisons to service_role;
grant select, insert, delete on public.ai_requests to service_role;

create or replace function public.prune_ai_tables()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.ai_comparisons where created_at < now() - interval '30 days';
  delete from public.ai_requests where created_at < now() - interval '2 days';
$$;
revoke execute on function public.prune_ai_tables() from public, anon, authenticated;

do $$
begin
  -- Hosted database only: the local test harness has no pg_cron.
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
    execute $cron$select cron.schedule('prune-ai-tables', '50 4 * * *', 'select public.prune_ai_tables()')$cron$;
  end if;
end;
$$;
