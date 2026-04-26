create table if not exists public.daily_sales_notes (
  year_month text not null,
  row_key text not null,
  note text not null default '',
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  primary key (year_month, row_key)
);

alter table public.daily_sales_notes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_sales_notes'
      and policyname = 'daily_sales_notes_select_anon'
  ) then
    create policy daily_sales_notes_select_anon
      on public.daily_sales_notes
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_sales_notes'
      and policyname = 'daily_sales_notes_insert_anon'
  ) then
    create policy daily_sales_notes_insert_anon
      on public.daily_sales_notes
      for insert
      to anon
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_sales_notes'
      and policyname = 'daily_sales_notes_update_anon'
  ) then
    create policy daily_sales_notes_update_anon
      on public.daily_sales_notes
      for update
      to anon
      using (true)
      with check (true);
  end if;
end
$$;
