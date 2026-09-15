-- points_used is only called inside security-definer functions; signed-in users don't need it directly
-- (it would tell how many points any member has used in any trip).
revoke execute on function public.points_used(uuid, uuid) from public, anon, authenticated;
