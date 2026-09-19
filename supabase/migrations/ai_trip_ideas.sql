-- ── AI trip ideas ("Trova la meta" on the globe) next to the AI comparison ──
-- One cache for every AI answer (only public facts go in, see supabase/functions/_shared/ai.ts), and the daily
-- limits counted per kind of request: comparisons, suggestions and itineraries each have their own.

alter table public.ai_comparisons rename to ai_cache;
alter table public.ai_cache rename constraint ai_comparisons_pkey to ai_cache_pkey;

alter table public.ai_requests
  add column kind text not null default 'compare' check (kind in ('compare', 'suggest', 'itinerary'));
alter table public.ai_requests alter column kind drop default;
drop index public.ai_requests_user_created;
drop index public.ai_requests_created;
create index ai_requests_user_kind_created on public.ai_requests (user_id, kind, created_at);
create index ai_requests_kind_created on public.ai_requests (kind, created_at);

drop function public.claim_ai_request(uuid, int, int);
drop function public.release_ai_request(uuid);

-- Takes a slot for a new answer of this kind, or says which limit is reached: 'ok', 'user_limit' or 'global_limit'.
-- A lock serialises callers so the global cap holds under concurrent requests.
create function public.claim_ai_request(p_user uuid, p_kind text, p_per_user int, p_global int)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('claim_ai_request'));
  if (select count(*) from public.ai_requests where kind = p_kind and created_at > now() - interval '1 day') >= p_global then
    return 'global_limit';
  end if;
  if (select count(*) from public.ai_requests
       where user_id = p_user and kind = p_kind and created_at > now() - interval '1 day') >= p_per_user then
    return 'user_limit';
  end if;
  insert into public.ai_requests (user_id, kind) values (p_user, p_kind);
  return 'ok';
end;
$$;
revoke execute on function public.claim_ai_request(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.claim_ai_request(uuid, text, int, int) to service_role;

-- Gives the slot back when the model didn't answer, so a failure doesn't cost the user one of their tries.
create function public.release_ai_request(p_user uuid, p_kind text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.ai_requests
   where id = (select max(id) from public.ai_requests
                where user_id = p_user and kind = p_kind and created_at > now() - interval '5 minutes');
$$;
revoke execute on function public.release_ai_request(uuid, text) from public, anon, authenticated;
grant execute on function public.release_ai_request(uuid, text) to service_role;

create or replace function public.prune_ai_tables()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.ai_cache where created_at < now() - interval '30 days';
  delete from public.ai_requests where created_at < now() - interval '2 days';
$$;
revoke execute on function public.prune_ai_tables() from public, anon, authenticated;
