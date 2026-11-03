-- Supabase refuses an UPDATE with no WHERE clause (pg_safeupdate), so set_calendar_busy()
-- failed on its first real run with Google connected. Same function, with "where true".
create or replace function public.set_calendar_busy(p_busy jsonb, p_error text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_error is null then
    delete from private.calendar_busy where true;
    insert into private.calendar_busy(starts_at, ends_at)
      select (x->>'start')::timestamptz, (x->>'end')::timestamptz from jsonb_array_elements(p_busy) x;
    update private.calendar_state set refreshed_at = now(), error = null where true;
  else
    update private.calendar_state set error = p_error where true;
  end if;
end $$;
