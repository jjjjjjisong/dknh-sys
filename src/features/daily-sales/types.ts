export type DailySalesNoteKey = {
  yearMonth: string;
  rowKey: string;
};

export type DailySalesRow = {
  key: string;
  clientId: string | null;
  clientName: string;
  productId: string | null;
  productName: string;
  receiver: string;
  costPrice: number;
  sellPrice: number;
  costAmount: number;
  sellAmount: number;
  carryoverQty: number;
  dailyQty: number[];
  note: string;
};

export type DailySalesSummary = {
  rowCount: number;
  monthlyQty: number;
  costAmount: number;
  sellAmount: number;
};
