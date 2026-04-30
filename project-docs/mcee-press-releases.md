# MCEE Press Releases

## Purpose

The MCEE press release feature stores public press releases from the Ministry of
Climate, Energy and Environment press release board:

- Source page: `https://mcee.go.kr/home/web/index.do?menuId=10598`
- Source board: press releases, `boardMasterId=939`, `menuId=10598`

The feature is intended to show text-only records inside this system, with links
back to the original source and original attachment download URLs. It must not
store original HTML documents or upload attachment files into our database or
storage.

## Scrape Scope

Search the source board with the source site's `title + content` search mode.
The target keywords are:

- `플라스틱`
- `빨대`
- `PP`
- `PS`
- `PET`
- `재활용`
- `폐기물`
- `일회용`
- `1회용`
- `다회용`
- `스틱`
- `컵보증금`

Only records with source registration dates from `2025-01-01` through the
current Korea date should be searched.

The required recurring schedule is:

- Monday 03:00 KST: `플라스틱`, `빨대`
- Tuesday 03:00 KST: `PP`, `PS`
- Wednesday 03:00 KST: `PET`
- Thursday 03:00 KST: `재활용`
- Friday 03:00 KST: `폐기물`
- Saturday 03:00 KST: `일회용`, `1회용`
- Sunday 03:00 KST: `다회용`, `스틱`, `컵보증금`

Initial import may scrape all matching records. Recurring imports should be
small and idempotent because this project uses the Supabase Free plan. Prefer
keyword/page chunks over one long crawl. For example, run one keyword per day or
store cursor state and continue in the next run.

## Storage Rules

Use two tables:

- `public.mcee_press_releases`: stores the press release records users see.
- `public.mcee_crawl_keywords`: stores searchable keywords and each keyword's
  crawl state.

Store only:

- normalized text fields from the source page
- source detail URL
- source attachment download URLs
- scrape metadata

Do not store:

- raw source HTML
- downloaded attachment file bytes
- copied files in Supabase Storage

The source `boardId` is stored in `source_board_id` and must be unique. This is
the main deduplication key across initial imports, recurring imports, and
multiple keyword hits.

Keyword state is intentionally stored in the database, not hard-coded in the
crawler. This lets operators add, disable, or reprioritize keywords without a
code deploy, and lets the crawler resume safely on the Supabase Free plan.

## Column Intent

### `mcee_press_releases`

- `source_board_id`: original MCEE board post id. Use as the unique external id.
- `source_board_master_id`: source board master id. Defaults to `939`.
- `source_menu_id`: source menu id. Defaults to `10598`.
- `title`: press release title shown in our menu.
- `body_text`: cleaned body text only. Do not save raw HTML.
- `department`: source department name.
- `author`: source author/registrant name.
- `published_date`: source publication date.
- `effective_date`: user-managed effective date shown and edited in the press
  release list. This value is not scraped from MCEE.
- `view_count`: source view count when available.
- `source_url`: original detail page URL shown to users.
- `download_links`: JSON array of source attachment links. Each item should
  contain values like `name`, `url`, and optionally `size`.
- `search_keyword`: the keyword query that first found this record, for display
  and simple filtering.
- `matched_keywords`: all target keywords detected in the final title/body text.
- `scraped_at`: last successful scrape/update time.
- `created_at`, `updated_at`, `updated_by`, `del_yn`: local audit and soft
  delete fields following the existing project pattern.

### `mcee_crawl_keywords`

- `keyword`: search keyword sent to the MCEE board's `title + content` search.
- `enabled`: whether scheduled crawls should process this keyword.
- `sort_order`: deterministic processing order for scheduled and manual runs.
- `scheduled_iso_dow`: ISO day of week for the scheduled crawl. Monday is `1`,
  Sunday is `7`.
- `scheduled_time`: intended Korea local run time. The initial schedule uses
  `03:00` for every keyword.
- `initial_done`: whether the initial full import for this keyword is complete.
- `next_pager_offset`: next source-list offset to continue from when a crawl is
  split across multiple invocations.
- `last_run_at`: last time the crawler attempted this keyword.
- `last_success_at`: last successful crawl completion time for this keyword.
- `last_error`: last failure message, if any.
- `created_at`, `updated_at`, `updated_by`, `del_yn`: local audit and soft
  delete fields following the existing project pattern.

Example `download_links` value:

```json
[
  {
    "name": "보도자료.pdf",
    "url": "https://mcee.go.kr/home/file/readDownloadFile2.do?...",
    "size": "512 KB"
  }
]
```

## Implementation Notes

- Normalize detail URLs so session-specific URL fragments are not used as ids.
- Use `source_board_id` for upsert conflict handling.
- When a record is found by multiple keywords, preserve the first
  `search_keyword` unless the product decision changes, and merge
  `matched_keywords`.
- Select crawl keywords from `mcee_crawl_keywords` where `enabled = true` and
  `del_yn = 'N'`, then match `scheduled_iso_dow` to the current Korea day of
  week.
- New keywords should be inserted with `initial_done = false` and
  `next_pager_offset = 0` so the crawler starts a first import automatically.
- Keep crawler requests conservative. Use page size `50` when possible, but
  process a bounded number of pages per function invocation.
- Supabase Edge Functions on the Free plan have a short wall-clock limit, so the
  crawler should be resumable or split by keyword/date.
- The crawler function is stored at
  `supabase/functions/crawl-mcee-press-releases/index.ts`.
- The Supabase Cron template is stored at
  `project-docs/sql/12_mcee_press_release_cron.sql`.
- The production deployment checklist is stored at
  `project-docs/mcee-press-release-production-deploy.md`.
- The Edge Function uses Supabase's built-in default secrets:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Do not set secrets whose names start with `SUPABASE_` through
  `supabase secrets set`; the CLI treats them as reserved default secrets.
- The Edge Function needs these custom secrets:
  - `MCEE_CRAWL_SECRET`: shared secret checked through the `x-crawl-secret`
    request header.
  - `MAX_PAGES_PER_KEYWORD`: optional; defaults to `1` to keep each invocation
    small on the Supabase Free plan.
- Supabase Cron runs in UTC. The provided schedule uses `0 18 * * *`, which is
  03:00 the next day in Korea.
- To manually test one keyword after deploying the function, call the Edge
  Function with a JSON body like `{ "keyword": "플라스틱" }` and the
  `x-crawl-secret` header. Manual keyword calls ignore the day-of-week schedule.

## SQL

The table definition is in:

- `project-docs/sql/10_mcee_press_releases.sql`
- `project-docs/sql/11_mcee_crawl_keywords.sql`
- `project-docs/sql/12_mcee_press_release_cron.sql`
- `project-docs/sql/15_mcee_press_releases_effective_date.sql`

For a new environment, run it after the existing business tables and before
common policies, as listed in:

- `project-docs/sql/99_setup_guide.md`
