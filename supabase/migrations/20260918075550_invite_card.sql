-- ── Invite link previews ──
-- What a link preview may show about a trip to anyone holding its invite code: name, cover, how many people are in
-- and up to three places in the running. Whoever has the code can join and see all of it anyway; nothing about
-- the members themselves is included.

create or replace function public.get_invite_card(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', t.name,
    'cover_image_url', t.cover_image_url,
    'member_count', (select count(*)::int from public.trip_members m where m.trip_id = t.id),
    'destination_count', (select count(*)::int from public.destinations d where d.trip_id = t.id and d.status = 'proposed'),
    'destinations', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.name, 'image_url', x.image_url) order by x.picked desc, x.created_at)
        from (
          select d.name, d.image_url, d.created_at, d.status = 'selected' as picked
            from public.destinations d
           where d.trip_id = t.id and d.status in ('proposed', 'selected')
           order by d.status = 'selected' desc, d.created_at
           limit 3
        ) x
    ), '[]'::jsonb)
  )
  from public.trips t
  where t.invite_code = upper(btrim(p_code));
$$;
revoke execute on function public.get_invite_card(text) from public;
grant execute on function public.get_invite_card(text) to anon, authenticated;
