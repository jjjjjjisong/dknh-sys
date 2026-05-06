alter table public.document_items
  add column if not exists status text not null default 'ST00';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'document_items_status_check'
  ) then
    alter table public.document_items
      add constraint document_items_status_check
      check (status in ('ST00', 'ST01'));
  end if;
end $$;

create index if not exists idx_document_items_status
  on public.document_items (status);

comment on column public.document_items.status
is '품목 상태. ST00 = 정상, ST01 = 품목 거래취소';
