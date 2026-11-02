-- Stage 3: Contact-page enquiries.
-- Visitors never touch the tables. The public `enquiry` Edge Function checks the form and
-- calls public.submit_enquiry() with the service-role key; the function itself refuses
-- anyone else. It limits each visitor (by a hashed IP, never the IP itself) to 5 messages
-- an hour, and the whole form to 60 a day, so a spam run cannot flood the records.

alter table public.enquiries
  add column topic text not null default 'general'
    check (topic in ('collaboration','education','live-sound','booking','press','general'));

alter table public.enquiries
  add constraint enquiries_contact_check
    check (source <> 'contact' or coalesce(email,'') <> '' or coalesce(phone,'') <> '');

create table private.enquiry_attempts(
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index enquiry_attempts_idx on private.enquiry_attempts(ip_hash, created_at desc);
revoke all on private.enquiry_attempts from public, anon, authenticated;

create function public.submit_enquiry(
  p_name text, p_email text, p_phone text, p_topic text, p_message text, p_ip_hash text
) returns text
language plpgsql security definer set search_path = '' as $$
declare recent int; today int;
begin
  delete from private.enquiry_attempts where created_at < now() - interval '2 days';
  select count(*) into recent from private.enquiry_attempts
    where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
  select count(*) into today from private.enquiry_attempts where created_at > now() - interval '1 day';
  if recent >= 5 or today >= 60 then return 'limited'; end if;
  insert into private.enquiry_attempts(ip_hash) values (coalesce(p_ip_hash, 'unknown'));
  insert into public.enquiries(name, email, phone, topic, message, source)
    values (left(trim(p_name), 160), nullif(left(trim(p_email), 254), ''), nullif(left(trim(p_phone), 40), ''),
            p_topic, left(trim(p_message), 5000), 'contact');
  return 'ok';
end; $$;
revoke all on function public.submit_enquiry(text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_enquiry(text,text,text,text,text,text) to service_role;
