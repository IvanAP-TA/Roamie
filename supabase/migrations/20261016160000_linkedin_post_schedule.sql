-- The LinkedIn bot's daily start, like the social bot's (social_post_schedule): pg_cron starts the "LinkedIn" workflow
-- through GitHub's API at a precise time, with the same Vault token ('github_actions_token'). GitHub's own schedule
-- stays as a later backup; the bot skips an automatic run when the day's post is already out.

create or replace function public.dispatch_linkedin_post()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text := (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'github_actions_token' limit 1);
begin
  if token is null or not exists (select 1 from pg_catalog.pg_namespace where nspname = 'net') then
    return;
  end if;
  perform net.http_post(
    url := 'https://api.github.com/repos/IvanAP-TA/Roamie/actions/workflows/linkedin.yml/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'roamie-supabase-cron',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('ref', 'main', 'inputs', jsonb_build_object('auto', 'true')),
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function public.dispatch_linkedin_post() from public, anon, authenticated;

do $$
begin
  -- Hosted database only: the local test harness has no pg_cron.
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    -- Every day at 07:00 UTC: 09:00 in Italy in summer, 08:00 in winter, when people open LinkedIn.
    execute $cron$select cron.schedule('linkedin-post', '0 7 * * *', 'select public.dispatch_linkedin_post()')$cron$;
  end if;
end;
$$;
