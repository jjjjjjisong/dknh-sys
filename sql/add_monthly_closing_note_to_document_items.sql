alter table public.document_items
add column if not exists monthly_closing_note text not null default '';

comment on column public.document_items.monthly_closing_note
is '월마감 화면 전용 비고';
