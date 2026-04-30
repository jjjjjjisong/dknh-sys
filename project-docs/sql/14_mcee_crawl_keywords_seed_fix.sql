-- Ensure the required MCEE crawl keywords exist with the agreed weekly
-- schedule. Safe to run after 11_mcee_crawl_keywords.sql and
-- 13_mcee_crawl_keywords_schedule_fix.sql.

insert into public.mcee_crawl_keywords (
  keyword,
  enabled,
  sort_order,
  scheduled_iso_dow,
  scheduled_time,
  initial_done,
  next_pager_offset,
  del_yn,
  updated_at,
  updated_by
)
values
  ('플라스틱', true, 10, 1, '03:00', false, 0, 'N', now(), 'migration-14'),
  ('빨대', true, 20, 1, '03:00', false, 0, 'N', now(), 'migration-14'),
  ('PP', true, 30, 2, '03:00', false, 0, 'N', now(), 'migration-14'),
  ('PS', true, 40, 2, '03:00', false, 0, 'N', now(), 'migration-14'),
  ('PET', true, 50, 3, '03:00', false, 0, 'N', now(), 'migration-14'),
  ('재활용', true, 60, 4, '03:00', false, 0, 'N', now(), 'migration-14'),
  ('폐기물', true, 70, 5, '03:00', false, 0, 'N', now(), 'migration-14'),
  ('일회용', true, 80, 6, '03:00', false, 0, 'N', now(), 'migration-14'),
  ('1회용', true, 90, 6, '03:00', false, 0, 'N', now(), 'migration-14'),
  ('다회용', true, 100, 7, '03:00', false, 0, 'N', now(), 'migration-14'),
  ('스틱', true, 110, 7, '03:00', false, 0, 'N', now(), 'migration-14'),
  ('컵보증금', true, 120, 7, '03:00', false, 0, 'N', now(), 'migration-14')
on conflict (keyword) where del_yn = 'N'
do update set
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  scheduled_iso_dow = excluded.scheduled_iso_dow,
  scheduled_time = excluded.scheduled_time,
  updated_at = excluded.updated_at,
  updated_by = excluded.updated_by;
