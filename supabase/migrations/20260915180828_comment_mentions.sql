-- ── Mentions in comments: @someone and @all ──
-- A member is written as <@user-id> in the comment, so the mention survives renames and people sharing a name;
-- @all reaches the whole group. Who gets notified is worked out here, never trusted from the app.

alter table public.notification_preferences add column mentions boolean not null default true;
grant update (mentions) on public.notification_preferences to authenticated;

alter table public.push_outbox drop constraint push_outbox_kind_check;
alter table public.push_outbox add constraint push_outbox_kind_check
  check (kind in ('destination', 'roulette', 'dates_open', 'dates_fixed', 'member', 'comment', 'mention'));

create or replace function public.mentions_all(p_content text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_content ~* '(^|\W)@all(\W|$)'
$$;

-- Trip members mentioned in a comment; ids of anyone else are ignored.
create or replace function public.comment_mentions(p_content text, p_trip_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct m.user_id), '{}')
  from regexp_matches(p_content, '<@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})>', 'gi') as r (ids)
  join public.trip_members m on m.trip_id = p_trip_id and m.user_id = r.ids[1]::uuid
$$;

-- The comment as people read it ("@Olivia", not the token), for notification texts.
create or replace function public.comment_plain_text(p_content text, p_trip_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_text text := p_content;
  v_id text;
begin
  for v_id in
    select distinct r.ids[1]
    from regexp_matches(p_content, '<@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})>', 'gi') as r (ids)
  loop
    v_text := replace(v_text, '<@' || v_id || '>', '@' || coalesce(
      (select p.display_name
       from public.profiles p
       join public.trip_members m on m.user_id = p.id and m.trip_id = p_trip_id
       where p.id = v_id::uuid),
      '…'));
  end loop;
  return v_text;
end;
$$;

-- @all at most 3 times an hour per person in a trip, so nobody can flood the group with notifications.
create or replace function public.comments_limit_mention_all()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip uuid := public.destination_trip_id(new.destination_id);
begin
  if public.mentions_all(new.content) and (
    select count(*)
    from public.comments c
    join public.destinations d on d.id = c.destination_id
    where c.user_id = new.user_id
      and d.trip_id = v_trip
      and c.created_at > now() - interval '1 hour'
      and public.mentions_all(c.content)
  ) >= 3 then
    raise exception 'mention_all_limited' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger comments_mention_all_limit before insert on public.comments
  for each row execute function public.comments_limit_mention_all();

-- Mentioned members (everyone with @all) get a mention; the proposer and earlier commenters get the usual comment
-- notification, unless a mention already reached them.
create or replace function public.push_on_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_destination public.destinations;
  v_all boolean := public.mentions_all(new.content);
  v_data jsonb;
begin
  select * into v_destination from public.destinations d where d.id = new.destination_id;
  v_data := jsonb_build_object(
    'actor', (select p.display_name from public.profiles p where p.id = new.user_id),
    'destination', v_destination.name,
    'destination_id', v_destination.id,
    'comment_id', new.id,
    'excerpt', left(public.comment_plain_text(new.content, v_destination.trip_id), 140),
    'all', v_all
  );

  perform public.enqueue_push(v_destination.trip_id, 'mention', 'mentions', v_data,
    case
      when v_all then array(select m.user_id from public.trip_members m where m.trip_id = v_destination.trip_id)
      else public.comment_mentions(new.content, v_destination.trip_id)
    end);

  perform public.enqueue_push(v_destination.trip_id, 'comment', 'comments', v_data,
    array(
      select u.id
      from (
        select v_destination.created_by as id
        union
        select c.user_id from public.comments c where c.destination_id = new.destination_id and c.id <> new.id
      ) u
      where not exists (
        select 1 from public.push_outbox o
        where o.user_id = u.id and o.kind = 'mention' and o.data ->> 'comment_id' = new.id::text
      )
    ));
  return null;
end;
$$;

revoke execute on function
  public.mentions_all(text),
  public.comment_mentions(text, uuid),
  public.comment_plain_text(text, uuid),
  public.comments_limit_mention_all()
from public, anon, authenticated;
