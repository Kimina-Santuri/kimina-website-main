-- Other Google calendars that only count as busy (user's request, 2026-11-03: busy times live in
-- several calendars). Bookings are still added only to google_calendar_id. Each extra calendar must be
-- shared with the service account ("See only free/busy (hide details)" is enough).
alter table public.booking_settings
  add column busy_calendar_ids text[] not null default '{}'
  check (cardinality(busy_calendar_ids) <= 20);

-- Busy times are now replaced whenever the worker has a list (even if one calendar had a problem,
-- which is then reported as the error); with p_busy null only the error is recorded.
create or replace function public.set_calendar_busy(p_busy jsonb, p_error text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_busy is not null then
    delete from private.calendar_busy where true;
    insert into private.calendar_busy(starts_at, ends_at)
      select (x->>'start')::timestamptz, (x->>'end')::timestamptz from jsonb_array_elements(p_busy) x;
    update private.calendar_state set refreshed_at = now(), error = p_error where true;
  else
    update private.calendar_state set error = p_error where true;
  end if;
end $$;
