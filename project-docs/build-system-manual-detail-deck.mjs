import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const runtimeNodeModules =
  'C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const require = createRequire(import.meta.url);
const artifactToolPath = require.resolve('@oai/artifact-tool', {
  paths: [runtimeNodeModules],
});

const {
  Presentation,
  PresentationFile,
  column,
  row,
  grid,
  panel,
  text,
  image,
  shape,
  rule,
  fill,
  fixed,
  hug,
  grow,
  wrap,
  fr,
  auto,
} = await import(pathToFileURL(artifactToolPath).href);

const ROOT = 'C:/sjji/dknh-sys';
const ASSET_DIR = path.join(ROOT, 'project-docs/manual-ppt-assets');
const OUTPUT_DIR = path.join(ROOT, 'project-docs/manual-ppt-output-detail');
const PREVIEW_DIR = path.join(OUTPUT_DIR, 'previews');
const DECK_PATH = path.join(OUTPUT_DIR, 'DKH-system-manual-detail.pptx');

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(PREVIEW_DIR, { recursive: true });

const screenshotFiles = [
  '01-dashboard.png',
  '02-doc-create.png',
  '03-doc-history.png',
  '04-order-book.png',
  '05-master-client.png',
  '06-master-product.png',
  '07-monthly-closing.png',
  '08-daily-sales.png',
  '09-account.png',
  '10-press-releases.png',
];

const screenshotDataUrls = Object.fromEntries(
  await Promise.all(
    screenshotFiles.map(async (fileName) => {
      const bytes = await fs.readFile(path.join(ASSET_DIR, fileName));
      return [fileName, `data:image/png;base64,${bytes.toString('base64')}`];
    }),
  ),
);

const W = 1920;
const H = 1080;
const font = 'Malgun Gothic';
const C = {
  ink: '#17202A',
  body: '#2B3645',
  muted: '#66768A',
  faint: '#EEF3F7',
  line: '#CED9E4',
  navy: '#17466F',
  blue: '#246FA8',
  cyan: '#24A6A6',
  green: '#2E8F63',
  amber: '#C47A1B',
  red: '#B94A48',
  white: '#FFFFFF',
  black: '#0B1220',
};

const presentation = Presentation.create({
  slideSize: { width: W, height: H },
});

function tx(value, options = {}) {
  return text(value, {
    name: options.name,
    width: options.width ?? fill,
    height: options.height ?? hug,
    style: {
      fontFace: font,
      fontSize: options.size ?? 26,
      bold: options.bold ?? false,
      color: options.color ?? C.body,
      lineHeight: options.lineHeight ?? 1.18,
    },
  });
}

function addSlide(root) {
  const slide = presentation.slides.add();
  slide.compose(root, {
    frame: { left: 0, top: 0, width: W, height: H },
    baseUnit: 8,
  });
}

function header(no, section, title, subtitle = '') {
  return column(
    { name: `header-${no}`, width: fill, height: hug, gap: 10 },
    [
      row(
        { width: fill, height: hug, alignItems: 'center', gap: 16 },
        [
          tx(String(no).padStart(2, '0'), {
            name: `slide-${no}-num`,
            width: fixed(52),
            size: 21,
            bold: true,
            color: C.cyan,
          }),
          rule({ name: `slide-${no}-rule`, width: fixed(104), stroke: C.cyan, weight: 4 }),
          tx(section, {
            name: `slide-${no}-section`,
            width: fill,
            size: 21,
            bold: true,
            color: C.muted,
          }),
        ],
      ),
      tx(title, {
        name: `slide-${no}-title`,
        size: 48,
        bold: true,
        color: C.ink,
        lineHeight: 1.08,
      }),
      subtitle
        ? tx(subtitle, {
            name: `slide-${no}-subtitle`,
            width: wrap(1400),
            size: 22,
            color: C.muted,
            lineHeight: 1.22,
          })
        : shape({ name: `slide-${no}-subtitle-empty`, width: fixed(1), height: fixed(1), fill: 'transparent' }),
    ],
  );
}

function foot(note = '상세 운영 매뉴얼 기준: project-docs/system-manual.md') {
  return tx(note, {
    name: `footer-${presentation.slides.items.length + 1}`,
    size: 15,
    color: '#8A97A8',
  });
}

function dot(textValue, color = C.cyan, size = 23) {
  return row(
    { name: `dot-row-${textValue.slice(0, 10)}`, width: fill, height: hug, gap: 12, alignItems: 'start' },
    [
      shape({
        name: `dot-${textValue.slice(0, 8)}`,
        width: fixed(8),
        height: fixed(8),
        fill: color,
        borderRadius: 'rounded-full',
      }),
      tx(textValue, {
        name: `dot-text-${textValue.slice(0, 14)}`,
        size,
        width: fill,
        color: C.body,
        lineHeight: 1.22,
      }),
    ],
  );
}

function label(textValue, color = C.blue) {
  return panel(
    {
      name: `label-${textValue}`,
      width: hug,
      height: hug,
      fill: color,
      borderRadius: 18,
      padding: { x: 15, y: 7 },
    },
    tx(textValue, { name: `label-text-${textValue}`, width: hug, size: 17, bold: true, color: C.white }),
  );
}

function screen(fileName, alt, width = 980, height = 551) {
  return panel(
    {
      name: `screen-${fileName}`,
      width: fixed(width),
      height: fixed(height),
      padding: 8,
      fill: C.white,
      line: { color: C.line, width: 2 },
      borderRadius: 10,
    },
    image({
      name: `image-${fileName}`,
      dataUrl: screenshotDataUrls[fileName],
      contentType: 'image/png',
      width: fill,
      height: fill,
      fit: 'contain',
      alt,
    }),
  );
}

function infoBlock(title, bullets, color = C.blue) {
  return column(
    { name: `block-${title}`, width: fill, height: hug, gap: 12 },
    [
      row({ width: fill, height: hug, gap: 10, alignItems: 'center' }, [
        shape({ name: `block-mark-${title}`, width: fixed(9), height: fixed(31), fill: color, borderRadius: 5 }),
        tx(title, { name: `block-title-${title}`, size: 29, bold: true, color: C.ink }),
      ]),
      column({ width: fill, height: hug, gap: 9 }, bullets.map((b) => dot(b, color, 21))),
    ],
  );
}

function tableLike(headers, rows, widths, name) {
  const cols = widths.map((w) => fr(w));
  return column(
    { name, width: fill, height: hug, gap: 0 },
    [
      grid(
        {
          name: `${name}-header`,
          width: fill,
          height: fixed(54),
          columns: cols,
          columnGap: 0,
        },
        headers.map((h, i) =>
          panel(
            {
              name: `${name}-h-${i}`,
              width: fill,
              height: fill,
              fill: C.navy,
              padding: { x: 15, y: 11 },
              line: { color: C.white, width: 1 },
            },
            tx(h, { name: `${name}-htext-${i}`, size: 19, bold: true, color: C.white }),
          ),
        ),
      ),
      ...rows.map((cells, r) =>
        grid(
          {
            name: `${name}-row-${r}`,
            width: fill,
            height: fixed(78),
            columns: cols,
            columnGap: 0,
          },
          cells.map((cell, c) =>
            panel(
              {
                name: `${name}-cell-${r}-${c}`,
                width: fill,
                height: fill,
                fill: r % 2 ? '#F7FAFC' : C.white,
                padding: { x: 15, y: 12 },
                line: { color: C.line, width: 1 },
              },
              tx(cell, {
                name: `${name}-text-${r}-${c}`,
                size: c === 0 ? 19 : 18,
                bold: c === 0,
                color: c === 0 ? C.ink : C.body,
                lineHeight: 1.18,
              }),
            ),
          ),
        ),
      ),
    ],
  );
}

function flowNode(title, desc, color = C.blue) {
  return panel(
    {
      name: `flow-${title}`,
      width: fill,
      height: fill,
      fill: '#F7FAFC',
      line: { color, width: 2 },
      borderRadius: 10,
      padding: { x: 18, y: 20 },
    },
    column(
      { width: fill, height: fill, gap: 11, justify: 'center' },
      [
        tx(title, { name: `flow-title-${title}`, size: 25, bold: true, color }),
        tx(desc, { name: `flow-desc-${title}`, size: 18, color: C.body, lineHeight: 1.2 }),
      ],
    ),
  );
}

addSlide(
  grid(
    {
      name: 'cover-root',
      width: fill,
      height: fill,
      columns: [fr(0.92), fr(1.08)],
      rows: [fr(1)],
      padding: { x: 86, y: 74 },
      columnGap: 56,
      fill: '#F8FAFC',
    },
    [
      column(
        { name: 'cover-copy', width: fill, height: fill, justify: 'between' },
        [
          column({ width: fill, height: hug, gap: 22 }, [
            tx('DKH 업무관리시스템', { name: 'cover-title', size: 76, bold: true, color: C.ink, lineHeight: 1.02 }),
            tx('상세 운영 매뉴얼', { name: 'cover-subtitle', size: 50, bold: true, color: C.blue }),
            rule({ name: 'cover-rule', width: fixed(260), stroke: C.cyan, weight: 7 }),
            tx('업무 흐름, 저장 로직, 집계 기준, 예외상황까지 화면 캡쳐와 함께 정리한 교육용 PPT', {
              name: 'cover-desc',
              width: wrap(720),
              size: 27,
              color: C.muted,
              lineHeight: 1.28,
            }),
          ]),
          column({ width: fill, height: hug, gap: 10 }, [
            label('운영자 교육용', C.navy),
            tx('작성일 2026-05-14', { name: 'cover-date', size: 20, color: C.muted }),
          ]),
        ],
      ),
      screen('01-dashboard.png', '대시보드 화면 캡쳐', 920, 517),
    ],
  ),
);

addSlide(
  column(
    { name: 's2-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 28 },
    [
      header(2, '핵심 구조', '이 시스템은 문서 품목을 기준으로 수주와 정산을 연결합니다.'),
      grid(
        { width: fill, height: grow(1), columns: [fr(1), auto, fr(1), auto, fr(1), auto, fr(1)], columnGap: 16 },
        [
          flowNode('마스터', '납품처, 수신처, 공급자, 품목, 단가', C.green),
          tx('→', { name: 'arrow-1', width: fixed(46), size: 48, bold: true, color: C.cyan }),
          flowNode('문서 작성', '발행번호, 기본정보, 품목, VAT, 비고', C.blue),
          tx('→', { name: 'arrow-2', width: fixed(46), size: 48, bold: true, color: C.cyan }),
          flowNode('수주대장', '문서 저장 시 품목별 수주 항목 자동 생성', C.amber),
          tx('→', { name: 'arrow-3', width: fixed(46), size: 48, bold: true, color: C.cyan }),
          flowNode('정산', '월마감, 일일판매, 대시보드 집계', C.navy),
        ],
      ),
      tableLike(
        ['상태/삭제값', '의미', '운영 영향'],
        [
          ['ST00', '정상 또는 진행중', '대시보드, 월마감, 일일판매 집계에 포함'],
          ['ST01', '거래취소', '문서, 품목, 수주대장, 정산 집계에서 제외'],
          ['del_yn = Y', '소프트 삭제', '일반 목록과 집계에서 보이지 않음'],
        ],
        [0.8, 1.1, 2.0],
        'state-table',
      ),
      foot(),
    ],
  ),
);

addSlide(
  column(
    { name: 's3-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 26 },
    [
      header(3, '로그인/권한', '접근 문제는 계정 상태와 권한을 먼저 확인합니다.'),
      row({ width: fill, height: grow(1), gap: 40, alignItems: 'center' }, [
        screen('09-account.png', '계정 관리 화면', 940, 529),
        column({ width: fill, height: hug, gap: 24 }, [
          infoBlock('로그인 실패 기준', [
            '아이디나 비밀번호가 비어 있으면 로그인 시도 전 안내합니다.',
            '계정이 없거나 비밀번호가 틀리면 동일한 오류 메시지로 처리합니다.',
            '잠긴 계정은 관리자에게 문의하도록 안내합니다.',
          ], C.red),
          infoBlock('권한 기준', [
            '일반 사용자는 핵심 업무 메뉴에 접근합니다.',
            '관리자는 일일판매와 계정 관리까지 접근합니다.',
            '관리자 메뉴 직접 접근 시 권한 없음 안내 후 대시보드로 이동합니다.',
          ], C.navy),
        ]),
      ]),
      foot(),
    ],
  ),
);

addSlide(
  column(
    { name: 's4-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 26 },
    [
      header(4, '대시보드', '오늘 해야 할 일은 수주대장 입고 예정 항목에서 계산됩니다.'),
      row({ width: fill, height: grow(1), gap: 38, alignItems: 'center' }, [
        screen('01-dashboard.png', '대시보드 화면', 1010, 568),
        column({ width: fill, height: hug, gap: 22 }, [
          infoBlock('집계 포함', [
            '삭제되지 않은 수주대장 항목만 대상입니다.',
            '입고일이 오늘이면 오늘의 할 일로 분류합니다.',
            '입고일이 오늘 이전이고 미출고면 지연 건수로 분류합니다.',
          ], C.blue),
          infoBlock('예외 처리', [
            '거래취소 상태는 정상 건수와 분리합니다.',
            '최근 등록 문서는 삭제되지 않은 문서만 보여줍니다.',
            '대시보드 수치가 다르면 수주대장 상태와 입고일을 먼저 확인합니다.',
          ], C.amber),
        ]),
      ]),
      foot(),
    ],
  ),
);

addSlide(
  column(
    { name: 's5-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 24 },
    [
      header(5, '문서 작성 1', '납품처와 수신처 선택이 품목 목록과 자동입력의 출발점입니다.'),
      row({ width: fill, height: grow(1), gap: 36, alignItems: 'center' }, [
        screen('02-doc-create.png', '문서 작성 화면', 1020, 574),
        column({ width: fill, height: hug, gap: 21 }, [
          infoBlock('기본정보 로직', [
            '발행번호는 최신 발행번호 + 1로 생성하고, 없으면 26001부터 시작합니다.',
            '납품처 선택 시 주소, 담당자, 연락처, 유의사항을 자동 반영합니다.',
            '수신처 목록은 선택한 납품처 기준으로 다시 필터링됩니다.',
          ], C.blue),
          infoBlock('사용자가 자주 놓치는 부분', [
            '수신처가 비어 있으면 품목 목록이 예상과 다르게 보일 수 있습니다.',
            '납품처를 바꾸면 기존 수신처와 품목 선택을 다시 확인해야 합니다.',
            '발주일과 입고일은 대시보드, 수주대장, 월마감 기준에 영향을 줍니다.',
          ], C.amber),
        ]),
      ]),
      foot(),
    ],
  ),
);

addSlide(
  column(
    { name: 's6-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 24 },
    [
      header(6, '문서 작성 2', '품목 행은 수량, 단가, VAT, 박스 기준을 함께 계산합니다.'),
      grid(
        { width: fill, height: grow(1), columns: [fr(1), fr(1)], rows: [fr(1), fr(1)], columnGap: 26, rowGap: 24 },
        [
          infoBlock('품목 선택', [
            '선택 가능한 품목은 납품처와 수신처 조건으로 제한됩니다.',
            '표시명은 문서용 품목명 또는 기본 품목명을 우선순위로 사용합니다.',
            '단가와 규격은 등록된 납품처별 품목 정보를 따라옵니다.',
          ], C.green),
          infoBlock('계산 기준', [
            '공급가액은 수량 × 단가입니다.',
            'VAT 적용 품목은 공급가액의 10%를 계산합니다.',
            '총액은 공급가액 + VAT입니다.',
          ], C.blue),
          infoBlock('포장/수량 예외', [
            '박스당 수량이 있으면 BOX 수량을 계산합니다.',
            '파레트 기준이 있으면 팔레트 수량을 계산합니다.',
            '기준값이 없으면 해당 계산은 빈 값 또는 0으로 남습니다.',
          ], C.amber),
          infoBlock('저장 전 확인', [
            '품목이 하나도 없으면 저장할 수 없습니다.',
            '수량이 0이거나 단가가 비정상인 행은 저장 전 확인해야 합니다.',
            '비고는 문서 출력과 일부 후속 화면의 참고값으로 쓰입니다.',
          ], C.red),
        ],
      ),
      foot(),
    ],
  ),
);

addSlide(
  column(
    { name: 's7-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 26 },
    [
      header(7, '저장 로직', '문서 저장은 문서, 품목, 수주대장까지 한 번에 반영됩니다.'),
      grid(
        { width: fill, height: grow(1), columns: [fr(1), auto, fr(1), auto, fr(1), auto, fr(1)], columnGap: 14 },
        [
          flowNode('1. 문서 검증', '필수값, 품목 행, 수량/단가 확인', C.red),
          tx('→', { name: 'save-arrow-1', width: fixed(42), size: 44, bold: true, color: C.cyan }),
          flowNode('2. documents', '발행번호, 납품처, 수신처, 일정 저장', C.blue),
          tx('→', { name: 'save-arrow-2', width: fixed(42), size: 44, bold: true, color: C.cyan }),
          flowNode('3. document_items', '품목별 수량, 단가, VAT, 비고 저장', C.green),
          tx('→', { name: 'save-arrow-3', width: fixed(42), size: 44, bold: true, color: C.cyan }),
          flowNode('4. order_book', '품목별 수주 항목 자동 생성', C.amber),
        ],
      ),
      tableLike(
        ['상황', '처리 방식', '운영자가 볼 것'],
        [
          ['저장 실패', '검증 오류 또는 DB 저장 오류 안내', '필수값, 품목 수량, 네트워크 상태 확인'],
          ['저장 후 수주대장 누락', '문서 품목 기준 자동 생성 실패 가능성', '발행 이력 상세와 수주대장 문서번호 비교'],
          ['문서 수정 저장', '기존 품목과 수주 항목을 동기화', '삭제/취소 품목이 집계에서 빠졌는지 확인'],
        ],
        [0.9, 1.3, 1.6],
        'save-exception-table',
      ),
      foot(),
    ],
  ),
);

addSlide(
  column(
    { name: 's8-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 24 },
    [
      header(8, '미리보기/출력', '엑셀 다운로드 전에는 미리보기로 출력 데이터를 먼저 검증합니다.'),
      row({ width: fill, height: grow(1), gap: 36, alignItems: 'center' }, [
        screen('02-doc-create.png', '문서 작성 화면', 1010, 568),
        column({ width: fill, height: hug, gap: 22 }, [
          infoBlock('미리보기 기준', [
            '화면에 입력된 문서 기본정보와 품목 행을 그대로 사용합니다.',
            '저장 전에도 출력 모양과 계산값을 확인할 수 있습니다.',
            '필수값이 부족하면 미리보기나 다운로드가 막힐 수 있습니다.',
          ], C.blue),
          infoBlock('발행이력 불러오기', [
            '이전 문서를 복사해 새 문서 작성의 출발점으로 사용할 수 있습니다.',
            '복사 후 납품처, 수신처, 날짜, 품목 단가를 다시 확인합니다.',
            '과거 문서의 단가가 현재 기준과 다를 수 있습니다.',
          ], C.amber),
        ]),
      ]),
      foot(),
    ],
  ),
);

addSlide(
  column(
    { name: 's9-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 24 },
    [
      header(9, '발행 이력', '수정과 거래취소는 문서뿐 아니라 품목/수주대장까지 영향을 줍니다.'),
      row({ width: fill, height: grow(1), gap: 36, alignItems: 'center' }, [
        screen('03-doc-history.png', '발행 이력 화면', 1010, 568),
        column({ width: fill, height: hug, gap: 21 }, [
          infoBlock('수정 저장', [
            '문서 기본정보를 저장하고 품목 변경분을 반영합니다.',
            '문서 품목과 연결된 수주대장 항목도 같이 맞춥니다.',
            '과거 데이터는 document_item_id 보정이 필요할 수 있습니다.',
          ], C.blue),
          infoBlock('거래취소', [
            '문서 전체 취소는 문서와 모든 품목을 ST01로 변경합니다.',
            '품목별 취소는 해당 품목과 연결 수주 항목만 ST01로 변경합니다.',
            '취소된 데이터는 월마감과 일일판매 집계에서 제외됩니다.',
          ], C.red),
        ]),
      ]),
      foot(),
    ],
  ),
);

addSlide(
  column(
    { name: 's10-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 24 },
    [
      header(10, '수주대장', '문서에서 온 항목과 수동 등록 항목의 처리 기준을 구분합니다.'),
      row({ width: fill, height: grow(1), gap: 36, alignItems: 'center' }, [
        screen('04-order-book.png', '수주대장 화면', 1010, 568),
        column({ width: fill, height: hug, gap: 21 }, [
          infoBlock('조회/표시 로직', [
            '입고일 기간, 검색어, 납품처, 수신처 조건으로 조회합니다.',
            '수신처 검색은 연결 문서 정보까지 참고합니다.',
            '표시명은 문서 품목명, 등록 품목명 순서로 우선합니다.',
          ], C.blue),
          infoBlock('출고상태 처리', [
            '출고상태는 미출고 또는 출고로 관리합니다.',
            '일괄 출고처리는 선택된 항목에만 적용됩니다.',
            '거래취소 품목은 출고 관리 대상과 집계에서 분리됩니다.',
          ], C.amber),
        ]),
      ]),
      foot(),
    ],
  ),
);

addSlide(
  column(
    { name: 's11-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 24 },
    [
      header(11, '마스터 관리', '납품처, 공급자, 품목은 문서 자동입력의 기준 정보입니다.'),
      grid(
        { width: fill, height: grow(1), columns: [fr(1), fr(1), fr(1)], columnGap: 24 },
        [
          column({ width: fill, height: fill, gap: 18 }, [
            screen('05-master-client.png', '납품처 관리', 540, 304),
            infoBlock('납품처', [
              '주소, 담당자, 연락처, 입고시간, 비고를 관리합니다.',
              '비활성 납품처는 운영상 사용 여부를 구분합니다.',
              '삭제는 del_yn으로 처리되어 일반 목록에서 제외됩니다.',
            ], C.green),
          ]),
          column({ width: fill, height: fill, gap: 18 }, [
            screen('06-master-product.png', '품목 관리', 540, 304),
            infoBlock('품목', [
              '공통 품목과 납품처별 품목을 나눠 관리합니다.',
              '문서명, 단가, 수신처, 포장 기준이 문서 작성에 반영됩니다.',
              '이미 사용된 품목은 삭제보다 비활성/신규 등록이 안전합니다.',
            ], C.blue),
          ]),
          column({ width: fill, height: fill, gap: 18 }, [
            screen('02-doc-create.png', '문서 작성 공급자', 540, 304),
            infoBlock('공급자', [
              '기본 공급자 정보는 문서 출력에 사용됩니다.',
              '기본 공급자 id 1을 우선 기준으로 사용합니다.',
              '문서 작성 시점의 공급자 정보를 복사해 출력합니다.',
            ], C.amber),
          ]),
        ],
      ),
      foot(),
    ],
  ),
);

addSlide(
  column(
    { name: 's12-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 25 },
    [
      header(12, '단가 변경', '단가 수정은 앞으로 작성할 문서와 일부 미출고 항목에 영향을 줍니다.'),
      row({ width: fill, height: grow(1), gap: 38, alignItems: 'center' }, [
        screen('06-master-product.png', '품목 관리 단가 수정', 990, 557),
        tableLike(
          ['구분', '적용 기준', '주의사항'],
          [
            ['품목 직접 저장', '납품처별 품목의 기준 단가를 저장', '기존 발행 문서 금액은 자동 변경하지 않음'],
            ['단가 수정 탭', '대상 품목을 미리보기 후 변경', '문서 품목 가격 변경 대상 여부를 확인'],
            ['기존 문서', '발행 당시 저장된 금액 우선', '월마감 금액 차이는 문서 상세 금액부터 확인'],
            ['미출고 수주', '문서 연결 여부에 따라 반영 범위가 달라짐', '수주대장 금액과 문서 품목 금액을 비교'],
          ],
          [0.8, 1.2, 1.5],
          'price-table',
        ),
      ]),
      foot(),
    ],
  ),
);

addSlide(
  column(
    { name: 's13-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 24 },
    [
      header(13, '월마감', '월마감은 날짜 우선순위와 거래취소 제외 기준이 핵심입니다.'),
      row({ width: fill, height: grow(1), gap: 36, alignItems: 'center' }, [
        screen('07-monthly-closing.png', '월마감 화면', 1010, 568),
        column({ width: fill, height: hug, gap: 21 }, [
          infoBlock('집계 기준', [
            '삭제되지 않은 문서와 품목만 집계합니다.',
            '문서 또는 품목이 ST01이면 제외합니다.',
            '입고일은 품목 입고일, 문서 입고일, 품목 발주일, 문서 발주일 순서로 판단합니다.',
          ], C.blue),
          infoBlock('금액 기준', [
            '공급가액, VAT, 총액은 문서 품목에 저장된 값을 기준으로 합니다.',
            '품목명은 문서 품목명, 납품처별 품목명, 공통 품목명 순서로 사용합니다.',
            '비고는 입력 후 Enter 또는 포커스 이동으로 저장합니다.',
          ], C.amber),
        ]),
      ]),
      foot(),
    ],
  ),
);

addSlide(
  column(
    { name: 's14-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 24 },
    [
      header(14, '일일판매', '일일판매는 관리자 전용이며 제품/문서 데이터를 월 단위로 묶습니다.'),
      row({ width: fill, height: grow(1), gap: 36, alignItems: 'center' }, [
        screen('08-daily-sales.png', '일일판매 화면', 1010, 568),
        column({ width: fill, height: hug, gap: 21 }, [
          infoBlock('행 생성 기준', [
            '품목 마스터와 해당 월 문서 품목을 함께 읽어 행을 만듭니다.',
            '납품처, 품목명, 수신처, 단가 등의 키로 행을 묶습니다.',
            '일자별 수량과 총수량, 입고금액, 출고금액을 계산합니다.',
          ], C.blue),
          infoBlock('제외/예외 기준', [
            '삭제 또는 거래취소된 문서/품목은 제외합니다.',
            '문서 금액이 있으면 발행 당시 금액을 우선 사용합니다.',
            '평균 단가는 수량 가중 방식으로 계산될 수 있습니다.',
          ], C.red),
        ]),
      ]),
      foot(),
    ],
  ),
);

addSlide(
  column(
    { name: 's15-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 24 },
    [
      header(15, '보도자료', '보도자료는 업무 데이터와 분리된 참고 자료 영역입니다.'),
      row({ width: fill, height: grow(1), gap: 36, alignItems: 'center' }, [
        screen('10-press-releases.png', '보도자료 화면', 1010, 568),
        column({ width: fill, height: hug, gap: 22 }, [
          infoBlock('사용 목적', [
            '수집된 제목, 발행일, 요약, 본문을 확인합니다.',
            '영업/운영 참고 자료로 활용합니다.',
            '문서, 수주, 월마감 집계에는 영향을 주지 않습니다.',
          ], C.green),
          infoBlock('운영 주의', [
            '업무 핵심 데이터와 분리해서 관리합니다.',
            '목록에 없으면 수집 상태나 키워드 설정을 확인합니다.',
            '외부 자료이므로 최종 인용 전 원문을 확인합니다.',
          ], C.amber),
        ]),
      ]),
      foot(),
    ],
  ),
);

addSlide(
  column(
    { name: 's16-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 26 },
    [
      header(16, '자주 발생하는 상황', '문제 원인을 찾을 때는 상태값, 삭제값, 날짜 기준을 먼저 봅니다.'),
      tableLike(
        ['증상', '가능 원인', '확인 순서'],
        [
          ['품목 목록이 안 보임', '납품처/수신처 조건 불일치 또는 비활성 품목', '납품처 선택 → 수신처 선택 → 품목 관리 등록 상태 확인'],
          ['월마감 금액이 다름', '거래취소 제외, 발행 당시 단가 사용, 날짜 기준 차이', '문서 상세 금액 → 품목 상태 → 입고일 우선순위 확인'],
          ['수주대장과 발행이력 불일치', '문서 수정 저장 또는 과거 데이터 연결 누락', '문서번호 → document_item 연결 → 수주 항목 상태 확인'],
          ['대시보드 지연 건수 이상', '입고일이 과거이고 미출고 상태인 항목 존재', '수주대장 입고일/출고상태/거래취소 여부 확인'],
          ['삭제했는데 과거 자료가 보임', '소프트 삭제와 과거 문서 보존 기준 차이', '마스터 목록과 발행 문서의 저장 시점 데이터 구분'],
        ],
        [0.9, 1.3, 1.7],
        'trouble-table',
      ),
      foot('운영 팁: 화면 문제가 아니라 데이터 기준 차이인 경우가 많으므로, 먼저 ST00/ST01과 del_yn을 확인합니다.'),
    ],
  ),
);

addSlide(
  column(
    { name: 's17-root', width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 26 },
    [
      header(17, '운영 체크리스트', '업무 마감 전 확인하면 좋은 기준만 모았습니다.'),
      grid(
        { width: fill, height: grow(1), columns: [fr(1), fr(1)], rows: [fr(1), fr(1)], columnGap: 28, rowGap: 26 },
        [
          infoBlock('문서 작성 전', [
            '납품처와 수신처가 맞는지 확인합니다.',
            '품목명, 수량, 단가, VAT 적용 여부를 확인합니다.',
            '입고일이 실제 마감 기준과 맞는지 확인합니다.',
          ], C.blue),
          infoBlock('발행 후 수정 전', [
            '이미 출고 또는 마감에 반영된 문서인지 확인합니다.',
            '품목 삭제와 거래취소의 차이를 구분합니다.',
            '수정 후 수주대장 항목이 같이 맞는지 확인합니다.',
          ], C.amber),
          infoBlock('마감 전', [
            'ST01 거래취소 품목이 제외되었는지 확인합니다.',
            '월마감 비고가 저장되었는지 확인합니다.',
            '엑셀 다운로드 전 기간과 납품처 필터를 확인합니다.',
          ], C.green),
          infoBlock('관리자 작업', [
            '계정 권한 변경 후 사용자에게 재로그인을 안내합니다.',
            '단가 변경은 대상 품목을 미리보기로 확인합니다.',
            '마스터 삭제보다 비활성 또는 신규 등록을 우선 검토합니다.',
          ], C.red),
        ],
      ),
      foot(),
    ],
  ),
);

addSlide(
  column(
    { name: 's18-root', width: fill, height: fill, padding: { x: 94, y: 76 }, gap: 34, fill: '#F8FAFC' },
    [
      header(18, '마무리', '운영 판단의 기준은 “문서 품목 상태”입니다.'),
      row({ width: fill, height: grow(1), gap: 54, alignItems: 'center' }, [
        column({ width: fixed(760), height: hug, gap: 26 }, [
          tx('정상 집계는 ST00 + del_yn=N에서 시작합니다.', {
            name: 'close-claim-1',
            size: 48,
            bold: true,
            color: C.ink,
            lineHeight: 1.08,
          }),
          tx('문서 작성, 발행 이력, 수주대장, 월마감, 일일판매가 모두 같은 데이터를 다른 관점으로 보는 구조입니다.', {
            name: 'close-copy',
            size: 27,
            color: C.muted,
            lineHeight: 1.3,
          }),
        ]),
        column({ width: fill, height: hug, gap: 18 }, [
          label('문서', C.blue),
          label('문서 품목', C.green),
          label('수주대장', C.amber),
          label('정산 집계', C.navy),
          rule({ name: 'close-rule', width: fixed(360), stroke: C.cyan, weight: 5 }),
          tx('상세 기준은 project-docs/system-manual.md에 계속 누적해 관리합니다.', {
            name: 'close-note',
            size: 22,
            color: C.muted,
          }),
        ]),
      ]),
      foot('PPTX: DKH-system-manual-detail.pptx'),
    ],
  ),
);

const pptxBlob = await PresentationFile.exportPptx(presentation);
await pptxBlob.save(DECK_PATH);

const previewPaths = [];
for (const [index, slide] of presentation.slides.items.entries()) {
  const png = await slide.export({ format: 'png' });
  const outPath = path.join(PREVIEW_DIR, `slide-${String(index + 1).padStart(2, '0')}.png`);
  await fs.writeFile(outPath, Buffer.from(await png.arrayBuffer()));
  previewPaths.push(outPath);
}

const layout = await presentation.export({ format: 'layout' });
await fs.writeFile(path.join(OUTPUT_DIR, 'layout.json'), Buffer.from(await layout.arrayBuffer()));

console.log(
  JSON.stringify(
    {
      deckPath: DECK_PATH,
      previewDir: PREVIEW_DIR,
      slides: presentation.slides.items.length,
      previews: previewPaths,
    },
    null,
    2,
  ),
);
