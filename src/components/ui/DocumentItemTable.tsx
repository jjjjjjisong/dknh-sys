import React, { useEffect, useMemo, useState } from 'react';
import type { Product } from '../../types/product';
import Modal from './Modal';
import {
  formatDecimalInput,
  formatIntegerInput,
  formatNumber,
  parseNullableDecimal,
  parseNullableInteger,
  stripNonNumeric,
} from '../../utils/formatters';

export const MANUAL_PRODUCT_ID = '__manual__';
export const DEFAULT_GUBUN_OPTIONS = ['컵', '컵뚜껑', '비닐', '스트로우', '기타'];

export type SharedItemRow = {
  id: string;
  productId: string;
  manualName: string;
  manualGubun: string;
  orderDate: string;
  arriveDate: string;
  qty: number | null;
  customPallet: number | null;
  customBox: number | null;
  unitPrice: number | null;
  customSupply: number | null;
  vat: boolean;
  releaseNote: string;
  invoiceNote: string;
};

export type ItemSummary = {
  name1: string;
  name2: string;
  gubun: string;
  qty: number;
  unitPrice: number;
  supply: number;
  vatAmount: number;
  pallet: number | null;
  box: number | null;
  eaPerB: number | null;
  boxPerP: number | null;
};

interface DocumentItemTableProps {
  items: SharedItemRow[];
  clientProducts: Product[];
  itemSummaries: ItemSummary[];
  totals: { supply: number; vat: number; total: number };
  onUpdateItem: (id: string, updater: (item: SharedItemRow) => SharedItemRow) => void;
  onRemoveItem: (id: string) => void;
  onAddItem: () => void;
}

export default function DocumentItemTable({
  items,
  clientProducts,
  itemSummaries,
  totals,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
}: DocumentItemTableProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [pendingOpenNewItemCount, setPendingOpenNewItemCount] = useState<number | null>(null);

  const editingItem = useMemo(
    () => items.find((item) => item.id === editingItemId) ?? null,
    [items, editingItemId],
  );
  const editingIndex = editingItem ? items.findIndex((item) => item.id === editingItem.id) : -1;
  const editingSummary = editingIndex >= 0 ? itemSummaries[editingIndex] : null;
  const editingManualMode = editingItem?.productId === MANUAL_PRODUCT_ID;

  function handleNumericFocus(
    id: string,
    key: 'qty' | 'customPallet' | 'customBox' | 'unitPrice' | 'customSupply',
  ) {
    onUpdateItem(id, (current) => {
      const value = current[key];
      if (value === 0) {
        return { ...current, [key]: null };
      }
      return current;
    });
  }

  useEffect(() => {
    if (pendingOpenNewItemCount === null || items.length <= pendingOpenNewItemCount) return;
    setEditingItemId(items[items.length - 1].id);
    setPendingOpenNewItemCount(null);
  }, [items, pendingOpenNewItemCount]);

  useEffect(() => {
    if (!editingItemId) return;
    if (!items.some((item) => item.id === editingItemId)) {
      setEditingItemId(null);
    }
  }, [editingItemId, items]);

  function handleAddItem() {
    setPendingOpenNewItemCount(items.length);
    onAddItem();
  }

  function getItemDisplayName(item: SharedItemRow, summary: ItemSummary) {
    if (item.productId === MANUAL_PRODUCT_ID) {
      return item.manualName.trim() || '직접입력 품목';
    }

    return summary.name1 || '품목 미선택';
  }

  return (
    <section className="card doc-items-card">
      <div className="card-header doc-card-header doc-items-card-header doc-items-inline-header">
        <div>
          <h2>품목 정보</h2>
        </div>
        <button className="btn btn-primary doc-add-item-button" type="button" onClick={handleAddItem}>
          + 품목 추가
        </button>
      </div>

      <div className="doc-mobile-item-list">
        {items.map((item, index) => {
          const summary = itemSummaries[index];

          return (
            <button
              key={`mobile-${item.id}`}
              type="button"
              className="doc-mobile-item-card"
              onClick={() => setEditingItemId(item.id)}
            >
              <div className="doc-mobile-item-card-head">
                <strong>{getItemDisplayName(item, summary)}</strong>
                <span>{index + 1}번 품목</span>
              </div>
              <div className="doc-mobile-item-card-meta">
                <span>입고일 {item.arriveDate || '-'}</span>
                <span>구분 {item.productId === MANUAL_PRODUCT_ID ? item.manualGubun || '-' : summary.gubun || '-'}</span>
                <span>수량 {formatIntegerInput(item.qty) || '0'}</span>
              </div>
              <div className="doc-mobile-item-card-chips">
                <span>파레트 {formatIntegerInput(item.customPallet) || formatMaybeText(summary.pallet)}</span>
                <span>박스 {formatIntegerInput(item.customBox) || formatMaybeText(summary.box)}</span>
                <span>공급가 {formatIntegerInput(item.customSupply) || formatNumber(summary.supply)}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="table-wrap">
        <table className="table doc-items-table wide">
          <thead>
            <tr>
              <th>#</th>
              <th className="doc-item-name-cell">품목명</th>
              <th className="doc-gubun-col">구분</th>
              <th>발주일자</th>
              <th>입고일자</th>
              <th>수량(ea)</th>
              <th className="doc-pallet-col">파레트</th>
              <th className="doc-box-col">BOX</th>
              <th>단가</th>
              <th>공급가액</th>
              <th>VAT</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const summary = itemSummaries[index];
              const manualMode = item.productId === MANUAL_PRODUCT_ID;

              return (
                <React.Fragment key={item.id}>
                  <tr className="doc-item-main-row">
                    <td>{index + 1}</td>
                    <td className="doc-item-name-cell">
                      <select
                        className="doc-cell-control"
                        value={item.productId}
                        onChange={(event) => {
                          const nextId = event.target.value;
                          const selected = clientProducts.find((row) => row.id === nextId);
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            productId: nextId,
                            manualGubun: DEFAULT_GUBUN_OPTIONS[0],
                            manualName: nextId === MANUAL_PRODUCT_ID ? current.manualName : '',
                            unitPrice:
                              nextId === MANUAL_PRODUCT_ID
                                ? current.unitPrice
                                : selected?.sell_price ?? null,
                            customSupply: null,
                          }));
                        }}
                      >
                        <option value="">품목 선택</option>
                        {clientProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name1}
                          </option>
                        ))}
                        <option value={MANUAL_PRODUCT_ID}>직접입력</option>
                      </select>
                    </td>
                    <td className="doc-gubun-cell">
                      {manualMode ? (
                        <select
                          className="doc-cell-control"
                          value={item.manualGubun}
                          onChange={(event) =>
                            onUpdateItem(item.id, (current) => ({
                              ...current,
                              manualGubun: event.target.value,
                            }))
                          }
                        >
                          {DEFAULT_GUBUN_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        summary.gubun || '-'
                      )}
                    </td>
                    <td>
                      <input
                        className="doc-cell-control"
                        type="date"
                        value={item.orderDate}
                        onChange={(event) =>
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            orderDate: event.target.value,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="doc-cell-control"
                        type="date"
                        value={item.arriveDate}
                        onChange={(event) =>
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            arriveDate: event.target.value,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="doc-cell-control doc-number-input-qty"
                        type="text"
                        inputMode="numeric"
                        value={formatIntegerInput(item.qty)}
                        onFocus={() => handleNumericFocus(item.id, 'qty')}
                        onChange={(event) =>
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            qty: parseNullableInteger(stripNonNumeric(event.target.value)),
                            customPallet: null,
                            customBox: null,
                            customSupply: null,
                          }))
                        }
                      />
                    </td>
                    <td className="doc-pallet-col">
                      <input
                        className="doc-cell-control doc-number-input-pallet-box"
                        type="text"
                        inputMode="numeric"
                        value={formatIntegerInput(item.customPallet)}
                        onFocus={() => handleNumericFocus(item.id, 'customPallet')}
                        onChange={(event) =>
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            customPallet: parseNullableInteger(stripNonNumeric(event.target.value)),
                          }))
                        }
                        placeholder={summary.pallet !== null ? String(summary.pallet) : '자동'}
                      />
                    </td>
                    <td className="doc-box-col">
                      <input
                        className="doc-cell-control doc-number-input-pallet-box"
                        type="text"
                        inputMode="numeric"
                        value={formatIntegerInput(item.customBox)}
                        onFocus={() => handleNumericFocus(item.id, 'customBox')}
                        onChange={(event) =>
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            customBox: parseNullableInteger(stripNonNumeric(event.target.value)),
                          }))
                        }
                        placeholder={summary.box !== null ? String(summary.box) : '자동'}
                      />
                    </td>
                    <td>
                      <input
                        className="doc-cell-control doc-number-input-unitprice"
                        type="text"
                        inputMode="decimal"
                        value={formatDecimalInput(item.unitPrice)}
                        onFocus={() => handleNumericFocus(item.id, 'unitPrice')}
                        onChange={(event) =>
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            unitPrice: parseNullableDecimal(event.target.value),
                            customSupply: null,
                          }))
                        }
                        placeholder="단가"
                      />
                    </td>
                    <td>
                      <input
                        className="doc-cell-control doc-number-input-supply"
                        type="text"
                        inputMode="numeric"
                        value={formatIntegerInput(item.customSupply)}
                        onFocus={() => handleNumericFocus(item.id, 'customSupply')}
                        onChange={(event) =>
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            customSupply: parseNullableInteger(stripNonNumeric(event.target.value)),
                          }))
                        }
                        placeholder={formatNumber(summary.supply)}
                      />
                    </td>
                    <td>
                      <label className="inline-check">
                        <input
                          type="checkbox"
                          checked={item.vat}
                          onChange={(event) =>
                            onUpdateItem(item.id, (current) => ({
                              ...current,
                              vat: event.target.checked,
                            }))
                          }
                        />
                        포함
                      </label>
                    </td>
                    <td>
                      <button
                        className="btn btn-danger doc-delete-button"
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                  <tr className="doc-item-note-row">
                    <td className="doc-item-note-spacer" />
                    <td>
                      {manualMode ? (
                        <input
                          className="doc-cell-control doc-item-name-input"
                          value={item.manualName}
                          onChange={(event) =>
                            onUpdateItem(item.id, (current) => ({
                              ...current,
                              manualName: event.target.value,
                            }))
                          }
                          placeholder="품목명 입력"
                        />
                      ) : null}
                    </td>
                    <td className="doc-item-note-spacer" />
                    <td colSpan={2}>
                      <input
                        className="doc-cell-control doc-item-release-note"
                        value={item.releaseNote}
                        onChange={(event) =>
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            releaseNote: event.target.value,
                          }))
                        }
                        placeholder="비고(출고의뢰서) 입력"
                      />
                    </td>
                    <td colSpan={2}>
                      <input
                        className="doc-cell-control doc-item-invoice-note"
                        value={item.invoiceNote}
                        onChange={(event) =>
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            invoiceNote: event.target.value,
                          }))
                        }
                        placeholder="비고(거래명세서) 입력"
                      />
                    </td>
                    <td className="doc-item-note-spacer" />
                    <td className="doc-item-note-spacer" />
                    <td className="doc-item-note-spacer" />
                    <td className="doc-item-note-spacer" />
                    <td className="doc-item-note-spacer" />
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="doc-totals-strip">
        <div className="doc-total-item">
          <span>공급가액 합계</span>
          <strong>{formatNumber(totals.supply)}</strong>
        </div>
        <div className="doc-total-item">
          <span>부가세 합계</span>
          <strong>{formatNumber(totals.vat)}</strong>
        </div>
        <div className="doc-total-item total">
          <span>합계금액</span>
          <strong>{formatNumber(totals.total)}</strong>
        </div>
      </div>

      <Modal
        open={Boolean(editingItem)}
        title={editingItem && editingSummary ? getItemDisplayName(editingItem, editingSummary) : '품목 상세'}
        description={editingItem ? `품목 ${editingIndex + 1} 상세 입력` : undefined}
        onClose={() => setEditingItemId(null)}
        cardClassName="doc-item-editor-modal"
        footer={
          editingItem ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingItemId(null)}>
                닫기
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  onRemoveItem(editingItem.id);
                  setEditingItemId(null);
                }}
              >
                삭제
              </button>
            </>
          ) : null
        }
      >
        {editingItem && editingSummary ? (
          <div className="doc-item-editor-grid">
            <label className="field">
              <span>품목명</span>
              <select
                className="doc-cell-control"
                value={editingItem.productId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  const selected = clientProducts.find((row) => row.id === nextId);
                  onUpdateItem(editingItem.id, (current) => ({
                    ...current,
                    productId: nextId,
                    manualGubun: DEFAULT_GUBUN_OPTIONS[0],
                    manualName: nextId === MANUAL_PRODUCT_ID ? current.manualName : '',
                    unitPrice:
                      nextId === MANUAL_PRODUCT_ID
                        ? current.unitPrice
                        : selected?.sell_price ?? null,
                    customSupply: null,
                  }));
                }}
              >
                <option value="">품목 선택</option>
                {clientProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name1}
                  </option>
                ))}
                <option value={MANUAL_PRODUCT_ID}>직접입력</option>
              </select>
            </label>

            {editingManualMode ? (
              <>
                <label className="field">
                  <span>직접입력 품목명</span>
                  <input
                    value={editingItem.manualName}
                    onChange={(event) =>
                      onUpdateItem(editingItem.id, (current) => ({
                        ...current,
                        manualName: event.target.value,
                      }))
                    }
                    placeholder="품목명 입력"
                  />
                </label>
                <label className="field">
                  <span>구분</span>
                  <select
                    className="doc-cell-control"
                    value={editingItem.manualGubun}
                    onChange={(event) =>
                      onUpdateItem(editingItem.id, (current) => ({
                        ...current,
                        manualGubun: event.target.value,
                      }))
                    }
                  >
                    {DEFAULT_GUBUN_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <label className="field">
                <span>구분</span>
                <input value={editingSummary.gubun || '-'} readOnly />
              </label>
            )}

            <label className="field">
              <span>발주일자</span>
              <input
                className="doc-cell-control"
                type="date"
                value={editingItem.orderDate}
                onChange={(event) =>
                  onUpdateItem(editingItem.id, (current) => ({
                    ...current,
                    orderDate: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>입고일자</span>
              <input
                className="doc-cell-control"
                type="date"
                value={editingItem.arriveDate}
                onChange={(event) =>
                  onUpdateItem(editingItem.id, (current) => ({
                    ...current,
                    arriveDate: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>수량</span>
              <input
                className="doc-cell-control"
                type="text"
                inputMode="numeric"
                value={formatIntegerInput(editingItem.qty)}
                onFocus={() => handleNumericFocus(editingItem.id, 'qty')}
                onChange={(event) =>
                  onUpdateItem(editingItem.id, (current) => ({
                    ...current,
                    qty: parseNullableInteger(stripNonNumeric(event.target.value)),
                    customPallet: null,
                    customBox: null,
                    customSupply: null,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>파레트</span>
              <input
                className="doc-cell-control"
                type="text"
                inputMode="numeric"
                value={formatIntegerInput(editingItem.customPallet)}
                onFocus={() => handleNumericFocus(editingItem.id, 'customPallet')}
                onChange={(event) =>
                  onUpdateItem(editingItem.id, (current) => ({
                    ...current,
                    customPallet: parseNullableInteger(stripNonNumeric(event.target.value)),
                  }))
                }
                placeholder={editingSummary.pallet !== null ? String(editingSummary.pallet) : '자동'}
              />
            </label>

            <label className="field">
              <span>박스</span>
              <input
                className="doc-cell-control"
                type="text"
                inputMode="numeric"
                value={formatIntegerInput(editingItem.customBox)}
                onFocus={() => handleNumericFocus(editingItem.id, 'customBox')}
                onChange={(event) =>
                  onUpdateItem(editingItem.id, (current) => ({
                    ...current,
                    customBox: parseNullableInteger(stripNonNumeric(event.target.value)),
                  }))
                }
                placeholder={editingSummary.box !== null ? String(editingSummary.box) : '자동'}
              />
            </label>

            <label className="field">
              <span>단가</span>
              <input
                className="doc-cell-control"
                type="text"
                inputMode="decimal"
                value={formatDecimalInput(editingItem.unitPrice)}
                onFocus={() => handleNumericFocus(editingItem.id, 'unitPrice')}
                onChange={(event) =>
                  onUpdateItem(editingItem.id, (current) => ({
                    ...current,
                    unitPrice: parseNullableDecimal(event.target.value),
                    customSupply: null,
                  }))
                }
                placeholder="단가"
              />
            </label>

            <label className="field">
              <span>공급가액</span>
              <input
                className="doc-cell-control"
                type="text"
                inputMode="numeric"
                value={formatIntegerInput(editingItem.customSupply)}
                onFocus={() => handleNumericFocus(editingItem.id, 'customSupply')}
                onChange={(event) =>
                  onUpdateItem(editingItem.id, (current) => ({
                    ...current,
                    customSupply: parseNullableInteger(stripNonNumeric(event.target.value)),
                  }))
                }
                placeholder={formatNumber(editingSummary.supply)}
              />
            </label>

            <label className="field field-check">
              <span>VAT 포함</span>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={editingItem.vat}
                  onChange={(event) =>
                    onUpdateItem(editingItem.id, (current) => ({
                      ...current,
                      vat: event.target.checked,
                    }))
                  }
                />
                포함
              </label>
            </label>

            <label className="field field-span-2">
              <span>출고 비고</span>
              <textarea
                value={editingItem.releaseNote}
                onChange={(event) =>
                  onUpdateItem(editingItem.id, (current) => ({
                    ...current,
                    releaseNote: event.target.value,
                  }))
                }
                placeholder="출고 관련 메모 입력"
              />
            </label>

            <label className="field field-span-2">
              <span>거래명세 비고</span>
              <textarea
                value={editingItem.invoiceNote}
                onChange={(event) =>
                  onUpdateItem(editingItem.id, (current) => ({
                    ...current,
                    invoiceNote: event.target.value,
                  }))
                }
                placeholder="거래명세 관련 메모 입력"
              />
            </label>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

function formatMaybeText(value: number | null) {
  return value === null || value === undefined ? '-' : formatNumber(value);
}
