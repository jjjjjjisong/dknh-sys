# MCEE Press Release Production Deploy Checklist

This checklist is for deploying the MCEE press release feature to the production
Supabase project. Do not enable the cron scheduler in the development project
unless a development schedule is intentionally needed.

## Production Order

1. Confirm the production Supabase project.
   - Use the production dashboard URL:
     `https://supabase.com/dashboard/project/<PRODUCTION_PROJECT_REF>`
   - Do not use the development ref `bhjlordyernwpamguymr`.

2. Link the local Supabase CLI to production.

   ```powershell
   npx supabase link --project-ref <PRODUCTION_PROJECT_REF>
   ```

   Confirm the linked ref:

   ```powershell
   Get-Content supabase\.temp\project-ref
   ```

3. Run production DB SQL in Supabase SQL Editor.
   - Required for a fresh production setup:
     - `project-docs/sql/10_mcee_press_releases.sql`
     - `project-docs/sql/11_mcee_crawl_keywords.sql`
     - `project-docs/sql/15_mcee_press_releases_effective_date.sql`
   - Safe patches if the table already existed or keyword rows are missing:
     - `project-docs/sql/13_mcee_crawl_keywords_schedule_fix.sql`
     - `project-docs/sql/14_mcee_crawl_keywords_seed_fix.sql`

4. Add production Edge Function secrets in the production dashboard.
   - Go to `Edge Functions > Secrets`.
   - Add:
     - `MCEE_CRAWL_SECRET`: production-only long random secret.
     - `MAX_PAGES_PER_KEYWORD`: `1`.
   - Do not manually add `SUPABASE_SERVICE_ROLE_KEY`; Supabase provides it to
     Edge Functions by default.

5. Deploy the Edge Function to production.

   ```powershell
   npx supabase functions deploy crawl-mcee-press-releases --use-api
   ```

6. Run one manual production test before enabling cron.

   ```powershell
   Invoke-RestMethod `
     -Uri "https://<PRODUCTION_PROJECT_REF>.supabase.co/functions/v1/crawl-mcee-press-releases" `
     -Method Post `
     -Headers @{
       "x-crawl-secret" = "<PRODUCTION_MCEE_CRAWL_SECRET>"
       "Content-Type" = "application/json; charset=utf-8"
     } `
     -Body '{"keyword":"PP"}'
   ```

   Expected minimum success shape:

   ```text
   ok : True
   processedKeywordCount : 1
   results : keyword=PP, processed=...
   ```

7. Confirm production data.

   ```sql
   select title, search_keyword, matched_keywords, published_date, source_url
   from public.mcee_press_releases
   order by scraped_at desc
   limit 20;
   ```

8. Enable the production scheduler last.
   - Edit `project-docs/sql/12_mcee_press_release_cron.sql`.
   - Replace:
     - `<PROJECT_URL>` with `https://<PRODUCTION_PROJECT_REF>.supabase.co`
     - `<MCEE_CRAWL_SECRET>` with the production secret value
   - Run the edited SQL in the production Supabase SQL Editor.

## Important Rules

- Do not run `12_mcee_press_release_cron.sql` before the manual production test
  succeeds.
- Do not run the cron SQL in development unless a development schedule is
  intentionally needed.
- The crawler stores text, source URLs, and source download URLs only. It does
  not store raw HTML or file bytes.
- After production work, relink the local CLI back to development if future work
  should target development:

  ```powershell
  npx supabase link --project-ref bhjlordyernwpamguymr
  ```
