create table if not exists public.mcee_crawl_keywords (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  keyword text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  scheduled_iso_dow integer not null default 1,
  scheduled_time time not null default '03:00',
  initial_done boolean not null default false,
  next_pager_offset integer not null default 0,
  last_run_at timestamptz null,
  last_success_at timestamptz null,
  last_error text not null default '',
  del_yn text not null default 'N',
  updated_by text not null default ''
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'mcee_crawl_keywords_del_yn_check'
  ) then
    alter table public.mcee_crawl_keywords
      add constraint mcee_crawl_keywords_del_yn_check
      check (del_yn in ('Y', 'N'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'mcee_crawl_keywords_scheduled_iso_dow_check'
  ) then
    alter table public.mcee_crawl_keywords
      add constraint mcee_crawl_keywords_scheduled_iso_dow_check
      check (scheduled_iso_dow between 1 and 7);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'mcee_crawl_keywords_next_pager_offset_check'
  ) then
    alter table public.mcee_crawl_keywords
      add constraint mcee_crawl_keywords_next_pager_offset_check
      check (next_pager_offset >= 0);
  end if;
end
$$;

create unique index if not exists uq_mcee_crawl_keywords_keyword
  on public.mcee_crawl_keywords (keyword)
  where del_yn = 'N';

create index if not exists idx_mcee_crawl_keywords_enabled
  on public.mcee_crawl_keywords (enabled);
create index if not exists idx_mcee_crawl_keywords_sort_order
  on public.mcee_crawl_keywords (sort_order, created_at);
create index if not exists idx_mcee_crawl_keywords_schedule
  on public.mcee_crawl_keywords (scheduled_iso_dow, scheduled_time, enabled);
create index if not exists idx_mcee_crawl_keywords_initial_done
  on public.mcee_crawl_keywords (initial_done);
create index if not exists idx_mcee_crawl_keywords_last_run_at
  on public.mcee_crawl_keywords (last_run_at);
create index if not exists idx_mcee_crawl_keywords_del_yn
  on public.mcee_crawl_keywords (del_yn);
create index if not exists idx_mcee_crawl_keywords_updated_at
  on public.mcee_crawl_keywords (updated_at desc);

insert into public.mcee_crawl_keywords (keyword, sort_order, scheduled_iso_dow, scheduled_time)
values
  ('플라스틱', 10, 1, '03:00'),
  ('빨대', 20, 1, '03:00'),
  ('PP', 30, 2, '03:00'),
  ('PS', 40, 2, '03:00'),
  ('PET', 50, 3, '03:00'),
  ('재활용', 60, 4, '03:00'),
  ('폐기물', 70, 5, '03:00'),
  ('일회용', 80, 6, '03:00'),
  ('1회용', 90, 6, '03:00'),
  ('다회용', 100, 7, '03:00'),
  ('스틱', 110, 7, '03:00'),
  ('컵보증금', 120, 7, '03:00')
on conflict do nothing;

alter table public.mcee_crawl_keywords enable row level security;

do $$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'mcee_crawl_keywords'
       and policyname = 'mcee_crawl_keywords_select_anon'
  ) then
    create policy mcee_crawl_keywords_select_anon
      on public.mcee_crawl_keywords
      for select
      to anon
      using (true);
  end if;
end
$$;
