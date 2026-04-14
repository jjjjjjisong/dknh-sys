-- Run this after importing/copying production data into another environment.
-- It realigns identity/serial sequences with the current max(id) values.

select setval(
  pg_get_serial_sequence('public.clients', 'id'),
  coalesce((select max(id) from public.clients), 0) + 1,
  false
);

select setval(
  pg_get_serial_sequence('public.suppliers', 'id'),
  coalesce((select max(id) from public.suppliers), 0) + 1,
  false
);

select setval(
  pg_get_serial_sequence('public.products', 'id'),
  coalesce((select max(id) from public.products), 0) + 1,
  false
);

select setval(
  pg_get_serial_sequence('public.document_items', 'id'),
  coalesce((select max(id) from public.document_items), 0) + 1,
  false
);

select setval(
  pg_get_serial_sequence('public.approval_events', 'id'),
  coalesce((select max(id) from public.approval_events), 0) + 1,
  false
)
where exists (
  select 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'approval_events'
    and column_name = 'id'
);

select setval(
  pg_get_serial_sequence('public.approval_steps', 'id'),
  coalesce((select max(id) from public.approval_steps), 0) + 1,
  false
)
where exists (
  select 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'approval_steps'
    and column_name = 'id'
);
