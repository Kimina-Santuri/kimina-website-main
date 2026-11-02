begin;
-- Stage 1 of the Kimina Supabase project: admin-only sign-in and the records behind
-- /admin (people, enquiries, lessons, invoices, payments) plus the services list the
-- calendar will use later. Only accounts listed in private.admins can read or write
-- anything; visitors (anon) and any other signed-in account get nothing.

create schema if not exists private;
revoke all on schema private from public,anon,authenticated;

create table private.admins(user_id uuid primary key references auth.users(id) on delete cascade);
revoke all on private.admins from public,anon,authenticated;

create function public.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from private.admins where user_id=auth.uid())
$$;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated;

create function private.touch() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at:=now(); return new; end; $$;

-- The seven Bookings services, in the order the page shows them.
create table public.services(
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check(slug ~ '^[a-z0-9-]+$'),
  name text not null check(length(trim(name)) between 1 and 120),
  price_note text not null default '',
  price_kes numeric(12,2) check(price_kes>=0),
  minutes integer check(minutes>0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One list of people: a student can also be a client.
create table public.people(
  id uuid primary key default gen_random_uuid(),
  full_name text not null check(length(trim(full_name)) between 1 and 160),
  email text check(email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check(phone is null or length(phone)<=40),
  is_client boolean not null default false,
  is_student boolean not null default false,
  notes text not null default '' check(length(notes)<=5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index people_name_idx on public.people(lower(full_name));

create table public.enquiries(
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people(id) on delete set null,
  name text not null check(length(trim(name)) between 1 and 160),
  email text,
  phone text,
  service_id uuid references public.services(id) on delete set null,
  message text not null default '' check(length(message)<=5000),
  preferred_date date,
  source text not null default 'manual' check(source in ('contact','bookings','manual')),
  status text not null default 'new' check(status in ('new','replied','quoted','booked','closed')),
  notes text not null default '' check(length(notes)<=5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index enquiries_status_idx on public.enquiries(status,created_at desc);

create table public.lessons(
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check(slug ~ '^[a-z0-9-]+$'),
  title text not null check(length(trim(title)) between 1 and 160),
  url text not null default '',
  created_at timestamptz not null default now()
);

create table public.student_lessons(
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  status text not null default 'planned' check(status in ('planned','in_progress','done')),
  started_on date,
  finished_on date,
  notes text not null default '' check(length(notes)<=5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(person_id,lesson_id)
);

-- Invoices get a readable number such as K-2026-001.
create sequence private.invoice_number;
create table public.invoices(
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  person_id uuid not null references public.people(id) on delete restrict,
  service_id uuid references public.services(id) on delete set null,
  description text not null check(length(trim(description)) between 1 and 500),
  amount numeric(12,2) not null check(amount>0),
  issued_on date not null default (now() at time zone 'Africa/Nairobi')::date,
  due_on date,
  status text not null default 'open' check(status in ('open','void')),
  notes text not null default '' check(length(notes)<=5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create function private.invoice_number() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.number is null or new.number='' then
    new.number:='K-'||extract(year from new.issued_on)::int||'-'||lpad(nextval('private.invoice_number')::text,3,'0');
  end if;
  return new;
end; $$;
create trigger invoices_number before insert on public.invoices for each row execute function private.invoice_number();

create table public.payments(
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete restrict,
  invoice_id uuid references public.invoices(id) on delete restrict,
  amount numeric(12,2) not null check(amount>0),
  method text not null default 'mpesa' check(method in ('mpesa','cash','bank','card','other')),
  reference text not null default '' check(length(reference)<=80),
  paid_on date not null default (now() at time zone 'Africa/Nairobi')::date,
  notes text not null default '' check(length(notes)<=2000),
  created_at timestamptz not null default now()
);
create index payments_invoice_idx on public.payments(invoice_id);

-- A payment must belong to the same person as its invoice, and must not overpay it.
create function private.check_payment() returns trigger language plpgsql security definer set search_path='' as $$
declare i public.invoices; paid numeric;
begin
  if new.invoice_id is null then return new; end if;
  select * into i from public.invoices where id=new.invoice_id for update;
  if i.status='void' then raise exception 'That invoice is void'; end if;
  if i.person_id<>new.person_id then raise exception 'The payment and the invoice must be for the same person'; end if;
  select coalesce(sum(amount),0) into paid from public.payments where invoice_id=new.invoice_id and id<>new.id;
  if paid+new.amount>i.amount then raise exception 'Payment is more than the % KES still owed',i.amount-paid; end if;
  return new;
end; $$;
create trigger payments_check before insert or update on public.payments for each row execute function private.check_payment();

create view public.invoice_balances with (security_invoker=true) as
  select i.id,i.number,i.person_id,i.description,i.amount,i.issued_on,i.due_on,i.status,
    coalesce(sum(p.amount),0)::numeric(12,2) as paid,
    case when i.status='void' then 0 else i.amount-coalesce(sum(p.amount),0) end::numeric(12,2) as outstanding
  from public.invoices i left join public.payments p on p.invoice_id=i.id
  group by i.id;

do $$
declare t text;
begin
  foreach t in array array['services','people','enquiries','student_lessons','invoices'] loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function private.touch()',t,t);
  end loop;
  foreach t in array array['services','people','enquiries','lessons','student_lessons','invoices','payments'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',t||'_admin',t);
  end loop;
end $$;
revoke all on public.invoice_balances from public,anon,authenticated;
grant select on public.invoice_balances to authenticated;
revoke all on function private.touch(),private.invoice_number(),private.check_payment() from public,anon,authenticated;

insert into public.services(slug,name,price_note,price_kes,minutes,sort_order) values
  ('production-tutoring','Music Production Tutoring','15 Hours. In Person. 40,000 KES',40000,900,1),
  ('dj-tutoring','DJ Tutoring','15 Hours. In Person. 40,000 KES',40000,900,2),
  ('production-session','Production Session','In studio. From 1,000 KES per hour',1000,60,3),
  ('mixing-mastering','Mixing & Mastering','From 5,000 KES',5000,null,4),
  ('recording','Recording Services','In studio. From 1,000 KES per hour',1000,60,5),
  ('sound-tech','Sound Tech & Live Engineer','From 5,000 KES',5000,null,6),
  ('consultation','General Consultation','From 1,000 KES',1000,null,7);

insert into public.lessons(slug,title,url) values
  ('five-beats','Five Beats (SEMA)','https://kimina.co.ke/lessons/five-beats/'),
  ('santuri-dna','Lesson 12: Santuri DNA','https://kimina.co.ke/lessons/santuri-dna/');

commit;

-- After running this: sign in once at kimina.co.ke/admin (or create your user in
-- Authentication → Users), then make yourself the admin in the SQL editor:
--   insert into private.admins select id from auth.users where email='kimina@santuri.org';
