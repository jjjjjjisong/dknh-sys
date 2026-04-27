import { getActiveAuditFields, getDeletedAuditFields } from './audit';
import { fetchProducts } from './products';
import { getSupabaseClient } from './supabase/client';
import type {
  InventoryManagedProduct,
  InventoryPageData,
  InventoryShipment,
  InventoryWeeklyRecord,
  InventoryWeeklyRecordInput,
} from '../types/inventory';
import { toNullableDbId } from '../utils/dbIds';

type InventoryManagedProductRow = {
  id: number | string;
  product_id: number | string;
  receiver: string | null;
  display_order: number | null;
  del_yn: 'Y' | 'N' | null;
  updated_at: string | null;
  updated_by: string | null;
};

type InventoryWeeklyRecordRow = {
  id: number | string;
  product_id: number | string;
  week_start_date: string;
  available_box_override: number | null;
  proper_stock_box: number | null;
  production_date_note: string | null;
  production_plan_note: string | null;
  del_yn: 'Y' | 'N' | null;
  updated_at: string | null;
  updated_by: string | null;
};

type InventoryOrderBookRow = {
  id: string;
  product_id: number | string | null;
  doc_id: string | null;
  deadline: string | null;
  client: string | null;
  qty: number | null;
};

type InventoryDocumentRow = {
  id: string;
  receiver: string | null;
};

const managedSelectColumns =
  'id, product_id, receiver, display_order, del_yn, updated_at, updated_by';

const weeklySelectColumns =
  'id, product_id, week_start_date, available_box_override, proper_stock_box, production_date_note, production_plan_note, del_yn, updated_at, updated_by';

export async function fetchInventoryPageData(receiver: string): Promise<InventoryPageData> {
  const [products, managedProducts] = await Promise.all([
    fetchProducts(),
    fetchInventoryManagedProducts(receiver),
  ]);

  return { products, managedProducts };
}

export async function fetchInventoryManagedProductsByReceivers(receivers: string[]): Promise<InventoryManagedProduct[]> {
  if (receivers.length === 0) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('inventory_managed_products')
    .select(managedSelectColumns)
    .in('receiver', receivers)
    .order('receiver', { ascending: true })
    .order('display_order', { ascending: true })
    .order('id', { ascending: false });

  if (error) throw toReadableError(error);
  return (data ?? []).map((row: InventoryManagedProductRow) => mapManagedProductRow(row));
}

export async function fetchInventoryManagedProducts(receiver: string): Promise<InventoryManagedProduct[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('inventory_managed_products')
    .select(managedSelectColumns)
    .eq('del_yn', 'N')
    .eq('receiver', receiver)
    .order('display_order', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw toReadableError(error);
  return (data ?? []).map((row: InventoryManagedProductRow) => mapManagedProductRow(row));
}

export async function addInventoryManagedProduct(productId: string, receiver: string, displayOrder: number) {
  const supabase = getSupabaseClient();
  const normalizedProductId = toNullableDbId(productId);
  if (normalizedProductId === null) throw new Error('품목을 선택해 주세요.');

  const { data: existing, error: existingError } = await supabase
    .from('inventory_managed_products')
    .select(managedSelectColumns)
    .eq('product_id', normalizedProductId)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw toReadableError(existingError);

  if (existing) {
    const { data, error } = await supabase
      .from('inventory_managed_products')
      .update({
        receiver,
        display_order: displayOrder,
        ...getActiveAuditFields(),
      })
      .eq('id', existing.id)
      .select(managedSelectColumns)
      .single();

    if (error || !data) throw toReadableError(error);
    return mapManagedProductRow(data as InventoryManagedProductRow);
  }

  const { data, error } = await supabase
    .from('inventory_managed_products')
    .insert({
      product_id: normalizedProductId,
      receiver,
      display_order: displayOrder,
      ...getActiveAuditFields(),
    })
    .select(managedSelectColumns)
    .single();

  if (error || !data) throw toReadableError(error);
  return mapManagedProductRow(data as InventoryManagedProductRow);
}

export async function removeInventoryManagedProduct(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('inventory_managed_products')
    .update(getDeletedAuditFields())
    .eq('id', id);

  if (error) throw toReadableError(error);
}

export async function fetchInventoryWeeklyRecords(
  productIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<InventoryWeeklyRecord[]> {
  if (productIds.length === 0) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('inventory_weekly_records')
    .select(weeklySelectColumns)
    .eq('del_yn', 'N')
    .in('product_id', productIds)
    .gte('week_start_date', dateFrom)
    .lte('week_start_date', dateTo);

  if (error) throw toReadableError(error);
  return (data ?? []).map((row: InventoryWeeklyRecordRow) => mapWeeklyRecordRow(row));
}

export async function saveInventoryWeeklyRecord(input: InventoryWeeklyRecordInput) {
  const supabase = getSupabaseClient();
  const productId = toNullableDbId(input.productId);
  if (productId === null) throw new Error('품목을 선택해 주세요.');

  const payload = {
    product_id: productId,
    week_start_date: input.weekStartDate,
    available_box_override: input.availableBoxOverride,
    proper_stock_box: input.properStockBox,
    production_date_note: input.productionDateNote.trim(),
    production_plan_note: input.productionPlanNote.trim(),
    ...getActiveAuditFields(),
  };

  const { data: existing, error: existingError } = await supabase
    .from('inventory_weekly_records')
    .select('id')
    .eq('product_id', productId)
    .eq('week_start_date', input.weekStartDate)
    .eq('del_yn', 'N')
    .maybeSingle();

  if (existingError) throw toReadableError(existingError);

  const query = existing
    ? supabase.from('inventory_weekly_records').update(payload).eq('id', existing.id)
    : supabase.from('inventory_weekly_records').insert(payload);

  const { data, error } = await query.select(weeklySelectColumns).single();
  if (error || !data) throw toReadableError(error);
  return mapWeeklyRecordRow(data as InventoryWeeklyRecordRow);
}

export async function fetchInventoryShipments(
  productIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<InventoryShipment[]> {
  if (productIds.length === 0) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('order_book')
    .select('id, product_id, doc_id, deadline, client, qty')
    .eq('del_yn', 'N')
    .neq('status', 'ST01')
    .in('product_id', productIds)
    .gte('deadline', dateFrom)
    .lte('deadline', dateTo);

  if (error) throw toReadableError(error);

  const rows = (data ?? []) as InventoryOrderBookRow[];
  const docIds = Array.from(new Set(rows.map((row) => row.doc_id).filter((value): value is string => Boolean(value))));
  const documentsById = await fetchInventoryDocumentsByIds(docIds);

  return rows
    .filter((row) => row.product_id && row.deadline)
    .map((row) => ({
      id: row.id,
      productId: String(row.product_id),
      deadline: row.deadline ?? '',
      client: row.client ?? '',
      receiver: row.doc_id ? documentsById.get(row.doc_id)?.receiver ?? '' : '',
      qty: row.qty ?? 0,
    }));
}

async function fetchInventoryDocumentsByIds(ids: string[]) {
  const lookup = new Map<string, InventoryDocumentRow>();
  if (ids.length === 0) return lookup;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('documents')
    .select('id, receiver')
    .in('id', ids)
    .eq('del_yn', 'N');

  if (error) throw toReadableError(error);
  for (const row of (data ?? []) as InventoryDocumentRow[]) {
    lookup.set(row.id, row);
  }
  return lookup;
}

function mapManagedProductRow(row: InventoryManagedProductRow): InventoryManagedProduct {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    receiver: row.receiver ?? '',
    displayOrder: row.display_order ?? 0,
    delYn: (row.del_yn ?? 'N') as InventoryManagedProduct['delYn'],
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? '',
  };
}

function mapWeeklyRecordRow(row: InventoryWeeklyRecordRow): InventoryWeeklyRecord {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    weekStartDate: row.week_start_date,
    availableBoxOverride: row.available_box_override ?? null,
    properStockBox: row.proper_stock_box ?? null,
    productionDateNote: row.production_date_note ?? '',
    productionPlanNote: row.production_plan_note ?? '',
    delYn: (row.del_yn ?? 'N') as InventoryWeeklyRecord['delYn'],
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? '',
  };
}

function toReadableError(error: unknown) {
  if (error instanceof Error) return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String(error.message));
  }
  return new Error('재고관리 처리 중 오류가 발생했습니다.');
}
