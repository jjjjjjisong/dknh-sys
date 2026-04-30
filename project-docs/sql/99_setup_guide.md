# SQL Setup Guide

Fresh production setup order:

1. `00_extensions.sql`
2. `01_accounts.sql`
3. `02_clients.sql`
4. `03_products.sql`
5. `08_product_masters.sql`
6. `04_documents.sql`
7. `05_order_book.sql`
8. `10_mcee_press_releases.sql`
9. `11_mcee_crawl_keywords.sql`
10. `15_mcee_press_releases_effective_date.sql`
11. `90_policies.sql`

Or run this single file in Supabase SQL Editor:

- `00_full_production_setup.sql`

Product / document relational hardening:

- 신규 환경: `00_full_production_setup.sql` 또는 기본 순서 실행
- 기존 운영 구조 보강: `07_relational_hardening.sql`
- 기존 데이터 `product_id` 백필: `20260413_document_items_product_id_backfill.sql`
- 품목 상위/하위 구조 추가: `08_product_masters.sql`
- 기존 품목을 공통 품목으로 묶기: `20260416_product_masters_backfill.sql`
- 공통 품목 포장수량(1Box/1Pallet) 백필: `20260421_product_masters_dimension_backfill.sql`
- import 후 identity/sequence 정렬: `20260413_identity_sequence_reset.sql`
- 상세 가이드: `product-id-rollout.md`

Notes:

- `document_items.cost_price` migration: `20260420_document_items_cost_price.sql`
- `20260421_product_masters_dimension_backfill.sql` 실행 전에는 같은 공통품목 아래
  하위 품목들의 `ea_per_b`, `box_per_p`, `pallets_per_truck` 값이 충돌하지 않는지
  먼저 확인해야 합니다.
- Old migration and history scripts were moved to `project-docs/sql/sql_history`.
- The files in this folder are the current baseline for a brand-new environment.
- `04_documents.sql` includes `document_items` and the active unique indexes:
  - `uq_documents_active_issue_no`
  - `uq_document_items_active_document_id_seq`
- `01_accounts.sql` inserts a default `admin` account if it does not already exist.
- `10_mcee_press_releases.sql` creates the text-only MCEE press release storage,
  and `11_mcee_crawl_keywords.sql` creates the keyword/crawl-state table.
  See `../mcee-press-releases.md` for the scrape scope, storage rules, and
  development intent.
- `12_mcee_press_release_cron.sql` is not part of the fresh baseline run. Use it
  after the Edge Function is deployed and its placeholders are replaced.
- `13_mcee_crawl_keywords_schedule_fix.sql` is a patch for environments where
  `mcee_crawl_keywords` was created before `scheduled_iso_dow` and
  `scheduled_time` were added. It is safe to run after `11_mcee_crawl_keywords.sql`
  if the crawler reports a missing `scheduled_iso_dow` column.
- `14_mcee_crawl_keywords_seed_fix.sql` is a patch for environments where the
  keyword rows were missing or not updated to the required Korean keyword set.
  It is safe to run after `11_mcee_crawl_keywords.sql`.
- `15_mcee_press_releases_effective_date.sql` adds the user-managed `시행일`
  field and update policy for the press release menu. Run it after
  `10_mcee_press_releases.sql`.
- For production deployment, follow
  `../mcee-press-release-production-deploy.md`. Run the cron SQL only after a
  manual production Edge Function test succeeds.
