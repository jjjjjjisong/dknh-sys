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
  wrap,
  grow,
  fr,
} = await import(pathToFileURL(artifactToolPath).href);

const ROOT = 'C:/sjji/dknh-sys';
const ASSET_DIR = path.join(ROOT, 'project-docs/manual-ppt-assets');
const OUTPUT_DIR = path.join(ROOT, 'project-docs/manual-ppt-output');
const PREVIEW_DIR = path.join(OUTPUT_DIR, 'previews');
const DECK_PATH = path.join(OUTPUT_DIR, 'DKH-system-manual.pptx');

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
const C = {
  ink: '#1B2430',
  muted: '#64748B',
  soft: '#F4F7FA',
  line: '#DDE5EE',
  brand: '#1D5D9B',
  brandDark: '#113B63',
  accent: '#2FB7A1',
  warn: '#E6A23C',
  white: '#FFFFFF',
};

const font = 'Malgun Gothic';

const presentation = Presentation.create({
  slideSize: { width: W, height: H },
});

function t(value, options = {}) {
  return text(value, {
    width: options.width ?? fill,
    height: options.height ?? hug,
    style: {
      fontFace: font,
      fontSize: options.size ?? 28,
      color: options.color ?? C.ink,
      bold: options.bold ?? false,
      lineHeight: options.lineHeight ?? 1.18,
    },
    ...options.extra,
    name: options.name,
  });
}

function bullet(textValue) {
  return row(
    { width: fill, height: hug, gap: 12, alignItems: 'start' },
    [
      shape({
        name: `dot-${textValue.slice(0, 8)}`,
        width: fixed(8),
        height: fixed(8),
        fill: C.accent,
        borderRadius: 'rounded-full',
      }),
      t(textValue, { size: 24, color: C.ink, width: fill }),
    ],
  );
}

function header(slideNo, section, title, subtitle = '') {
  return column(
    { width: fill, height: hug, gap: 10 },
    [
      row(
        { width: fill, height: hug, alignItems: 'center', gap: 18 },
        [
          t(String(slideNo).padStart(2, '0'), {
            name: `slide-${slideNo}-num`,
            size: 22,
            bold: true,
            color: C.accent,
            width: fixed(48),
          }),
          rule({ width: fixed(96), stroke: C.accent, weight: 4 }),
          t(section, {
            name: `slide-${slideNo}-section`,
            size: 22,
            bold: true,
            color: C.muted,
            width: fill,
          }),
        ],
      ),
      t(title, {
        name: `slide-${slideNo}-title`,
        size: 50,
        bold: true,
        width: fill,
        lineHeight: 1.08,
      }),
      subtitle
        ? t(subtitle, {
            name: `slide-${slideNo}-subtitle`,
            size: 24,
            color: C.muted,
            width: wrap(1280),
          })
        : shape({ width: fixed(1), height: fixed(1), fill: 'transparent' }),
    ],
  );
}

function screenshotFrame(fileName, alt, width = 1180, height = 664) {
  return panel(
    {
      name: `screen-frame-${fileName}`,
      width: fixed(width),
      height: fixed(height),
      padding: 10,
      fill: C.white,
      line: { color: C.line, width: 2 },
      borderRadius: 14,
    },
    image({
      name: `screenshot-${fileName}`,
      dataUrl: screenshotDataUrls[fileName],
      contentType: 'image/png',
      width: fill,
      height: fill,
      fit: 'contain',
      alt,
    }),
  );
}

function addSlide(root) {
  const slide = presentation.slides.add();
  slide.compose(root, {
    frame: { left: 0, top: 0, width: W, height: H },
    baseUnit: 8,
  });
  return slide;
}

function addCover() {
  addSlide(
    grid(
      {
        name: 'cover-root',
        width: fill,
        height: fill,
        columns: [fr(0.86), fr(1.14)],
        rows: [fr(1)],
        columnGap: 54,
        padding: { x: 86, y: 78 },
      },
      [
        column(
          { name: 'cover-copy', width: fill, height: fill, justify: 'between' },
          [
            column(
              { width: fill, height: hug, gap: 24 },
              [
                t('DKH 업무관리시스템', {
                  name: 'cover-title',
                  size: 76,
                  bold: true,
                  width: fill,
                  lineHeight: 1.02,
                }),
                t('화면 캡쳐 기반 사용자 매뉴얼', {
                  name: 'cover-subtitle',
                  size: 36,
                  color: C.brand,
                  bold: true,
                  width: fill,
                }),
                rule({ width: fixed(240), stroke: C.accent, weight: 6 }),
                t('문서 작성부터 발행 이력, 수주대장, 월마감, 마스터 관리까지 실제 화면 흐름으로 안내합니다.', {
                  name: 'cover-copyline',
                  size: 28,
                  color: C.muted,
                  width: wrap(680),
                  lineHeight: 1.25,
                }),
              ],
            ),
            t('작성일 2026-05-14', {
              name: 'cover-date',
              size: 22,
              color: C.muted,
              width: fill,
            }),
          ],
        ),
        screenshotFrame('01-dashboard.png', '대시보드 화면 캡쳐', 930, 523),
      ],
    ),
  );
}

function addOverview() {
  const flows = [
    ['기초정보', '납품처, 공급자, 품목, 계정'],
    ['문서작성', '출고의뢰서, 거래명세서 입력'],
    ['발행관리', '수정, 거래취소, 엑셀 출력'],
    ['출고관리', '수주대장 미출고/출고 상태'],
    ['정산', '월마감, 종합장, 일일판매'],
  ];

  addSlide(
    column(
      { name: 'overview-root', width: fill, height: fill, padding: { x: 86, y: 64 }, gap: 40 },
      [
        header(2, '전체 구조', '업무 흐름은 “마스터 → 문서 → 출고 → 정산”으로 이어집니다.'),
        grid(
          { width: fill, height: grow(1), columns: [fr(1), fr(1), fr(1), fr(1), fr(1)], columnGap: 22 },
          flows.map(([label, desc], index) =>
            panel(
              {
                name: `flow-${index}`,
                fill: index === 1 ? '#E8F4FF' : C.soft,
                line: { color: index === 1 ? C.brand : C.line, width: 2 },
                borderRadius: 16,
                padding: { x: 24, y: 30 },
              },
              column(
                { width: fill, height: fill, gap: 18, justify: 'center' },
                [
                  t(label, { name: `flow-label-${index}`, size: 30, bold: true, color: index === 1 ? C.brandDark : C.ink }),
                  t(desc, { name: `flow-desc-${index}`, size: 22, color: C.muted, lineHeight: 1.28 }),
                ],
              ),
            ),
          ),
        ),
        t('권한 기준: 일반 사용자는 핵심 업무 메뉴를 사용하고, 관리자는 일일판매와 계정 관리까지 접근합니다.', {
          name: 'overview-note',
          size: 24,
          color: C.muted,
        }),
      ],
    ),
  );
}

function addScreenSlide(no, section, title, fileName, alt, bullets, footer = '') {
  addSlide(
    column(
      { name: `screen-root-${no}`, width: fill, height: fill, padding: { x: 70, y: 52 }, gap: 26 },
      [
        header(no, section, title),
        row(
          { width: fill, height: grow(1), gap: 36, alignItems: 'center' },
          [
            screenshotFrame(fileName, alt, 1180, 664),
            column(
              { width: fill, height: hug, gap: 22 },
              [
                ...bullets.map(bullet),
                footer
                  ? panel(
                      {
                        name: `tip-${no}`,
                        width: fill,
                        height: hug,
                        fill: '#FFF7E7',
                        line: { color: '#F3C676', width: 1 },
                        borderRadius: 12,
                        padding: { x: 20, y: 18 },
                      },
                      t(footer, { name: `tip-text-${no}`, size: 21, color: '#7A4F00', lineHeight: 1.25 }),
                    )
                  : shape({ width: fixed(1), height: fixed(1), fill: 'transparent' }),
              ],
            ),
          ],
        ),
      ],
    ),
  );
}

addCover();
addOverview();

addScreenSlide(3, '메인', '대시보드에서 오늘 처리할 일을 먼저 확인합니다.', '01-dashboard.png', '대시보드 화면', [
  '오늘의 할 일과 지연 건수를 바로 확인합니다.',
  '입고예정건수는 주간 단위로 이동하며 볼 수 있습니다.',
  '최근 등록 문서를 클릭하면 발행이력 상세로 이동합니다.',
]);

addScreenSlide(4, '문서', '문서 작성은 납품처와 수신처 선택에서 시작합니다.', '02-doc-create.png', '문서 작성 화면', [
  '발주일, 입고일, 납품처, 수신처를 먼저 입력합니다.',
  '품목 정보에서 수량, 단가, VAT, 비고를 입력합니다.',
  '미리보기와 엑셀 다운로드로 출력 내용을 확인한 뒤 저장합니다.',
], '납품처와 수신처가 선택되어야 해당 조건의 품목 목록이 표시됩니다.');

addScreenSlide(5, '문서', '발행 이력은 조회, 수정, 거래취소의 기준 화면입니다.', '03-doc-history.png', '발행 이력 화면', [
  '기간, 필터, 키워드로 발행 문서를 검색합니다.',
  '행을 클릭하면 상세 화면에서 내용을 수정할 수 있습니다.',
  '문서 전체 또는 품목 단위로 거래취소를 처리합니다.',
]);

addScreenSlide(6, '출고', '수주대장에서 미출고와 출고 상태를 관리합니다.', '04-order-book.png', '수주대장 화면', [
  '입고일 기간과 검색 필터로 수주 항목을 조회합니다.',
  '각 행의 출고상태를 미출고 또는 출고로 변경합니다.',
  '여러 항목을 선택해 일괄 출고처리할 수 있습니다.',
]);

addScreenSlide(7, '관리', '납품처 관리는 문서 자동입력의 기준 데이터입니다.', '05-master-client.png', '납품처 관리 화면', [
  '납품처명, 주소, 담당자, 연락처 등으로 검색합니다.',
  '납품처 추가 또는 행 클릭으로 정보를 등록/수정합니다.',
  '입고시간, 점심시간, 비고는 문서 유의사항에 활용됩니다.',
]);

addScreenSlide(8, '관리', '품목 관리는 공통 품목과 납품처별 품목으로 나뉩니다.', '06-master-product.png', '품목 관리 화면', [
  '공통 품목은 기본 품목명과 포장 기준을 관리합니다.',
  '납품처별 품목은 수신처, 단가, 실제 문서명을 관리합니다.',
  '단가 수정 탭에서는 미리보기 후 변경분을 적용합니다.',
], '단가 변경은 문서 작성 금액에 직접 영향을 주므로 적용 전 대상 품목을 확인합니다.');

addScreenSlide(9, '정산', '월마감은 발행이력 기준으로 월별 입고 내역을 묶습니다.', '07-monthly-closing.png', '월마감 화면', [
  '연월과 납품처를 선택해 품목별 입고 내역을 확인합니다.',
  '비고란은 입력 후 Enter로 저장합니다.',
  '월마감 엑셀과 종합장 엑셀을 다운로드할 수 있습니다.',
]);

addScreenSlide(10, '정산', '일일판매는 관리자용 판매 현황 화면입니다.', '08-daily-sales.png', '일일판매 화면', [
  '월 단위로 납품처, 품목명, 수신처 기준 판매를 조회합니다.',
  '총수량, 입고금액, 출고금액과 일자별 수량을 확인합니다.',
  '비고란을 입력해 월별 판매 메모를 관리합니다.',
]);

addScreenSlide(11, '관리자', '계정 관리는 사용자와 권한을 관리합니다.', '09-account.png', '계정 관리 화면', [
  '아이디, 이름, 직급, 연락처, 이메일로 검색합니다.',
  '계정 추가와 수정, 비밀번호 초기화를 처리합니다.',
  '권한은 일반 사용자와 관리자로 구분합니다.',
], '관리자 권한은 일일판매와 계정 관리 접근까지 포함합니다.');

addScreenSlide(12, '자료실', '보도자료는 수집된 외부 자료를 확인하는 공간입니다.', '10-press-releases.png', '보도자료 화면', [
  '목록에서 제목, 발행일, 요약 정보를 확인합니다.',
  '항목을 클릭하면 상세 화면에서 본문을 확인합니다.',
  '업무 참고 자료로 활용하고, 핵심 업무 데이터와는 분리해 관리합니다.',
]);

addSlide(
  column(
    { name: 'closing-root', width: fill, height: fill, padding: { x: 100, y: 80 }, gap: 34 },
    [
      header(13, '운영 메모', '업무 품질을 지키는 핵심 체크포인트'),
      grid(
        { width: fill, height: grow(1), columns: [fr(1), fr(1)], rows: [fr(1), fr(1)], columnGap: 26, rowGap: 26 },
        [
          panel({ fill: C.soft, borderRadius: 16, padding: 28 }, column({ width: fill, height: fill, gap: 16 }, [t('문서 작성 전', { size: 30, bold: true }), bullet('납품처와 수신처를 먼저 확정합니다.'), bullet('품목명과 단가 기준을 확인합니다.')])),
          panel({ fill: C.soft, borderRadius: 16, padding: 28 }, column({ width: fill, height: fill, gap: 16 }, [t('발행 후 수정', { size: 30, bold: true }), bullet('수정 저장 전 미리보기를 확인합니다.'), bullet('거래취소는 집계 영향까지 확인합니다.')])),
          panel({ fill: C.soft, borderRadius: 16, padding: 28 }, column({ width: fill, height: fill, gap: 16 }, [t('출고 관리', { size: 30, bold: true }), bullet('미출고 항목은 대시보드와 수주대장에서 점검합니다.'), bullet('일괄 출고처리는 선택 항목을 확인한 뒤 실행합니다.')])),
          panel({ fill: C.soft, borderRadius: 16, padding: 28 }, column({ width: fill, height: fill, gap: 16 }, [t('마감/정산', { size: 30, bold: true }), bullet('월마감 비고는 Enter 또는 포커스 이동으로 저장합니다.'), bullet('마감 엑셀 다운로드 전 기간과 납품처를 확인합니다.')])),
        ],
      ),
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
