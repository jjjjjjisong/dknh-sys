import type { Product } from './product';

export type InventoryManagedProduct = {
  id: string;
  productId: string;
  receiver: string;
  displayOrder: number;
  delYn: 'Y' | 'N';
  updatedAt: string | null;
  updatedBy: string;
};

export type InventoryWeeklyRecord = {
  id: string;
  productId: string;
  weekStartDate: string;
  availableBoxOverride: number | null;
  properStockBox: number | null;
  productionDateNote: string;
  productionPlanNote: string;
  delYn: 'Y' | 'N';
  updatedAt: string | null;
  updatedBy: string;
};

export type InventoryWeeklyRecordInput = {
  productId: string;
  weekStartDate: string;
  availableBoxOverride: number | null;
  properStockBox: number | null;
  productionDateNote: string;
  productionPlanNote: string;
};

export type InventoryShipment = {
  id: string;
  productId: string;
  deadline: string;
  client: string;
  receiver: string;
  qty: number;
};

export type InventoryPageData = {
  products: Product[];
  managedProducts: InventoryManagedProduct[];
};
