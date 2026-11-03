-- create_booking also returns the cancel token, so a client who gave only a phone number
-- (and gets no email) can keep their cancel link from the confirmation screen.
create or replace function public.create_booking(
  p_service text, p_starts_at timestamptz, p_name text, p_email text, p_phone text, p_message text, p_ip_hash text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  svc public.services;
  b public.bookings;
  person uuid;
  v_email text := nullif(lower(trim(p_email)), '');
  v_phone text := nullif(trim(p_phone), '');
  slot_day date := (p_starts_at at time zone 'Africa/Nairobi')::date;
begin
  delete from private.booking_attempts where created_at < now() - interval '2 days';
  if (select count(*) from private.booking_attempts where ip_hash = p_ip_hash and created_at > now() - interval '1 day') >= 3
     or (select count(*) from private.booking_attempts where created_at > now() - interval '1 day') >= 40 then
    return jsonb_build_object('result', 'limited');
  end if;
  select * into svc from public.services where slug = p_service and active;
  if not found then return jsonb_build_object('result', 'error', 'message', 'That service is not available.'); end if;
  if not exists (select 1 from public.booking_slots(p_service, slot_day, 1) s where s.starts_at = p_starts_at) then
    return jsonb_build_object('result', 'taken');
  end if;
  insert into private.booking_attempts(ip_hash) values (coalesce(p_ip_hash, 'unknown'));

  select id into person from public.people
    where (v_email is not null and lower(people.email) = v_email) or (v_phone is not null and people.phone = v_phone)
    order by created_at limit 1;
  if person is null then
    insert into public.people(full_name, email, phone, is_client, notes)
      values (left(trim(p_name), 160), v_email, v_phone, true, 'Added by a booking on kimina.co.ke.')
      returning id into person;
  else
    update public.people set is_client = true where id = person;
  end if;

  begin
    insert into public.bookings(service_id, person_id, name, email, phone, message, starts_at, ends_at)
      values (svc.id, person, left(trim(p_name), 160), v_email, v_phone, left(trim(coalesce(p_message, '')), 2000),
              p_starts_at, p_starts_at + make_interval(mins => svc.session_minutes))
      returning * into b;
  exception when exclusion_violation then
    return jsonb_build_object('result', 'taken');
  end;
  return jsonb_build_object('result', 'booked', 'id', b.id, 'service', svc.name,
    'starts_at', b.starts_at, 'ends_at', b.ends_at, 'emailed', b.email is not null, 'cancel_token', b.cancel_token);
end $$;
revoke all on function public.create_booking(text, timestamptz, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_booking(text, timestamptz, text, text, text, text, text) to service_role;
