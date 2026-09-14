-- ════════════════════════════════════════════════════════════════════════════
-- Roamie · 15 · Resetting points: members clear their own, the owner can restart the vote for everyone
-- ════════════════════════════════════════════════════════════════════════════

-- Only points on proposed destinations count towards the budget, so only those are cleared.
-- Security definer: the owner removes other members' votes, which the votes RLS policies don't allow.
create or replace function public.reset_points(p_trip_id uuid, p_everyone boolean default false)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_count int;
begin
  if not public.is_trip_member(p_trip_id) or (p_everyone and not public.is_trip_owner(p_trip_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.votes v
   using public.destinations d
   where v.destination_id = d.id
     and d.trip_id = p_trip_id
     and d.status = 'proposed'
     and (p_everyone or v.user_id = v_uid);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.reset_points(uuid, boolean) from public, anon;
grant execute on function public.reset_points(uuid, boolean) to authenticated;
