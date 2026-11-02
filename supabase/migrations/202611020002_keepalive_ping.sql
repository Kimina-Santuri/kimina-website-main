-- A tiny function the GitHub Actions keep-alive calls twice a week, so the free project
-- sees database activity and is not paused. It reads no tables and returns only 'ok'.
create function public.ping() returns text
language sql stable security invoker set search_path='' as $$ select 'ok'::text $$;
revoke all on function public.ping() from public;
grant execute on function public.ping() to anon,authenticated;
