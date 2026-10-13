-- The social bot's daily start. GitHub's own scheduler starts runs late or drops them when it's busy (and it always
-- is on the hour), so pg_cron starts the "Social videos" workflow through GitHub's API at a precise time instead.
-- GitHub's schedule stays as a later backup; the bot skips an automatic run when the day's post is already out.
--
-- Needs a fine-grained GitHub token (repository IvanAP-TA/Roamie only, permission "Actions: read and write") in Vault
-- under the name 'github_actions_token'. Without it the job does nothing.

create or replace function public.dispatch_social_post()
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
    url := 'https://api.github.com/repos/IvanAP-TA/Roamie/actions/workflows/social-videos.yml/dispatches',
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

revoke all on function public.dispatch_social_post() from public, anon, authenticated;

do $$
begin
  -- Hosted database only: the local test harness has no pg_cron.
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    -- Monday to Friday at 16:00 UTC: 18:00 in Italy in summer, 17:00 in winter.
    execute $cron$select cron.schedule('social-post', '0 16 * * 1-5', 'select public.dispatch_social_post()')$cron$;
  end if;
end;
$$;
