# 월마감 비고 컬럼 반영 안내

## 목적
- `월마감` 화면의 비고를 발행이력 비고(`invoice_note`)와 분리해서 저장
- 저장 위치: `document_items.monthly_closing_note`

## 운영 반영 전 확인
- 운영 DB에 `document_items` 테이블이 존재하는지 확인
- 동일 이름의 컬럼 `monthly_closing_note`가 이미 있는지 확인
- 앱 배포 전에 컬럼 추가 SQL을 먼저 반영

## 반영 SQL
```sql
alter table public.document_items
add column if not exists monthly_closing_note text not null default '';
```

운영 반영용 SQL 파일:
- [add_monthly_closing_note_to_document_items.sql](C:/sjji/dknh-sys/sql/add_monthly_closing_note_to_document_items.sql)

파일 내용:
```sql
alter table public.document_items
add column if not exists monthly_closing_note text not null default '';

comment on column public.document_items.monthly_closing_note
is '월마감 화면 전용 비고';
```

## 선택 확인 SQL
```sql
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'document_items'
  and column_name = 'monthly_closing_note';
```

## 배포 후 동작 체크
1. 월마감 화면에서 비고란이 기본적으로 빈칸인지 확인
2. 비고 입력 후 `Enter` 저장이 되는지 확인
3. 새로고침 후 입력한 비고가 그대로 보이는지 확인
4. 발행이력 화면의 비고와 월마감 비고가 서로 섞이지 않는지 확인

## 참고
- 기존 `invoice_note` 데이터는 그대로 유지됩니다.
- 월마감 화면은 이제 `monthly_closing_note`만 읽고 저장합니다.
