-- Add the user-managed effective date field for MCEE press releases.
-- Safe to run after 10_mcee_press_releases.sql.

alter table public.mcee_press_releases
  add column if not exists effective_date date null;

create index if not exists idx_mcee_press_releases_effective_date
  on public.mcee_press_releases (effective_date desc);

do $$
begin
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
