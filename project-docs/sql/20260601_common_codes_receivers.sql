create table if not exists public.common_codes (
  group_code text not null,
  code text not null,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  del_yn text not null default 'N',
  primary key (group_code, code)
);

alter table public.documents
  add column if not exists receiver_code text null;

alter table public.products
  add column if not exists receiver_code text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'common_codes_del_yn_check'
  ) then
    alter table public.common_codes
      add constraint common_codes_del_yn_check
      check (del_yn in ('Y', 'N'));
  end if;
end
$$;

create unique index if not exists uq_common_codes_active_label
  on public.common_codes (group_code, lower(trim(label)))
  where del_yn = 'N';

create index if not exists idx_common_codes_group_active
  on public.common_codes (group_code, active, del_yn, sort_order, code);

create index if not exists idx_documents_receiver_code
  on public.documents (receiver_code);

create index if not exists idx_products_receiver_code
  on public.products (receiver_code);

create or replace function public.normalize_receiver_label(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    regexp_replace(lower(trim(coalesce(value, ''))), '^\(?주\)?', ''),
    '\s+',
    '',
    'g'
  );
$$;

with canonical_receivers(code, label, sort_order) as (
  values
    ('RCV0001', '(주)동국프라텍', 1),
    ('RCV0002', '(주)팔도테크팩', 2),
    ('RCV0003', '(주)동일화학공업', 3),
    ('RCV0004', '(주)세인테크', 4),
    ('RCV0005', '(주)대신화학', 5),
    ('RCV0006', '(주)아미', 6),
    ('RCV0007', '(주)제이씨팩', 7),
    ('RCV0008', '(주)태방파텍', 8),
    ('RCV0009', '(주)지디알', 9),
    ('RCV0010', '(주)하나팩', 10),
    ('RCV0011', '(주)유성그룹', 11),
    ('RCV0012', '(주)상진', 12),
    ('RCV0013', '(주)토미', 13),
    ('RCV0014', '(주)코라마상사', 14),
    ('RCV0015', '(주)우아디자인', 15),
    ('RCV0016', '(주)이룸페이퍼', 16),
    ('RCV0017', '(주)아이제제', 17),
    ('RCV0018', '(주)아이팩', 18)
)
insert into public.common_codes (
  group_code,
  code,
  label,
  sort_order,
  active,
  note,
  updated_by
)
select
  'RECEIVER',
  code,
  label,
  sort_order,
  true,
  'Seeded from legacy receiver options',
  'migration'
from canonical_receivers
on conflict (group_code, code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  active = true,
  note = excluded.note,
  del_yn = 'N',
  updated_at = now(),
  updated_by = 'migration';

update public.documents document
set receiver_code = code.code
from public.common_codes code
where code.group_code = 'RECEIVER'
  and code.del_yn = 'N'
  and (
    lower(trim(code.label)) = lower(trim(document.receiver))
    or normalize_receiver_label(code.label) = normalize_receiver_label(document.receiver)
  )
  and nullif(trim(document.receiver), '') is not null
  and document.receiver_code is distinct from code.code;

update public.products product
set receiver_code = code.code
from public.common_codes code
where code.group_code = 'RECEIVER'
  and code.del_yn = 'N'
  and (
    lower(trim(code.label)) = lower(trim(product.receiver))
    or normalize_receiver_label(code.label) = normalize_receiver_label(product.receiver)
  )
  and nullif(trim(product.receiver), '') is not null
  and product.receiver_code is distinct from code.code;

alter table public.common_codes enable row level security;

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
  on table public.common_codes
  to anon, authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'common_codes'
      and policyname = 'common_codes_select_anon'
  ) then
    create policy common_codes_select_anon
      on public.common_codes
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'common_codes'
      and policyname = 'common_codes_insert_anon'
  ) then
    create policy common_codes_insert_anon
      on public.common_codes
      for insert
      to anon
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'common_codes'
      and policyname = 'common_codes_update_anon'
  ) then
    create policy common_codes_update_anon
      on public.common_codes
      for update
      to anon
      using (true)
      with check (true);
  end if;
end
$$;

-- Verification queries:
-- select receiver, receiver_code from public.documents where nullif(trim(receiver), '') is not null and receiver_code is null;
-- select receiver, receiver_code from public.products where nullif(trim(receiver), '') is not null and receiver_code is null;
-- select group_code, code, label, active from public.common_codes where group_code = 'RECEIVER' order by sort_order, code;
-- select count(*) from public.common_codes where group_code = 'RECEIVER' and del_yn = 'N'; -- must be 18 before users add more in the screen
