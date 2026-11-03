-- Stage 5: student materials by private link (user's choice, 2026-11-03: no sign-in, no email codes).
-- Kimina makes a student page in /admin, gives it files (private Storage bucket) and links, writes a
-- note, and sends the page's secret link (kimina.co.ke/learn.html#<token>). Anyone with the link sees
-- that page; switching it off ends access. Only the `learn` Edge Function (service role) reads pages
-- for students, and it hands out short-lived download links one file at a time.

create table public.student_pages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  person_id uuid references public.people(id) on delete set null,
  note text not null default '' check (char_length(note) <= 4000),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  active boolean not null default true,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 1000),
  kind text not null check (kind in ('file', 'link')),
  url text check (url is null or (url ~ '^https://' and char_length(url) <= 2000)),
  storage_path text check (storage_path is null or char_length(storage_path) <= 500),
  file_name text check (file_name is null or char_length(file_name) <= 255),
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  for_all boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint materials_kind_fields check (
    (kind = 'file' and storage_path is not null and url is null) or
    (kind = 'link' and url is not null and storage_path is null))
);

create table public.material_pages (
  material_id uuid not null references public.materials(id) on delete cascade,
  page_id uuid not null references public.student_pages(id) on delete cascade,
  primary key (material_id, page_id)
);
create index material_pages_page on public.material_pages(page_id);

create trigger student_pages_touch before update on public.student_pages for each row execute function private.touch();
create trigger materials_touch before update on public.materials for each row execute function private.touch();

do $$
declare t text;
begin
  foreach t in array array['student_pages', 'materials', 'material_pages'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin', t);
  end loop;
end $$;

-- Private bucket, 50 MB per file (the free plan's upload limit). Admins upload, list and delete;
-- students never touch Storage directly.
insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy materials_admin on storage.objects for all to authenticated
  using (bucket_id = 'materials' and public.is_admin())
  with check (bucket_id = 'materials' and public.is_admin());

-- What a student page shows. Null when the link is unknown or switched off.
create function public.student_page(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  page public.student_pages;
begin
  if p_token !~ '^[0-9a-f]{48}$' then return null; end if;
  select * into page from public.student_pages where token = p_token and active;
  if not found then return null; end if;
  update public.student_pages set last_opened_at = now() where id = page.id;
  return jsonb_build_object(
    'name', page.name,
    'note', page.note,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', m.id, 'title', m.title, 'description', m.description, 'kind', m.kind,
          'url', m.url, 'file_name', m.file_name, 'size_bytes', m.size_bytes, 'added', m.created_at)
        order by m.created_at desc)
      from public.materials m
      where m.for_all or exists (select 1 from public.material_pages mp where mp.material_id = m.id and mp.page_id = page.id)
    ), '[]'::jsonb));
end $$;

-- The Storage path of one file, only if that page may have it.
create function public.student_file(p_token text, p_material uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('path', m.storage_path, 'file_name', m.file_name)
  from public.student_pages p
  join public.materials m on m.kind = 'file'
  where p.token = p_token and p.active and m.id = p_material
    and (m.for_all or exists (select 1 from public.material_pages mp where mp.material_id = m.id and mp.page_id = p.id))
$$;

revoke all on function public.student_page(text), public.student_file(text, uuid) from public, anon, authenticated;
grant execute on function public.student_page(text), public.student_file(text, uuid) to service_role;
