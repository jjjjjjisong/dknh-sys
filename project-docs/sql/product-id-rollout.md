# Product ID SQL Rollout Guide

`product_id` 관련 운영 반영 시에는 아래 기준으로 진행합니다.

## 1. 신규 환경 세팅

브랜드뉴 환경이면 아래 둘 중 하나만 실행하면 됩니다.

- 전체 기준 스크립트: `00_full_production_setup.sql`
- 분리 실행: `00_extensions.sql` -> `01_accounts.sql` -> `02_clients.sql` -> `03_products.sql` -> `04_documents.sql` -> `05_order_book.sql` -> `90_policies.sql`

이 경우 아래 컬럼/인덱스가 기본 포함됩니다.

- `documents.client_id`
- `documents.author_id`
- `document_items.product_id`
- `order_book.client_id`
- `order_book.product_id`
- `order_book.document_item_id`

## 2. 기존 운영 환경에 구조만 추가

운영 DB가 이미 있고, 참조 컬럼/FK/인덱스만 추가하려면 아래를 실행합니다.

- `07_relational_hardening.sql`

이 스크립트는 아래를 보강합니다.

- `documents.client_id`, `documents.author_id`
- `document_items.product_id`
- `order_book.client_id`, `order_book.product_id`, `order_book.document_item_id`
- 관련 FK / check / index

## 3. 기존 데이터 백필

구조 추가 후 기존 문서 품목의 `product_id`를 채우려면 아래를 실행합니다.

- `20260413_document_items_product_id_backfill.sql`

이 스크립트는:

- `document_items.product_id`를 `documents + products` 기준으로 안전하게 백필
- 다중 매칭은 일부러 건너뜀
- 연결된 `order_book.product_id`도 같이 채움

## 4. 실행 권장 순서

기존 운영 환경 기준:

1. `07_relational_hardening.sql`
2. `20260413_document_items_product_id_backfill.sql`
3. `20260413_identity_sequence_reset.sql`
4. 검증 쿼리 실행

## 5. 검증 쿼리

### 구조 확인

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('documents', 'document_items', 'order_book')
  and column_name in ('client_id', 'author_id', 'product_id', 'document_item_id')
order by table_name, column_name;
```

### FK 확인

```sql
select
  conrelid::regclass as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in (
  'public.documents'::regclass,
  'public.document_items'::regclass,
  'public.order_book'::regclass
)
  and contype = 'f'
order by conrelid::regclass::text, conname;
```

### 백필 후 남은 건 확인

```sql
select count(*) as remaining_document_items_without_product_id
from public.document_items
where del_yn = 'N'
  and product_id is null;
```

```sql
select count(*) as remaining_order_book_without_product_id
from public.order_book
where del_yn = 'N'
  and from_doc = true
  and product_id is null;
```

## 6. 주의사항

- `name1` 텍스트는 과거 이력 표시용으로 유지합니다.
- `product_id`는 정합성용 FK입니다.
- 기존 데이터는 100% 자동 매칭을 강제하지 않습니다.
- 운영 데이터 import 후에는 `20260413_identity_sequence_reset.sql` 실행이 사실상 필수입니다.
