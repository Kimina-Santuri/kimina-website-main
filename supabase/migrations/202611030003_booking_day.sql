-- One day's picture for the booking page's timeline (user's request, 2026-11-03: "a simple visual
-- with when I'm busy"). Returns the open hours, the busy periods (bookings, blocks and Google
-- Calendar busy times merged together, no titles or details) and the earliest bookable moment
-- (minimum notice). Null on closed days, past days and days beyond the booking window.
create function public.booking_day(p_day date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  s public.booking_settings;
  h public.booking_hours;
  today date := (now() at time zone 'Africa/Nairobi')::date;
  opens timestamptz;
  closes timestamptz;
begin
  select * into s from public.booking_settings;
  if not found or not s.bookings_open or p_day < today or p_day > today + s.days_ahead then return null; end if;
  select * into h from public.booking_hours where weekday = extract(dow from p_day);
  if not found then return null; end if;
  opens := (p_day + h.opens) at time zone 'Africa/Nairobi';
  closes := (p_day + h.closes) at time zone 'Africa/Nairobi';
  return jsonb_build_object(
    'opens', opens,
    'closes', closes,
    'earliest', greatest(opens, least(closes, now() + make_interval(hours => s.min_notice_hours))),
    'busy', coalesce((
      select jsonb_agg(jsonb_build_object('start', lower(r), 'end', upper(r)) order by lower(r))
      from unnest((
        select range_agg(tstzrange(greatest(x.starts_at, opens), least(x.ends_at, closes)))
        from (
          select b.starts_at, b.ends_at from public.bookings b where b.status <> 'cancelled'
          union all select k.starts_at, k.ends_at from public.booking_blocks k
          union all select c.starts_at, c.ends_at from private.calendar_busy c
        ) x
        where x.starts_at < closes and x.ends_at > opens
      )) r
    ), '[]'::jsonb));
end $$;

revoke all on function public.booking_day(date) from public;
grant execute on function public.booking_day(date) to anon, authenticated;
