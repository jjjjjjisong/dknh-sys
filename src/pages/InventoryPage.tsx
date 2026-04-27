import { useEffect, useMemo, useState } from 'react';
import {
  addInventoryManagedProduct,
  fetchInventoryManagedProductsByReceivers,
  fetchInventoryShipments,
  fetchInventoryWeeklyRecords,
  removeInventoryManagedProduct,
  saveInventoryWeeklyRecord,
} from '../api/inventory';
import { fetchProducts } from '../api/products';
import PageHeader from '../components/PageHeader';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import type {
  InventoryManagedProduct,
  InventoryShipment,
  InventoryWeeklyRecord,
  InventoryWeeklyRecordInput,
} from '../types/inventory';
import type { Product } from '../types/product';
import { formatDecimalInput, formatNumber, parseNullableDecimal } from '../utils/formatters';

type InventoryCellField =
  | 'availableBoxOverride'
  | 'productionDateNote'
  | 'productionPlanNote';

type InventoryTableRow = {
  id: string;
  product: Product;
  productIds: string[];
  managedProduct: InventoryManagedProduct;
  weekStart: string;
  availableBox: number | null;
  availableQty: number | null;
  remainingBox: number | null;
  outboundBox: number;
  outboundQty: number;
  truckCount: number | null;
  shipmentPartners: string;
  record: InventoryWeeklyRecord | null;
};

const DEFAULT_RECEIVERS = ['동국프라텍', '팔도테크팩'];
const HISTORY_WEEKS = 8;

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedReceivers, setSelectedReceivers] = useState<string[]>([]);
  const [activeReceiver, setActiveReceiver] = useState('');
  const [managedProducts, setManagedProducts] = useState<InventoryManagedProduct[]>([]);
  const [records, setRecords] = useState<InventoryWeeklyRecord[]>([]);
  const [shipments, setShipments] = useState<InventoryShipment[]>([]);
  const [baseWeekStart, setBaseWeekStart] = useState(() => formatDate(startOfMonday(new Date())));
  const [receiverToAdd, setReceiverToAdd] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addProductReceiver, setAddProductReceiver] = useState('');
  const [productKeyword, setProductKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError(null);
        const productRows = await fetchProducts();
        if (!mounted) return;
        setProducts(productRows);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : '재고관리 품목 데이터를 불러오지 못했습니다.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const receiverOptions = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.receiver).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [products],
  );

  useEffect(() => {
    if (selectedReceivers.length > 0 || receiverOptions.length === 0) return;

    const defaults = DEFAULT_RECEIVERS.map((defaultReceiver) =>
      receiverOptions.find((receiver) => normalizeReceiverName(receiver).includes(normalizeReceiverName(defaultReceiver))),
    ).filter((receiver): receiver is string => Boolean(receiver));
    setSelectedReceivers(defaults.length > 0 ? defaults : receiverOptions.slice(0, 1));
  }, [receiverOptions, selectedReceivers.length]);

  useEffect(() => {
    if (selectedReceivers.length === 0) {
      setActiveReceiver('');
      return;
    }

    if (!activeReceiver || !selectedReceivers.includes(activeReceiver)) {
      setActiveReceiver(selectedReceivers[0]);
    }
  }, [activeReceiver, selectedReceivers]);

  const additionalReceiverOptions = useMemo(
    () => receiverOptions.filter((receiver) => !selectedReceivers.includes(receiver)),
    [receiverOptions, selectedReceivers],
  );

  useEffect(() => {
    if (!receiverToAdd || !additionalReceiverOptions.includes(receiverToAdd)) {
      setReceiverToAdd(additionalReceiverOptions[0] ?? '');
    }
  }, [additionalReceiverOptions, receiverToAdd]);

  useEffect(() => {
    let mounted = true;

    async function loadManagedProducts() {
      if (selectedReceivers.length === 0) {
        setManagedProducts([]);
        return;
      }

      try {
        setDetailLoading(true);
        setError(null);
        const rows = await fetchInventoryManagedProductsByReceivers(selectedReceivers);
        if (mounted) setManagedProducts(rows);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : '재고관리 대상 품목을 불러오지 못했습니다.');
      } finally {
        if (mounted) setDetailLoading(false);
      }
    }

    void loadManagedProducts();

    return () => {
      mounted = false;
    };
  }, [selectedReceivers.join('|')]);

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const latestManagedStateByProductId = useMemo(() => {
    const map = new Map<string, InventoryManagedProduct>();
    for (const item of managedProducts) {
      if (!map.has(item.productId)) {
        map.set(item.productId, item);
      }
    }
    return map;
  }, [managedProducts]);

  const visibleProducts = useMemo(
    () =>
      products
        .filter((product) => selectedReceivers.includes(product.receiver))
        .filter((product) => latestManagedStateByProductId.get(product.id)?.delYn !== 'Y'),
    [latestManagedStateByProductId, products, selectedReceivers],
  );

  const visibleProductIds = useMemo(
    () => visibleProducts.map((product) => product.id),
    [visibleProducts],
  );

  const calculationWeeks = useMemo(() => {
    const start = addDays(parseDate(baseWeekStart), -HISTORY_WEEKS * 7);
    return Array.from({ length: HISTORY_WEEKS + 1 }, (_, index) => formatDate(addDays(start, index * 7)));
  }, [baseWeekStart]);

  useEffect(() => {
    let mounted = true;

    async function loadWeeklyData() {
      if (visibleProductIds.length === 0) {
        setRecords([]);
        setShipments([]);
        setDrafts({});
        return;
      }

      try {
        setDetailLoading(true);
        setError(null);
        const dateFrom = calculationWeeks[0];
        const dateTo = formatDate(addDays(parseDate(baseWeekStart), 6));
        const [recordRows, shipmentRows] = await Promise.all([
          fetchInventoryWeeklyRecords(visibleProductIds, dateFrom, baseWeekStart),
          fetchInventoryShipments(visibleProductIds, dateFrom, dateTo),
        ]);
        if (!mounted) return;
        setRecords(recordRows);
        setShipments(shipmentRows);
        setDrafts({});
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : '주차별 재고 데이터를 불러오지 못했습니다.');
      } finally {
        if (mounted) setDetailLoading(false);
      }
    }

    void loadWeeklyData();

    return () => {
      mounted = false;
    };
  }, [visibleProductIds.join(','), calculationWeeks.join(','), baseWeekStart]);

  const recordMap = useMemo(
    () => new Map(records.map((record) => [getRecordKey(record.productId, record.weekStartDate), record])),
    [records],
  );

  const shipmentMap = useMemo(() => {
    const map = new Map<string, InventoryShipment[]>();
    for (const shipment of shipments) {
      const weekStart = formatDate(startOfMonday(parseDate(shipment.deadline)));
      const key = getRecordKey(shipment.productId, weekStart);
      const current = map.get(key) ?? [];
      current.push(shipment);
      map.set(key, current);
    }
    return map;
  }, [shipments]);

  const groupedProducts = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const product of visibleProducts) {
      const key = getProductGroupKey(product);
      const current = map.get(key) ?? [];
      current.push(product);
      map.set(key, current);
    }

    return Array.from(map.values()).map((group) =>
      [...group].sort((left, right) => {
        const noCompare = (left.no ?? 0) - (right.no ?? 0);
        if (noCompare !== 0) return noCompare;
        return left.id.localeCompare(right.id);
      }),
    );
  }, [visibleProducts]);

  const tableRows = useMemo<InventoryTableRow[]>(() => {
    const rows: InventoryTableRow[] = [];

    for (const productGroup of groupedProducts) {
      const product = productGroup[0];
      const productIds = productGroup.map((item) => item.id);
      const managedProduct =
        latestManagedStateByProductId.get(product.id) ?? createVirtualManagedProduct(product);

      let carriedBox: number | null = null;
      let currentRow: InventoryTableRow | null = null;

      for (const weekStart of calculationWeeks) {
        const key = getRecordKey(product.id, weekStart);
        const record = recordMap.get(key) ?? null;
        const weekShipments = productIds.flatMap((productId) => shipmentMap.get(getRecordKey(productId, weekStart)) ?? []);
        const outboundQty = weekShipments.reduce((sum, shipment) => sum + shipment.qty, 0);
        const eaPerBox = getPositiveNumber(product.ea_per_b);
        const outboundBox = eaPerBox ? outboundQty / eaPerBox : 0;
        const availableBox: number | null = record?.availableBoxOverride ?? carriedBox;
        const remainingBox: number | null = availableBox === null ? null : availableBox - outboundBox;
        const boxPerTruck = getBoxPerTruck(product);

        const row: InventoryTableRow = {
          id: key,
          product,
          productIds,
          managedProduct,
          weekStart,
          availableBox,
          availableQty: availableBox === null || !eaPerBox ? null : availableBox * eaPerBox,
          remainingBox,
          outboundBox,
          outboundQty,
          truckCount: availableBox === null || !boxPerTruck ? null : availableBox / boxPerTruck,
          shipmentPartners: formatShipmentPartners(weekShipments),
          record,
        };

        if (weekStart === baseWeekStart) currentRow = row;
        carriedBox = remainingBox;
      }

      if (currentRow) rows.push(currentRow);
    }

    return rows.sort((left, right) => {
      const receiverCompare = left.product.receiver.localeCompare(right.product.receiver);
      if (receiverCompare !== 0) return receiverCompare;
      return left.product.name1.localeCompare(right.product.name1);
    });
  }, [baseWeekStart, calculationWeeks, groupedProducts, latestManagedStateByProductId, recordMap, shipmentMap]);

  const rowsByReceiver = useMemo(() => {
    const map = new Map<string, InventoryTableRow[]>();
    for (const receiver of selectedReceivers) {
      map.set(receiver, []);
    }
    for (const row of tableRows) {
      const current = map.get(row.product.receiver) ?? [];
      current.push(row);
      map.set(row.product.receiver, current);
    }
    return map;
  }, [selectedReceivers, tableRows]);

  const candidateProducts = useMemo(() => {
    const keyword = productKeyword.trim().toLowerCase();
    return products
      .filter((product) => product.receiver === addProductReceiver)
      .filter((product) => latestManagedStateByProductId.get(product.id)?.delYn === 'Y')
      .filter((product) => {
        if (!keyword) return true;
        return [product.name1, product.name2, product.client, product.gubun]
          .join(' ')
          .toLowerCase()
          .includes(keyword);
      });
  }, [addProductReceiver, latestManagedStateByProductId, productKeyword, products]);

  async function handleAddReceiver() {
    if (!receiverToAdd || selectedReceivers.includes(receiverToAdd)) return;
    setSelectedReceivers((current) => [...current, receiverToAdd]);
    setActiveReceiver(receiverToAdd);
  }

  function openAddProductModal(receiver: string) {
    setAddProductReceiver(receiver);
    setProductKeyword('');
    setAddModalOpen(true);
  }

  async function handleAddProduct(product: Product) {
    try {
      setSavingProductId(product.id);
      const receiverRows = visibleProducts.filter((item) => item.receiver === addProductReceiver);
      const added = await addInventoryManagedProduct(product.id, addProductReceiver, receiverRows.length + 1);
      setManagedProducts((current) => [added, ...current.filter((item) => item.productId !== added.productId)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '재고관리 품목 추가에 실패했습니다.');
    } finally {
      setSavingProductId(null);
    }
  }

  async function handleRemoveProduct(managedProduct: InventoryManagedProduct) {
    const product = productMap.get(managedProduct.productId);
    const confirmed = window.confirm(`"${product?.name1 ?? '선택 품목'}"을 재고관리 대상에서 제외할까요?`);
    if (!confirmed) return;

    try {
      let target = managedProduct;
      if (managedProduct.id.startsWith('virtual:') && product) {
        target = await addInventoryManagedProduct(product.id, product.receiver, visibleProducts.length + 1);
      }
      await removeInventoryManagedProduct(target.id);
      setManagedProducts((current) => [
        { ...target, delYn: 'Y' },
        ...current.filter((item) => item.productId !== target.productId),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '재고관리 품목 제외에 실패했습니다.');
    }
  }

  function updateDraft(row: InventoryTableRow, field: InventoryCellField, value: string) {
    setDrafts((current) => ({
      ...current,
      [getDraftKey(row, field)]: value,
    }));
  }

  async function saveDraft(row: InventoryTableRow, field: InventoryCellField) {
    const draftKey = getDraftKey(row, field);
    if (!(draftKey in drafts)) return;

    const nextRecord = buildRecordInput(row, field, drafts[draftKey]);
    try {
      setSavingCell(draftKey);
      const saved = await saveInventoryWeeklyRecord(nextRecord);
      setRecords((current) => {
        const existingIndex = current.findIndex(
          (item) => item.productId === saved.productId && item.weekStartDate === saved.weekStartDate,
        );
        if (existingIndex >= 0) {
          return current.map((item, index) => (index === existingIndex ? saved : item));
        }
        return [...current, saved];
      });
      setDrafts((current) => {
        const next = { ...current };
        delete next[draftKey];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '재고관리 입력값 저장에 실패했습니다.');
    } finally {
      setSavingCell(null);
    }
  }

  function moveWeek(delta: number) {
    setBaseWeekStart((current) => formatDate(addDays(parseDate(current), delta * 7)));
  }

  const weekEnd = formatDate(addDays(parseDate(baseWeekStart), 6));
  const activeReceiverRows = activeReceiver ? rowsByReceiver.get(activeReceiver) ?? [] : [];

  return (
    <>
      <PageHeader
        title="재고관리"
        description="수신처별 일부 품목의 주차별 BOX 재고와 출고예정을 관리합니다."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <section className="card inventory-filter-card">
        <div className="inventory-week-head">
          <button
            type="button"
            className="dashboard-week-nav-button"
            onClick={() => moveWeek(-1)}
            aria-label="이전 주"
          />
          <div className="inventory-week-label">
            <strong>{formatWeekTitle(baseWeekStart)}</strong>
            <span>{formatShortDate(baseWeekStart)}~{formatShortDate(weekEnd)}</span>
          </div>
          <button
            type="button"
            className="dashboard-week-nav-button"
            onClick={() => moveWeek(1)}
            aria-label="다음 주"
          />
        </div>

        <div className="inventory-receiver-toolbar">
          <div className="inventory-add-receiver">
            <select
              className="search-input"
              value={receiverToAdd}
              onChange={(event) => setReceiverToAdd(event.target.value)}
              disabled={additionalReceiverOptions.length === 0}
            >
              {additionalReceiverOptions.length === 0 ? <option value="">추가할 수신처 없음</option> : null}
              {additionalReceiverOptions.map((receiver) => (
                <option key={receiver} value={receiver}>
                  {receiver}
                </option>
              ))}
            </select>
            <Button type="button" onClick={() => void handleAddReceiver()} disabled={!receiverToAdd}>
              수신처 추가
            </Button>
          </div>

          <div className="inventory-receiver-tabs">
            {selectedReceivers.map((receiver) => {
              const rowCount = rowsByReceiver.get(receiver)?.length ?? 0;
              return (
                <button
                  key={receiver}
                  type="button"
                  className={receiver === activeReceiver ? 'inventory-receiver-tab active' : 'inventory-receiver-tab'}
                  onClick={() => setActiveReceiver(receiver)}
                >
                  <span>{receiver}</span>
                  <strong>{rowCount.toLocaleString('ko-KR')}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {loading ? (
        <section className="card inventory-sheet">
          <div className="empty-state">재고관리 데이터를 불러오는 중입니다...</div>
        </section>
      ) : selectedReceivers.length === 0 ? (
        <section className="card inventory-sheet">
          <div className="empty-state">수신처가 있는 품목이 없습니다.</div>
        </section>
      ) : (
        activeReceiver ? (
          <section className="card inventory-sheet">
              <div className="monthly-closing-sheet-head">
                <div>
                  <h2>{activeReceiver}</h2>
                  <p>가용재고는 BOX 기준으로 입력하며 수량과 차수는 자동 환산됩니다.</p>
                </div>
                <div className="inventory-sheet-actions">
                  <div className="toolbar-meta">품목 {activeReceiverRows.length.toLocaleString('ko-KR')}개</div>
                  <Button type="button" variant="primary" onClick={() => openAddProductModal(activeReceiver)}>
                    품목 추가
                  </Button>
                </div>
              </div>

              {detailLoading ? (
                <div className="empty-state">재고 데이터를 불러오는 중입니다...</div>
              ) : activeReceiverRows.length === 0 ? (
                <div className="empty-state">재고관리 대상 품목을 추가해 주세요.</div>
              ) : (
                <InventoryTable
                  rows={activeReceiverRows}
                  drafts={drafts}
                  savingCell={savingCell}
                  onChangeDraft={updateDraft}
                  onSaveDraft={saveDraft}
                  onRemoveProduct={handleRemoveProduct}
                />
              )}
          </section>
        ) : null
      )}

      <Modal
        open={addModalOpen}
        title="재고관리 품목 추가"
        description={`${addProductReceiver || '선택 수신처'}의 품목 중 재고관리할 품목을 추가합니다.`}
        onClose={() => setAddModalOpen(false)}
        cardClassName="inventory-add-modal-card"
      >
        <label className="field">
          <span>품목 검색</span>
          <input
            className="search-input"
            value={productKeyword}
            onChange={(event) => setProductKeyword(event.target.value)}
            placeholder="품목명, 거래처, 구분 검색"
          />
        </label>
        <div className="table-wrap inventory-add-table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>품목명</th>
                <th>거래처</th>
                <th>구분</th>
                <th>박스입수</th>
                <th>파렛트BOX</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {candidateProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty">
                    추가할 수 있는 품목이 없습니다.
                  </td>
                </tr>
              ) : (
                candidateProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="table-primary table-clamp-2" title={product.name1}>
                        {product.name1}
                      </div>
                    </td>
                    <td>{product.client}</td>
                    <td>{product.gubun}</td>
                    <td className="number-cell">{formatNumber(product.ea_per_b)}</td>
                    <td className="number-cell">{formatNumber(product.box_per_p)}</td>
                    <td>
                      <Button
                        type="button"
                        variant="primary"
                        size="small"
                        disabled={savingProductId === product.id}
                        onClick={() => void handleAddProduct(product)}
                      >
                        추가
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}

type InventoryTableProps = {
  rows: InventoryTableRow[];
  drafts: Record<string, string>;
  savingCell: string | null;
  onChangeDraft: (row: InventoryTableRow, field: InventoryCellField, value: string) => void;
  onSaveDraft: (row: InventoryTableRow, field: InventoryCellField) => void;
  onRemoveProduct: (managedProduct: InventoryManagedProduct) => void;
};

function InventoryTable({
  rows,
  drafts,
  savingCell,
  onChangeDraft,
  onSaveDraft,
  onRemoveProduct,
}: InventoryTableProps) {
  return (
    <div className="table-wrap inventory-table-wrap">
      <table className="table inventory-table">
        <thead>
          <tr>
            <th>품목명</th>
            <th>박스입수</th>
            <th>파렛트BOX</th>
            <th>파렛트</th>
            <th>1차당BOX</th>
            <th>재고</th>
            <th>생산일자</th>
            <th>생산예정</th>
            <th>출고업체</th>
            <th>출고예정</th>
            <th>가용재고 BOX</th>
            <th>가용재고 수량</th>
            <th>가용재고 차수</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.remainingBox !== null && row.remainingBox < 0 ? 'inventory-low-row' : ''}>
              <td>
                <div className="table-primary table-clamp-2" title={row.product.name1}>
                  {row.product.name1}
                </div>
              </td>
              <td className="number-cell">{formatNumber(row.product.ea_per_b)}</td>
              <td className="number-cell">{formatNumber(row.product.box_per_p)}</td>
              <td className="number-cell">{formatNumber(row.product.pallets_per_truck)}</td>
              <td className="number-cell">{formatDecimal(getBoxPerTruck(row.product))}</td>
              <td className="number-cell">{formatDecimal(row.remainingBox)}</td>
              <td>
                <input
                  className="search-input inventory-note-input"
                  value={getInputValue(row, 'productionDateNote', drafts)}
                  onChange={(event) => onChangeDraft(row, 'productionDateNote', event.target.value)}
                  onBlur={() => onSaveDraft(row, 'productionDateNote')}
                  disabled={savingCell === getDraftKey(row, 'productionDateNote')}
                />
              </td>
              <td>
                <input
                  className="search-input inventory-note-input"
                  value={getInputValue(row, 'productionPlanNote', drafts)}
                  onChange={(event) => onChangeDraft(row, 'productionPlanNote', event.target.value)}
                  onBlur={() => onSaveDraft(row, 'productionPlanNote')}
                  disabled={savingCell === getDraftKey(row, 'productionPlanNote')}
                />
              </td>
              <td>
                <div className="table-clamp-2 inventory-partners" title={row.shipmentPartners || '-'}>
                  {row.shipmentPartners || '-'}
                </div>
              </td>
              <td className="number-cell">{formatDecimal(row.outboundBox)}</td>
              <td>
                <input
                  className="search-input inventory-number-input"
                  value={getInputValue(row, 'availableBoxOverride', drafts)}
                  onChange={(event) => onChangeDraft(row, 'availableBoxOverride', event.target.value)}
                  onBlur={() => onSaveDraft(row, 'availableBoxOverride')}
                  disabled={savingCell === getDraftKey(row, 'availableBoxOverride')}
                />
              </td>
              <td className="number-cell">{formatDecimal(row.availableQty)}</td>
              <td className="number-cell">{formatDecimal(row.truckCount)}</td>
              <td>
                <Button
                  type="button"
                  variant="danger"
                  size="small"
                  onClick={() => void onRemoveProduct(row.managedProduct)}
                >
                  제외
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildRecordInput(
  row: InventoryTableRow,
  field: InventoryCellField,
  value: string,
): InventoryWeeklyRecordInput {
  const input: InventoryWeeklyRecordInput = {
    productId: row.product.id,
    weekStartDate: row.weekStart,
    availableBoxOverride: row.record?.availableBoxOverride ?? null,
    properStockBox: null,
    productionDateNote: row.record?.productionDateNote ?? '',
    productionPlanNote: row.record?.productionPlanNote ?? '',
  };

  if (field === 'availableBoxOverride') {
    input.availableBoxOverride = parseNullableDecimal(value);
  } else if (field === 'productionDateNote') {
    input.productionDateNote = value;
  } else if (field === 'productionPlanNote') {
    input.productionPlanNote = value;
  }

  return input;
}

function createVirtualManagedProduct(product: Product): InventoryManagedProduct {
  return {
    id: `virtual:${product.id}`,
    productId: product.id,
    receiver: product.receiver,
    displayOrder: product.no ?? 0,
    delYn: 'N',
    updatedAt: null,
    updatedBy: '',
  };
}

function normalizeReceiverName(value: string) {
  return value.replace(/\(주\)|주식회사|\s/g, '').toLowerCase();
}

function getInputValue(row: InventoryTableRow, field: InventoryCellField, drafts: Record<string, string>) {
  const draftKey = getDraftKey(row, field);
  if (draftKey in drafts) return drafts[draftKey];

  if (field === 'availableBoxOverride') return formatDecimalInput(row.record?.availableBoxOverride ?? null);
  if (field === 'productionDateNote') return row.record?.productionDateNote ?? '';
  return row.record?.productionPlanNote ?? '';
}

function getDraftKey(row: InventoryTableRow, field: InventoryCellField) {
  return `${row.product.id}:${row.weekStart}:${field}`;
}

function getRecordKey(productId: string, weekStart: string) {
  return `${productId}:${weekStart}`;
}

function getProductGroupKey(product: Product) {
  return `${product.receiver.trim()}::${product.name1.trim()}`;
}

function formatShipmentPartners(shipments: InventoryShipment[]) {
  const values = shipments
    .map((shipment) => shipment.receiver || shipment.client)
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(values)).join('/');
}

function getPositiveNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function getBoxPerTruck(product: Product) {
  const boxPerPallet = getPositiveNumber(product.box_per_p);
  const palletsPerTruck = getPositiveNumber(product.pallets_per_truck);
  if (!boxPerPallet || !palletsPerTruck) return null;
  return boxPerPallet * palletsPerTruck;
}

function formatDecimal(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '-';
  return value.toLocaleString('ko-KR', {
    maximumFractionDigits: 2,
  });
}

function formatWeekTitle(weekStart: string) {
  const date = parseDate(weekStart);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${getWeekOfMonth(date)}주차`;
}

function getWeekOfMonth(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstMondayOffset = firstDay.getDay() === 0 ? 1 : firstDay.getDay() === 1 ? 0 : 8 - firstDay.getDay();
  const firstMonday = new Date(date.getFullYear(), date.getMonth(), 1 + firstMondayOffset);
  if (date < firstMonday) return 1;
  return Math.floor((date.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
}

function formatShortDate(value: string) {
  const [, month, day] = value.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonday(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}
