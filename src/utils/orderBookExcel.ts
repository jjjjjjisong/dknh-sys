import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { OrderBookEntry } from '../types/order-book';

type OrderBookExportOptions = {
  fileStamp: string;
  dateFrom?: string;
  dateTo?: string;
  shippingFilter?: string;
  keyword?: string;
  filterTypeLabel?: string;
};

function createSolidFill(argb: string): ExcelJS.FillPattern {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb },
  };
}

function applyCellBorder(cell: ExcelJS.Cell, color = 'FFD6DEE8') {
  cell.border = {
    top: { style: 'thin', color: { argb: color } },
    left: { style: 'thin', color: { argb: color } },
    bottom: { style: 'thin', color: { argb: color } },
    right: { style: 'thin', color: { argb: color } },
  };
}

function formatDateRange(dateFrom?: string, dateTo?: string) {
  if (dateFrom && dateTo) return `${dateFrom} ~ ${dateTo}`;
  if (dateFrom) return `${dateFrom} ~`;
  if (dateTo) return `~ ${dateTo}`;
  return '전체';
}

function formatFilterSummary(options: OrderBookExportOptions) {
  const pieces = [
    `입고일: ${formatDateRange(options.dateFrom, options.dateTo)}`,
    `출고상태: ${options.shippingFilter && options.shippingFilter !== 'all' ? options.shippingFilter : '전체'}`,
  ];

  if (options.keyword?.trim()) {
    const label = options.filterTypeLabel?.trim() || '검색';
    pieces.push(`${label}: ${options.keyword.trim()}`);
  }

  return pieces.join('  |  ');
}

function getStatusLabel(status: OrderBookEntry['status']) {
  return status === 'ST01' ? '거래취소' : '진행중';
}

export async function exportOrderBookToExcel(
  entries: OrderBookEntry[],
  options: OrderBookExportOptions,
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('수주대장', {
    views: [{ state: 'frozen', ySplit: 5 }],
  });

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    margins: {
      left: 0.3,
      right: 0.3,
      top: 0.4,
      bottom: 0.4,
      header: 0.2,
      footer: 0.2,
    },
  };

  worksheet.columns = [
    { header: '발행번호', key: 'issueNo', width: 16 },
    { header: '발주일자', key: 'date', width: 12 },
    { header: '입고예정일', key: 'deadline', width: 13 },
    { header: '납품처', key: 'client', width: 24 },
    { header: '수신처', key: 'receiver', width: 16 },
    { header: '품목명', key: 'product', width: 28 },
    { header: '수량', key: 'qty', width: 10 },
    { header: '파렛트', key: 'pallet', width: 10 },
    { header: '박스', key: 'box', width: 10 },
    { header: '상태', key: 'status', width: 12 },
  ];

  worksheet.mergeCells('A1:J1');
  worksheet.getCell('A1').value = '수주대장';
  worksheet.getCell('A1').font = { name: 'Malgun Gothic', size: 18, bold: true, color: { argb: 'FF20304A' } };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 28;

  worksheet.mergeCells('A2:J2');
  worksheet.getCell('A2').value = `내보낸 시각: ${new Date().toLocaleString('ko-KR')}`;
  worksheet.getCell('A2').font = { name: 'Malgun Gothic', size: 10, color: { argb: 'FF5B6472' } };
  worksheet.getCell('A2').alignment = { horizontal: 'right', vertical: 'middle' };

  worksheet.mergeCells('A3:J3');
  worksheet.getCell('A3').value = formatFilterSummary(options);
  worksheet.getCell('A3').font = { name: 'Malgun Gothic', size: 10, color: { argb: 'FF405063' } };
  worksheet.getCell('A3').alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(3).height = 22;

  const headerRow = worksheet.getRow(5);
  headerRow.values = worksheet.columns.map((column) => column.header as string);
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = createSolidFill('FF3B4A63');
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(cell, 'FFCFD7E3');
  });

  entries.forEach((entry) => {
    const row = worksheet.addRow({
      issueNo: entry.issueNo || '-',
      date: entry.date || '-',
      deadline: entry.deadline || '-',
      client: entry.client || '-',
      receiver: entry.receiver || '-',
      product: entry.product || '-',
      qty: entry.qty ?? '',
      pallet: entry.pallet ?? '',
      box: entry.box ?? '',
      status: getStatusLabel(entry.status),
    });

    row.height = 22;

    row.eachCell((cell, colNumber) => {
      cell.font = {
        name: 'Malgun Gothic',
        size: 10,
        color: { argb: 'FF1F2937' },
        strike: entry.status === 'ST01',
      };
      cell.alignment = {
        horizontal: colNumber >= 7 && colNumber <= 9 ? 'right' : colNumber >= 1 && colNumber <= 3 ? 'center' : 'left',
        vertical: 'middle',
        wrapText: false,
      };
      applyCellBorder(cell);
    });

    row.getCell(7).numFmt = '#,##0';
    row.getCell(8).numFmt = '#,##0';
    row.getCell(9).numFmt = '#,##0';
    row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

    if (entry.status === 'ST01') {
      row.getCell(10).fill = createSolidFill('FFFDE8E8');
      row.getCell(10).font = {
        name: 'Malgun Gothic',
        size: 10,
        bold: true,
        strike: true,
        color: { argb: 'FFB42318' },
      };
    } else {
      row.getCell(10).fill = createSolidFill('FFEAF2FF');
      row.getCell(10).font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: 'FF1D4ED8' } };
    }
  });

  worksheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: 10 },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `수주대장_${options.fileStamp}.xlsx`);
}
