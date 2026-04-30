-- Patch existing mcee_crawl_keywords tables that were created before the
-- schedule columns were added. Run this after 11_mcee_crawl_keywords.sql if
-- the Edge Function reports: column mcee_crawl_keywords.scheduled_iso_dow does
-- not exist.

alter table public.mcee_crawl_keywords
  add column if not exists scheduled_iso_dow integer not null default 1;

alter table public.mcee_crawl_keywords
  add column if not exists scheduled_time time not null default '03:00';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'mcee_crawl_keywords_scheduled_iso_dow_check'
  ) then
    alter table public.mcee_crawl_keywords
      add constraint mcee_crawl_keywords_scheduled_iso_dow_check
      check (scheduled_iso_dow between 1 and 7);
  end if;
end
$$;

create index if not exists idx_mcee_crawl_keywords_schedule
  on public.mcee_crawl_keywords (scheduled_iso_dow, scheduled_time, enabled);

update public.mcee_crawl_keywords
   set scheduled_iso_dow = schedule.scheduled_iso_dow,
       scheduled_time = '03:00',
       sort_order = schedule.sort_order,
       updated_at = now(),
       updated_by = 'migration-13'
  from (
    values
      ('플라스틱', 10, 1),
      ('빨대', 20, 1),
      ('PP', 30, 2),
      ('PS', 40, 2),
      ('PET', 50, 3),
      ('재활용', 60, 4),
      ('폐기물', 70, 5),
      ('일회용', 80, 6),
      ('1회용', 90, 6),
      ('다회용', 100, 7),
      ('스틱', 110, 7),
      ('컵보증금', 120, 7)
  ) as schedule(keyword, sort_order, scheduled_iso_dow)
 where public.mcee_crawl_keywords.keyword = schedule.keyword;
