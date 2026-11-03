-- Stage 4: Kimina's own booking calendar (replaces Calendly).
-- Clients book a free time on kimina.co.ke/book.html and it is confirmed at once. Free times
-- are the weekly hours minus bookings, blocks set in /admin, and busy times copied from
-- Kimina's Google Calendar. A `worker` Edge Function (pg_cron, every 5 minutes) copies those
-- busy times, adds bookings to Google Calendar and sends the queued emails through Zoho.
-- Visitors can only list free times and services; booking and cancelling go through the
-- `booking` Edge Function, which calls the service-role-only functions below.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------- settings ----------

alter table public.services
  add column session_minutes integer not null default 60 check (session_minutes between 15 and 480);

create table public.booking_settings(
  id boolean primary key default true check (id),
  bookings_open boolean not null default true,
  slot_minutes integer not null default 60 check (slot_minutes between 15 and 240),
  min_notice_hours integer not null default 12 check (min_notice_hours between 0 and 336),
  days_ahead integer not null default 60 check (days_ahead between 1 and 365),
  google_calendar_id text not null default '',
  notify_email text not null default 'kimina@santuri.org',
  updated_at timestamptz not null default now()
);
insert into public.booking_settings default values;

-- Weekday follows Postgres: 0 = Sunday … 6 = Saturday. A missing day is closed.
create table public.booking_hours(
  weekday smallint primary key check (weekday between 0 and 6),
  opens time not null,
  closes time not null,
  check (closes > opens)
);
insert into public.booking_hours(weekday, opens, closes)
  select d, '09:00', '18:00' from generate_series(1, 6) d;

create table public.booking_blocks(
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '' check (length(reason) <= 200),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index booking_blocks_time_idx on public.booking_blocks using gist (tstzrange(starts_at, ends_at));

-- Busy times copied from Google Calendar by the worker (times only, no titles).
create table private.calendar_busy(starts_at timestamptz not null, ends_at timestamptz not null);
create index calendar_busy_time_idx on private.calendar_busy using gist (tstzrange(starts_at, ends_at));
create table private.calendar_state(
  id boolean primary key default true check (id),
  refreshed_at timestamptz,
  error text
);
insert into private.calendar_state default values;

-- ---------- bookings ----------

create table public.bookings(
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete restrict,
  person_id uuid references public.people(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 160),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or length(phone) <= 40),
  message text not null default '' check (length(message) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  cancelled_by text check (cancelled_by in ('client', 'admin')),
  admin_notes text not null default '' check (length(admin_notes) <= 5000),
  cancel_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  google_event_id text,
  calendar_state text not null default 'pending' check (calendar_state in ('pending', 'synced', 'error')),
  calendar_error text,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (coalesce(email, '') <> '' or coalesce(phone, '') <> ''),
  -- Two live bookings can never overlap, whatever path created them.
  constraint bookings_no_overlap exclude using gist (tstzrange(starts_at, ends_at) with &&) where (status <> 'cancelled')
);
create index bookings_starts_idx on public.bookings(starts_at);

-- ---------- email outbox ----------

create table private.email_outbox(
  id bigint generated always as identity primary key,
  kind text not null,
  recipient text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  next_try_at timestamptz not null default now(),
  attempts integer not null default 0,
  sent_at timestamptz,
  last_error text
);
create index email_outbox_due_idx on private.email_outbox(next_try_at) where sent_at is null;

create function private.queue_email(p_kind text, p_recipient text, p_payload jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into private.email_outbox(kind, recipient, payload)
  select p_kind, p_recipient, p_payload where coalesce(p_recipient, '') <> ''
$$;

create function private.booking_payload(b public.bookings) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'name', b.name, 'email', b.email, 'phone', b.phone, 'message', b.message,
    'service', s.name, 'price_note', s.price_note,
    'starts_at', b.starts_at, 'ends_at', b.ends_at, 'cancel_token', b.cancel_token,
    'cancelled_by', b.cancelled_by)
  from public.services s where s.id = b.service_id
$$;

-- Every change to a booking queues the right emails and marks it for Google Calendar,
-- whether it came from the public page, a cancel link or /admin.
create function private.booking_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
declare notify text := (select notify_email from public.booking_settings);
begin
  if tg_op = 'INSERT' then
    perform private.queue_email('booking_confirmed', new.email, private.booking_payload(new));
    perform private.queue_email('booking_new', notify, private.booking_payload(new));
    return new;
  end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.calendar_state := 'pending';
    perform private.queue_email('booking_cancelled', new.email, private.booking_payload(new));
    if new.cancelled_by = 'client' then
      perform private.queue_email('booking_cancelled_notice', notify, private.booking_payload(new));
    end if;
  elsif new.starts_at <> old.starts_at or new.ends_at <> old.ends_at then
    new.calendar_state := 'pending';
    new.reminder_sent := false;
    perform private.queue_email('booking_moved', new.email, private.booking_payload(new));
  elsif new.status <> old.status then
    new.calendar_state := 'pending';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger bookings_changed_insert after insert on public.bookings
  for each row execute function private.booking_changed();
create trigger bookings_changed_update before update on public.bookings
  for each row execute function private.booking_changed();

-- New Contact-page enquiries also email Kimina.
create function private.enquiry_alert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.source = 'contact' then
    perform private.queue_email('enquiry_alert', (select notify_email from public.booking_settings),
      jsonb_build_object('name', new.name, 'email', new.email, 'phone', new.phone, 'topic', new.topic, 'message', new.message));
  end if;
  return new;
end $$;
create trigger enquiries_alert after insert on public.enquiries
  for each row execute function private.enquiry_alert();

-- ---------- public reading: services and free times ----------

create function public.booking_services()
returns table(slug text, name text, price_note text, session_minutes integer)
language sql stable security definer set search_path = '' as $$
  select slug, name, price_note, session_minutes from public.services where active order by sort_order
$$;

create function public.booking_slots(p_service text, p_from date, p_days integer default 31)
returns table(starts_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  s public.booking_settings;
  svc public.services;
  h public.booking_hours;
  len interval;
  today date := (now() at time zone 'Africa/Nairobi')::date;
  d date;
  last_day date;
  t timestamptz;
begin
  select * into s from public.booking_settings;
  if not found or not s.bookings_open then return; end if;
  select * into svc from public.services where slug = p_service and active;
  if not found then return; end if;
  len := make_interval(mins => svc.session_minutes);
  d := greatest(p_from, today);
  last_day := least(p_from + least(greatest(p_days, 1), 62) - 1, today + s.days_ahead);
  while d <= last_day loop
    select * into h from public.booking_hours where weekday = extract(dow from d);
    if found then
      t := (d + h.opens) at time zone 'Africa/Nairobi';
      while t + len <= (d + h.closes) at time zone 'Africa/Nairobi' loop
        if t >= now() + make_interval(hours => s.min_notice_hours)
          and not exists (select 1 from public.bookings b where b.status <> 'cancelled'
                          and tstzrange(b.starts_at, b.ends_at) && tstzrange(t, t + len))
          and not exists (select 1 from public.booking_blocks k where tstzrange(k.starts_at, k.ends_at) && tstzrange(t, t + len))
          and not exists (select 1 from private.calendar_busy c where tstzrange(c.starts_at, c.ends_at) && tstzrange(t, t + len))
        then
          starts_at := t;
          return next;
        end if;
        t := t + make_interval(mins => s.slot_minutes);
      end loop;
    end if;
    d := d + 1;
  end loop;
end $$;

-- ---------- booking and cancelling (service role only, via the `booking` Edge Function) ----------

create table private.booking_attempts(
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index booking_attempts_idx on private.booking_attempts(ip_hash, created_at desc);

create function public.create_booking(
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

  -- Link to an existing person by email or phone, or add them as a client.
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
    'starts_at', b.starts_at, 'ends_at', b.ends_at, 'emailed', b.email is not null);
end $$;

create function public.booking_by_token(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('service', s.name, 'name', b.name, 'starts_at', b.starts_at, 'ends_at', b.ends_at,
    'status', b.status, 'past', b.starts_at <= now())
  from public.bookings b join public.services s on s.id = b.service_id
  where b.cancel_token = p_token and length(p_token) = 48
$$;

create function public.cancel_booking_by_token(p_token text) returns text
language plpgsql security definer set search_path = '' as $$
declare b public.bookings;
begin
  select * into b from public.bookings where cancel_token = p_token and length(p_token) = 48 for update;
  if not found then return 'not_found'; end if;
  if b.status = 'cancelled' then return 'already'; end if;
  if b.status <> 'confirmed' or b.starts_at <= now() then return 'past'; end if;
  update public.bookings set status = 'cancelled', cancelled_by = 'client' where id = b.id;
  return 'cancelled';
end $$;

-- ---------- worker helpers (service role only) ----------

create function public.worker_check(p_secret text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'worker_secret' and decrypted_secret = p_secret)
$$;

create function public.worker_secret() returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'worker_secret'
$$;

create function public.queue_booking_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare b public.bookings; n integer := 0;
begin
  for b in select * from public.bookings
    where status = 'confirmed' and not reminder_sent
      and starts_at between now() + interval '12 hours' and now() + interval '30 hours'
      and created_at < starts_at - interval '30 hours'
    for update skip locked
  loop
    perform private.queue_email('booking_reminder', b.email, private.booking_payload(b));
    update public.bookings set reminder_sent = true where id = b.id;
    n := n + 1;
  end loop;
  return n;
end $$;

create function public.claim_emails(p_limit integer default 20)
returns table(id bigint, kind text, recipient text, payload jsonb)
language sql security definer set search_path = '' as $$
  update private.email_outbox o set next_try_at = now() + interval '10 minutes', attempts = o.attempts + 1
  where o.id in (select x.id from private.email_outbox x
                 where x.sent_at is null and x.attempts < 6 and x.next_try_at <= now()
                 order by x.id limit p_limit for update skip locked)
  returning o.id, o.kind, o.recipient, o.payload
$$;

create function public.complete_email(p_id bigint, p_error text default null) returns void
language sql security definer set search_path = '' as $$
  update private.email_outbox
  set sent_at = case when p_error is null then now() end,
      last_error = p_error,
      next_try_at = case when p_error is null then next_try_at else now() + make_interval(mins => 10 * attempts * attempts) end
  where id = p_id
$$;

create function public.calendar_jobs()
returns table(id uuid, status text, name text, email text, phone text, message text, service text,
              starts_at timestamptz, ends_at timestamptz, google_event_id text, calendar_id text)
language sql stable security definer set search_path = '' as $$
  select b.id, b.status, b.name, b.email, b.phone, b.message, s.name, b.starts_at, b.ends_at, b.google_event_id,
         (select google_calendar_id from public.booking_settings)
  from public.bookings b join public.services s on s.id = b.service_id
  where b.calendar_state = 'pending' or (b.calendar_state = 'error' and b.updated_at < now() - interval '1 hour')
  order by b.updated_at limit 25
$$;

create function public.calendar_done(p_id uuid, p_event_id text, p_error text default null) returns void
language sql security definer set search_path = '' as $$
  update public.bookings
  set google_event_id = case when p_error is null then p_event_id else google_event_id end,
      calendar_state = case when p_error is null then 'synced' else 'error' end,
      calendar_error = p_error
  where id = p_id
$$;

create function public.set_calendar_busy(p_busy jsonb, p_error text default null) returns void
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

-- What /admin shows about the Google link and the email queue.
create function public.booking_system_status() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'calendar_refreshed_at', (select refreshed_at from private.calendar_state),
    'calendar_error', (select error from private.calendar_state),
    'busy_blocks', (select count(*) from private.calendar_busy where ends_at > now()),
    'emails_waiting', (select count(*) from private.email_outbox where sent_at is null and attempts < 6),
    'emails_failed', (select count(*) from private.email_outbox where sent_at is null and attempts >= 6),
    'last_email_error', (select last_error from private.email_outbox where last_error is not null order by id desc limit 1),
    'last_email_sent', (select max(sent_at) from private.email_outbox));
end $$;

-- ---------- permissions ----------

do $$
declare t text;
begin
  foreach t in array array['booking_settings', 'booking_hours', 'booking_blocks', 'bookings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin', t);
  end loop;
end $$;
revoke all on private.calendar_busy, private.calendar_state, private.email_outbox, private.booking_attempts from public, anon, authenticated;

revoke all on function
  private.queue_email(text, text, jsonb), private.booking_payload(public.bookings), private.booking_changed(),
  private.enquiry_alert()
  from public, anon, authenticated;

revoke all on function public.booking_services(), public.booking_slots(text, date, integer) from public;
grant execute on function public.booking_services(), public.booking_slots(text, date, integer) to anon, authenticated;

revoke all on function
  public.create_booking(text, timestamptz, text, text, text, text, text), public.booking_by_token(text),
  public.cancel_booking_by_token(text), public.worker_check(text), public.worker_secret(),
  public.queue_booking_reminders(), public.claim_emails(integer), public.complete_email(bigint, text),
  public.calendar_jobs(), public.calendar_done(uuid, text, text), public.set_calendar_busy(jsonb, text)
  from public, anon, authenticated;
grant execute on function
  public.create_booking(text, timestamptz, text, text, text, text, text), public.booking_by_token(text),
  public.cancel_booking_by_token(text), public.worker_check(text), public.worker_secret(),
  public.queue_booking_reminders(), public.claim_emails(integer), public.complete_email(bigint, text),
  public.calendar_jobs(), public.calendar_done(uuid, text, text), public.set_calendar_busy(jsonb, text)
  to service_role;

revoke all on function public.booking_system_status() from public, anon;
grant execute on function public.booking_system_status() to authenticated;

-- ---------- the 5-minute worker ----------

select vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'worker_secret', 'Shared by pg_cron and the worker Edge Function');

select cron.schedule('kimina-booking-worker', '*/5 * * * *', $cron$
  select net.http_post(
    url := 'https://akswkkcihswupkunstrj.supabase.co/functions/v1/worker',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-worker-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'worker_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000)
$cron$);
