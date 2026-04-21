-- Backfill common product dimensions from linked client-specific products.
--
-- Why:
-- `20260416_product_masters_backfill.sql` links existing `products` rows to
-- `product_masters`, but it does not populate the packaging dimension columns
-- on `product_masters` (`ea_per_b`, `box_per_p`, `ea_per_p`, `pallets_per_truck`).
--
-- Run order:
-- 1. `08_product_masters.sql`
-- 2. `20260416_product_masters_backfill.sql`
-- 3. Verify conflicts with the query below
-- 4. Run this backfill update only after conflict review
--
-- Conflict check:
-- If this query returns rows, the same common product has multiple packaging
-- values across linked `products`. Review those cases before running the update.
--
-- select
--   p.product_master_id,
--   pm.name1,
--   count(distinct p.ea_per_b) as ea_per_b_variants,
--   count(distinct p.box_per_p) as box_per_p_variants,
--   count(distinct p.pallets_per_truck) as truck_variants
-- from public.products p
-- join public.product_masters pm on pm.id = p.product_master_id
-- where p.del_yn = 'N'
--   and pm.del_yn = 'N'
-- group by p.product_master_id, pm.name1
-- having
--   count(distinct p.ea_per_b) > 1
--   or count(distinct p.box_per_p) > 1
--   or count(distinct p.pallets_per_truck) > 1;
--
-- Verification after update:
-- select id, name1, ea_per_b, box_per_p, ea_per_p, pallets_per_truck
-- from public.product_masters
-- where del_yn = 'N'
-- order by name1;

with source as (
  select distinct on (p.product_master_id)
    p.product_master_id as master_id,
    p.ea_per_b,
    p.box_per_p,
    coalesce(
      p.ea_per_p,
      case
        when p.ea_per_b is not null and p.box_per_p is not null
          then p.ea_per_b * p.box_per_p
        else null
      end
    ) as ea_per_p,
    p.pallets_per_truck
  from public.products p
  where p.del_yn = 'N'
    and p.product_master_id is not null
    and (
      p.ea_per_b is not null
      or p.box_per_p is not null
      or p.ea_per_p is not null
      or p.pallets_per_truck is not null
    )
  order by
    p.product_master_id,
    case
      when p.ea_per_b is not null and p.box_per_p is not null then 0
      else 1
    end,
    p.updated_at desc nulls last,
    p.id desc
)
update public.product_masters pm
set
  ea_per_b = source.ea_per_b,
  box_per_p = source.box_per_p,
  ea_per_p = source.ea_per_p,
  pallets_per_truck = source.pallets_per_truck
from source
where pm.id = source.master_id
  and pm.del_yn = 'N';
