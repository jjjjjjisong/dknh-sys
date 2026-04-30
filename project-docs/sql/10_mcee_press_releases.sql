create table if not exists public.mcee_press_releases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_board_id text not null,
  source_board_master_id text not null default '939',
  source_menu_id text not null default '10598',
  title text not null,
  body_text text not null default '',
  department text not null default '',
  author text not null default '',
  published_date date null,
  effective_date date null,
  view_count integer null,
  source_url text not null,
  download_links jsonb not null default '[]'::jsonb,
  search_keyword text not null default '',
  matched_keywords text[] not null default array[]::text[],
  scraped_at timestamptz not null default now(),
  del_yn text not null default 'N',
  updated_by text not null default ''
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'mcee_press_releases_del_yn_check'
  ) then
    alter table public.mcee_press_releases
      add constraint mcee_press_releases_del_yn_check
      check (del_yn in ('Y', 'N'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'mcee_press_releases_download_links_array_check'
  ) then
    alter table public.mcee_press_releases
      add constraint mcee_press_releases_download_links_array_check
      check (jsonb_typeof(download_links) = 'array');
  end if;
end
$$;

create unique index if not exists uq_mcee_press_releases_source_board_id
  on public.mcee_press_releases (source_board_id);

create index if not exists idx_mcee_press_releases_published_date
  on public.mcee_press_releases (published_date desc);
create index if not exists idx_mcee_press_releases_effective_date
  on public.mcee_press_releases (effective_date desc);
create index if not exists idx_mcee_press_releases_title
  on public.mcee_press_releases (title);
create index if not exists idx_mcee_press_releases_search_keyword
  on public.mcee_press_releases (search_keyword);
create index if not exists idx_mcee_press_releases_matched_keywords
  on public.mcee_press_releases using gin (matched_keywords);
create index if not exists idx_mcee_press_releases_del_yn
  on public.mcee_press_releases (del_yn);
create index if not exists idx_mcee_press_releases_scraped_at
  on public.mcee_press_releases (scraped_at desc);
create index if not exists idx_mcee_press_releases_updated_at
  on public.mcee_press_releases (updated_at desc);

alter table public.mcee_press_releases enable row level security;

do $$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'mcee_press_releases'
       and policyname = 'mcee_press_releases_select_anon'
  ) then
    create policy mcee_press_releases_select_anon
      on public.mcee_press_releases
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'mcee_press_releases'
       and policyname = 'mcee_press_releases_update_anon'
  ) then
    create policy mcee_press_releases_update_anon
      on public.mcee_press_releases
      for update
      to anon
      using (true)
      with check (true);
  end if;
end
$$;
