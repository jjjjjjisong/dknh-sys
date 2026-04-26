import type { DocumentHistory, DocumentHistoryItem } from '../../types/document';
import type { Product } from '../../types/product';
import type { DailySalesRow, DailySalesSummary } from './types';

type DailySalesRowSeed = {
  key: string;
  clientId: string | null;
  clientName: string;
  productId: string | null;
  productName: string;
  receiver: string;
  costPrice: number;
  sellPrice: number;
};

const unknownClientLabel = '미지정';
const unknownReceiverLabel = '-';

export function buildDailySalesRows(params: {
  yearMonth: string;
  products: Product[];
  documents: DocumentHistory[];
  notes: Record<string, string>;
}): DailySalesRow[] {
  const daysInMonth = getDaysInMonth(params.yearMonth);
  const previousYearMonth = getPreviousYearMonth(params.yearMonth);
  const rows = new Map<string, DailySalesRow>();

  params.products
    .filter((product) => product.delYn !== 'Y')
    .forEach((product) => {
      const seed = getProductSeed(product);
      rows.set(seed.key, createDailySalesRow(seed, daysInMonth, params.notes[seed.key] ?? ''));
    });

  params.documents.forEach((document) => {
    if (document.status === 'ST01') return;

    document.items.forEach((item) => {
      const baseDate = getItemBaseDate(document, item);
      if (!baseDate) return;

      const itemYearMonth = baseDate.slice(0, 7);
      if (itemYearMonth !== params.yearMonth && itemYearMonth !== previousYearMonth) return;

      const seed = getDocumentItemSeed(document, item, params.products);
      const row =
        rows.get(seed.key) ??
        createDailySalesRow(seed, daysInMonth, params.notes[seed.key] ?? '');

      if (!rows.has(seed.key)) {
        rows.set(seed.key, row);
      }

      const qty = Number(item.qty || 0);
      if (itemYearMonth === previousYearMonth) {
        if (qty < 0) row.carryoverQty += qty;
        return;
      }

      const dayIndex = Number(baseDate.slice(8, 10)) - 1;
      if (dayIndex >= 0 && dayIndex < row.dailyQty.length) {
        const costPrice = Number(item.costPrice ?? row.costPrice ?? 0);
        const sellPrice = Number(item.unitPrice ?? row.sellPrice ?? 0);
        row.dailyQty[dayIndex] += qty;
        row.costAmount += costPrice * qty;
        row.sellAmount += sellPrice * qty;
      }
    });
  });

  return Array.from(rows.values()).sort((left, right) => {
    const clientOrder = left.clientName.localeCompare(right.clientName, 'ko');
    if (clientOrder !== 0) return clientOrder;
    const productOrder = left.productName.localeCompare(right.productName, 'ko');
    if (productOrder !== 0) return productOrder;
    return left.receiver.localeCompare(right.receiver, 'ko');
  });
}

export function summarizeDailySales(rows: DailySalesRow[]): DailySalesSummary {
  return rows.reduce(
    (summary, row) => {
      const monthlyQty = getMonthlyQty(row);
      summary.rowCount += 1;
      summary.monthlyQty += monthlyQty;
      summary.costAmount += row.costAmount;
      summary.sellAmount += row.sellAmount;
      return summary;
    },
    { rowCount: 0, monthlyQty: 0, costAmount: 0, sellAmount: 0 },
  );
}

export function getMonthlyQty(row: DailySalesRow) {
  return row.dailyQty.reduce((sum, qty) => sum + qty, 0);
}

export function getWeightedCostPrice(row: DailySalesRow) {
  const monthlyQty = getMonthlyQty(row);
  return monthlyQty === 0 ? row.costPrice : row.costAmount / monthlyQty;
}

export function getWeightedSellPrice(row: DailySalesRow) {
  const monthlyQty = getMonthlyQty(row);
  return monthlyQty === 0 ? row.sellPrice : row.sellAmount / monthlyQty;
}

export function getDaysInMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

export function getYearMonthOptions(documents: DocumentHistory[]) {
  const values = new Set<string>();

  documents.forEach((document) => {
    if (document.status === 'ST01') return;

    document.items.forEach((item) => {
      const baseDate = getItemBaseDate(document, item);
      if (baseDate) values.add(baseDate.slice(0, 7));
    });
  });

  const today = new Date();
  values.add(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);

  return Array.from(values).sort((left, right) => right.localeCompare(left));
}

export function formatYearMonthLabel(value: string) {
  const [year, month] = value.split('-');
  return `${year}년 ${Number(month)}월`;
}

function createDailySalesRow(
  seed: DailySalesRowSeed,
  daysInMonth: number,
  note: string,
): DailySalesRow {
  return {
    ...seed,
    costAmount: 0,
    sellAmount: 0,
    carryoverQty: 0,
    dailyQty: Array.from({ length: daysInMonth }, () => 0),
    note,
  };
}

function getProductSeed(product: Product): DailySalesRowSeed {
  return {
    key: getRowKey({
      clientId: product.clientId,
      clientName: product.client,
      productId: product.id,
      productName: product.name1,
      receiver: product.receiver,
    }),
    clientId: product.clientId,
    clientName: product.client.trim() || unknownClientLabel,
    productId: product.id,
    productName: product.name1.trim() || '-',
    receiver: product.receiver.trim() || unknownReceiverLabel,
    costPrice: Number(product.cost_price || 0),
    sellPrice: Number(product.sell_price || 0),
  };
}

function getDocumentItemSeed(
  document: DocumentHistory,
  item: DocumentHistoryItem,
  products: Product[],
): DailySalesRowSeed {
  const product = item.productId
    ? products.find((candidate) => candidate.id === item.productId) ?? null
    : null;
  const clientName = product?.client || document.client || unknownClientLabel;
  const receiver = product?.receiver || document.receiver || unknownReceiverLabel;
  const productName = product?.name1 || item.name1 || '-';

  return {
    key: getRowKey({
      clientId: product?.clientId ?? document.clientId,
      clientName,
      productId: item.productId,
      productName,
      receiver,
    }),
    clientId: product?.clientId ?? document.clientId,
    clientName: clientName.trim() || unknownClientLabel,
    productId: item.productId,
    productName: productName.trim() || '-',
    receiver: receiver.trim() || unknownReceiverLabel,
    costPrice: Number(product?.cost_price ?? item.costPrice ?? 0),
    sellPrice: Number(product?.sell_price ?? item.unitPrice ?? 0),
  };
}

function getRowKey(params: {
  clientId: string | null;
  clientName: string;
  productId: string | null;
  productName: string;
  receiver: string;
}) {
  const clientPart = params.clientId ? `client:${params.clientId}` : `client-name:${normalizeKeyPart(params.clientName)}`;
  const productPart = params.productId
    ? `product:${params.productId}`
    : `product-name:${normalizeKeyPart(params.productName)}`;
  return `${clientPart}|${productPart}|receiver:${normalizeKeyPart(params.receiver)}`;
}

function normalizeKeyPart(value: string) {
  return value.trim().toLowerCase() || '-';
}

function getPreviousYearMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getItemBaseDate(document: DocumentHistory, item: DocumentHistoryItem) {
  return item.arriveDate || document.arriveDate || item.orderDate || document.orderDate || null;
}
