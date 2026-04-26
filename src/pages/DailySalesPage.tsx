import { useEffect, useMemo, useState } from 'react';
import { fetchDailySalesNotes, saveDailySalesNote } from '../api/dailySalesNotes';
import { fetchDocuments } from '../api/documents';
import { fetchProducts } from '../api/products';
import PageHeader from '../components/PageHeader';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import {
  buildDailySalesRows,
  formatYearMonthLabel,
  getDaysInMonth,
  getMonthlyQty,
  getWeightedCostPrice,
  getWeightedSellPrice,
  getYearMonthOptions,
  summarizeDailySales,
} from '../features/daily-sales/dailySalesRows';
import { exportDailySalesToExcel } from '../features/daily-sales/dailySalesExcel';
import type { DailySalesRow } from '../features/daily-sales/types';
import type { DocumentHistory } from '../types/document';
import type { Product } from '../types/product';

type SearchScope = 'all' | 'client' | 'product' | 'receiver';

const today = new Date();
const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

export default function DailySalesPage() {
  const [documents, setDocuments] = useState<DocumentHistory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedYearMonth, setSelectedYearMonth] = useState(currentYearMonth);
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadBaseData() {
      try {
        setLoading(true);
        setError(null);

        const [documentRows, productRows] = await Promise.all([fetchDocuments(), fetchProducts()]);
        if (!mounted) return;

        setDocuments(documentRows);
        setProducts(productRows);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : '일일판매 데이터를 불러오지 못했습니다.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadBaseData();

    return () => {
      mounted = false;
    };
  }, []);

  const availableYearMonths = useMemo(() => getYearMonthOptions(documents), [documents]);

  useEffect(() => {
    if (!availableYearMonths.includes(selectedYearMonth)) {
      setSelectedYearMonth(availableYearMonths[0] ?? currentYearMonth);
    }
  }, [availableYearMonths, selectedYearMonth]);

  useEffect(() => {
    let mounted = true;

    async function loadNotes() {
      try {
        const notes = await fetchDailySalesNotes(selectedYearMonth);
        if (mounted) setNoteDrafts(notes);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : '일일판매 비고를 불러오지 못했습니다.');
        }
      }
    }

    void loadNotes();

    return () => {
      mounted = false;
    };
  }, [selectedYearMonth]);

  const dailyRows = useMemo(
    () =>
      buildDailySalesRows({
        yearMonth: selectedYearMonth,
        products,
        documents,
        notes: noteDrafts,
      }),
    [documents, noteDrafts, products, selectedYearMonth],
  );
  const filteredDailyRows = useMemo(
    () => filterDailySalesRows(dailyRows, searchScope, searchKeyword),
    [dailyRows, searchKeyword, searchScope],
  );

  const summary = useMemo(() => summarizeDailySales(filteredDailyRows), [filteredDailyRows]);
  const days = useMemo(
    () => Array.from({ length: getDaysInMonth(selectedYearMonth) }, (_, index) => index + 1),
    [selectedYearMonth],
  );
  const dailyQtyTotals = useMemo(
    () =>
      days.map((_, index) =>
        filteredDailyRows.reduce((sum, row) => sum + (row.dailyQty[index] ?? 0), 0),
      ),
    [filteredDailyRows, days],
  );

  async function handleSaveNote(row: DailySalesRow) {
    const nextNote = (noteDrafts[row.key] ?? '').trim();

    try {
      setSavingRowKey(row.key);
      setError(null);
      await saveDailySalesNote(selectedYearMonth, row.key, nextNote);
      setNoteDrafts((current) => ({ ...current, [row.key]: nextNote }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '비고 저장에 실패했습니다.');
    } finally {
      setSavingRowKey(null);
    }
  }

  function handleDownloadExcel() {
    if (filteredDailyRows.length === 0) {
      window.alert('다운로드할 일일판매 데이터가 없습니다.');
      return;
    }

    void exportDailySalesToExcel({
      yearMonth: selectedYearMonth,
      rows: filteredDailyRows,
      days,
      dailyQtyTotals,
      summary,
      noteDrafts,
    });
  }

  return (
    <div className="page-content">
      <PageHeader title="일일판매" description="" />

      {error ? <Alert>{error}</Alert> : null}

      <section className="card daily-sales-filter-card">
        <div className="daily-sales-filter-grid">
          <label className="field">
            <span>연 / 월</span>
            <select value={selectedYearMonth} onChange={(event) => setSelectedYearMonth(event.target.value)}>
              {availableYearMonths.map((yearMonth) => (
                <option key={yearMonth} value={yearMonth}>
                  {formatYearMonthLabel(yearMonth)}
                </option>
              ))}
            </select>
          </label>

          <div className="daily-sales-search-grid">
            <label className="field">
              <span>검색 조건</span>
              <select
                value={searchScope}
                onChange={(event) => setSearchScope(event.target.value as SearchScope)}
              >
                <option value="all">전체</option>
                <option value="client">납품처</option>
                <option value="product">품목명</option>
                <option value="receiver">수신처</option>
              </select>
            </label>

            <label className="field">
              <span>검색어</span>
              <input
                className="search-input"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="검색어 입력"
              />
            </label>
          </div>

          <div className="daily-sales-filter-actions">
            <Button
              type="button"
              variant="secondary"
              className="excel-download-button"
              onClick={handleDownloadExcel}
              disabled={loading || filteredDailyRows.length === 0}
            >
              엑셀 다운로드
            </Button>
          </div>
        </div>
      </section>

      <section className="card daily-sales-sheet">
        <div className="daily-sales-sheet-head">
          <h2>{formatYearMonthLabel(selectedYearMonth)} 일일판매 현황</h2>
        </div>

        {loading ? (
          <div className="empty-state">일일판매 데이터를 불러오는 중입니다...</div>
        ) : filteredDailyRows.length === 0 ? (
          <div className="empty-state">표시할 품목 데이터가 없습니다.</div>
        ) : (
          <div className="table-wrap daily-sales-table-wrap">
            <table className="table daily-sales-table">
              <thead>
                <tr>
                  <th className="daily-sales-sticky-col client-col">납품처</th>
                  <th className="daily-sales-sticky-col product-col">품목명</th>
                  <th>수신처</th>
                  <th className="number-cell">총수량</th>
                  <th className="number-cell">입고단가</th>
                  <th className="number-cell">입고금액</th>
                  <th className="number-cell">출고단가</th>
                  <th className="number-cell">출고금액</th>
                  <th>비고란</th>
                  <th className="number-cell">전월이월분</th>
                  {days.map((day) => (
                    <th key={day}>{day}일</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDailyRows.map((row) => {
                  const monthlyQty = getMonthlyQty(row);
                  const weightedCostPrice = getWeightedCostPrice(row);
                  const weightedSellPrice = getWeightedSellPrice(row);
                  return (
                    <tr key={row.key}>
                      <td className="daily-sales-sticky-col client-col">
                        <div className="table-primary">{row.clientName}</div>
                      </td>
                      <td className="daily-sales-sticky-col product-col">{row.productName}</td>
                      <td>{row.receiver}</td>
                      <td className="number-cell">{formatQty(monthlyQty)}</td>
                      <td className="number-cell">{formatPrice(weightedCostPrice)}</td>
                      <td className="number-cell">{formatNumber(row.costAmount)}</td>
                      <td className="number-cell">{formatPrice(weightedSellPrice)}</td>
                      <td className="number-cell">{formatNumber(row.sellAmount)}</td>
                      <td>
                        <input
                          className="search-input daily-sales-note-input"
                          value={noteDrafts[row.key] ?? ''}
                          disabled={savingRowKey === row.key}
                          onChange={(event) =>
                            setNoteDrafts((current) => ({
                              ...current,
                              [row.key]: event.target.value,
                            }))
                          }
                          onBlur={() => void handleSaveNote(row)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter') return;
                            event.preventDefault();
                            void handleSaveNote(row);
                          }}
                          placeholder="비고 입력"
                        />
                      </td>
                      <td className="number-cell carryover-cell">{formatQty(row.carryoverQty)}</td>
                      {row.dailyQty.map((qty, index) => (
                        <td key={`${row.key}-${index}`} className="number-cell daily-qty-cell">
                          {formatQty(qty)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="daily-sales-total-row">
                  <td className="daily-sales-sticky-col client-col">합계</td>
                  <td className="daily-sales-sticky-col product-col" />
                  <td />
                  <td className="number-cell">{formatNumber(summary.monthlyQty)}</td>
                  <td />
                  <td className="number-cell">{formatNumber(summary.costAmount)}</td>
                  <td />
                  <td className="number-cell">{formatNumber(summary.sellAmount)}</td>
                  <td />
                  <td />
                  {dailyQtyTotals.map((qty, index) => (
                    <td key={`daily-total-${index}`} className="number-cell">
                      {formatQty(qty)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatPrice(value: number) {
  return value === 0 ? '-' : formatNumber(value);
}

function formatQty(value: number) {
  return value === 0 ? '-' : formatNumber(value);
}

function filterDailySalesRows(rows: DailySalesRow[], scope: SearchScope, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return rows;

  return rows.filter((row) => {
    const values =
      scope === 'client'
        ? [row.clientName]
        : scope === 'product'
          ? [row.productName]
          : scope === 'receiver'
            ? [row.receiver]
            : [row.clientName, row.productName, row.receiver];

    return values.some((value) => value.toLowerCase().includes(normalizedKeyword));
  });
}
