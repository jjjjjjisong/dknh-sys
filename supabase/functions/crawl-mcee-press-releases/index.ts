const SOURCE_ORIGIN = 'https://mcee.go.kr';
const SOURCE_MENU_ID = '10598';
const SOURCE_BOARD_MASTER_ID = '939';
const SOURCE_FROM_DATE = '2025-01-01';
const SOURCE_PAGE_SIZE = 10;
const DEFAULT_MAX_PAGES_PER_KEYWORD = 1;

type CrawlKeyword = {
  id: string;
  keyword: string;
  enabled: boolean;
  sort_order: number;
  scheduled_iso_dow: number;
  initial_done: boolean;
  next_pager_offset: number;
};

type PressReleaseRecord = {
  source_board_id: string;
  source_board_master_id: string;
  source_menu_id: string;
  title: string;
  body_text: string;
  department: string;
  author: string;
  published_date: string | null;
  view_count: number | null;
  source_url: string;
  download_links: Array<{ name: string; url: string; extension?: string; size?: string }>;
  search_keyword: string;
  matched_keywords: string[];
  scraped_at: string;
  updated_at: string;
  updated_by: string;
  del_yn: 'N';
};

type ExistingPressRelease = {
  search_keyword: string | null;
  matched_keywords: string[] | null;
};

Deno.serve(async (request) => {
  try {
    assertAuthorized(request);

    const supabaseUrl = requireEnv('SUPABASE_URL');
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const maxPagesPerKeyword = getPositiveIntegerEnv('MAX_PAGES_PER_KEYWORD', DEFAULT_MAX_PAGES_PER_KEYWORD);
    const today = getKstDateString();
    const scheduledIsoDow = getKstIsoDayOfWeek();
    const requestedKeyword = await getRequestedKeyword(request);

    const allKeywords = await fetchKeywords(supabaseUrl, serviceRoleKey);
    const dueKeywords = requestedKeyword
      ? allKeywords.filter((item) => item.keyword === requestedKeyword && item.enabled)
      : allKeywords.filter((item) => item.enabled && item.scheduled_iso_dow === scheduledIsoDow);
    const matchKeywordPool = allKeywords.filter((item) => item.enabled).map((item) => item.keyword);
    const results = [];

    for (const keyword of dueKeywords) {
      const result = await crawlKeyword({
        supabaseUrl,
        serviceRoleKey,
        keyword,
        matchKeywordPool,
        toDate: today,
        maxPagesPerKeyword,
      });
      results.push(result);
    }

    return jsonResponse({
      ok: true,
      date: today,
      scheduledIsoDow,
      processedKeywordCount: results.length,
      results,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

async function crawlKeyword({
  supabaseUrl,
  serviceRoleKey,
  keyword,
  matchKeywordPool,
  toDate,
  maxPagesPerKeyword,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  keyword: CrawlKeyword;
  matchKeywordPool: string[];
  toDate: string;
  maxPagesPerKeyword: number;
}) {
  const startedAt = new Date().toISOString();
  const startOffset = keyword.initial_done ? 0 : Math.max(0, keyword.next_pager_offset ?? 0);
  let pagerOffset = startOffset;
  let processed = 0;
  let totalCount = 0;

  try {
    await updateKeyword(supabaseUrl, serviceRoleKey, keyword.id, {
      last_run_at: startedAt,
      last_error: '',
      updated_at: startedAt,
      updated_by: 'mcee-crawler',
    });

    for (let pageIndex = 0; pageIndex < maxPagesPerKeyword; pageIndex += 1) {
      const list = await fetchListPage(keyword.keyword, pagerOffset, toDate);
      totalCount = list.totalCount;

      if (list.items.length === 0) {
        break;
      }

      for (const item of list.items) {
        const detail = await fetchDetailPage(item.boardId);
        const existing = await fetchExistingPressRelease(supabaseUrl, serviceRoleKey, item.boardId);
        const matchedKeywords = mergeKeywords(existing?.matched_keywords ?? [], getMatchedKeywords(
          `${item.title}\n${detail.bodyText}`,
          matchKeywordPool,
        ));
        const now = new Date().toISOString();

        await upsertPressRelease(supabaseUrl, serviceRoleKey, {
          source_board_id: item.boardId,
          source_board_master_id: SOURCE_BOARD_MASTER_ID,
          source_menu_id: SOURCE_MENU_ID,
          title: item.title,
          body_text: detail.bodyText,
          department: item.department,
          author: item.author,
          published_date: item.publishedDate,
          view_count: item.viewCount,
          source_url: buildDetailUrl(item.boardId),
          download_links: detail.downloadLinks,
          search_keyword: existing?.search_keyword || keyword.keyword,
          matched_keywords: matchedKeywords,
          scraped_at: now,
          updated_at: now,
          updated_by: 'mcee-crawler',
          del_yn: 'N',
        });
        processed += 1;
      }

      pagerOffset += SOURCE_PAGE_SIZE;

      if (keyword.initial_done || pagerOffset >= totalCount) {
        break;
      }
    }

    const initialDone = keyword.initial_done || pagerOffset >= totalCount;
    await updateKeyword(supabaseUrl, serviceRoleKey, keyword.id, {
      initial_done: initialDone,
      next_pager_offset: initialDone ? 0 : pagerOffset,
      last_success_at: new Date().toISOString(),
      last_error: '',
      updated_at: new Date().toISOString(),
      updated_by: 'mcee-crawler',
    });

    return {
      keyword: keyword.keyword,
      processed,
      totalCount,
      nextPagerOffset: initialDone ? 0 : pagerOffset,
      initialDone,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateKeyword(supabaseUrl, serviceRoleKey, keyword.id, {
      last_error: message.slice(0, 4000),
      updated_at: new Date().toISOString(),
      updated_by: 'mcee-crawler',
    });
    return {
      keyword: keyword.keyword,
      processed,
      totalCount,
      nextPagerOffset: pagerOffset,
      initialDone: keyword.initial_done,
      error: message,
    };
  }
}

async function fetchKeywords(supabaseUrl: string, serviceRoleKey: string): Promise<CrawlKeyword[]> {
  const rows = await supabaseGet<CrawlKeyword[]>(
    supabaseUrl,
    serviceRoleKey,
    '/rest/v1/mcee_crawl_keywords?select=id,keyword,enabled,sort_order,scheduled_iso_dow,initial_done,next_pager_offset&del_yn=eq.N&order=sort_order.asc,created_at.asc',
  );
  return rows;
}

async function fetchExistingPressRelease(
  supabaseUrl: string,
  serviceRoleKey: string,
  boardId: string,
): Promise<ExistingPressRelease | null> {
  const rows = await supabaseGet<ExistingPressRelease[]>(
    supabaseUrl,
    serviceRoleKey,
    `/rest/v1/mcee_press_releases?select=search_keyword,matched_keywords&source_board_id=eq.${encodeURIComponent(boardId)}&limit=1`,
  );
  return rows[0] ?? null;
}

async function upsertPressRelease(
  supabaseUrl: string,
  serviceRoleKey: string,
  record: PressReleaseRecord,
) {
  await supabaseFetch(
    supabaseUrl,
    serviceRoleKey,
    '/rest/v1/mcee_press_releases?on_conflict=source_board_id',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(record),
    },
  );
}

async function updateKeyword(
  supabaseUrl: string,
  serviceRoleKey: string,
  id: string,
  patch: Record<string, unknown>,
) {
  await supabaseFetch(
    supabaseUrl,
    serviceRoleKey,
    `/rest/v1/mcee_crawl_keywords?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(patch),
    },
  );
}

async function fetchListPage(keyword: string, pagerOffset: number, toDate: string) {
  const url = new URL('/home/web/board/list.do', SOURCE_ORIGIN);
  url.searchParams.set('menuId', SOURCE_MENU_ID);
  url.searchParams.set('boardMasterId', SOURCE_BOARD_MASTER_ID);
  url.searchParams.set('maxIndexPages', '10');
  url.searchParams.set('maxPageItems', String(SOURCE_PAGE_SIZE));
  url.searchParams.set('searchKey', 'titleOrContent');
  url.searchParams.set('searchValue', keyword);
  url.searchParams.set('condition.fromDate', SOURCE_FROM_DATE);
  url.searchParams.set('condition.toDate', toDate);
  url.searchParams.set('pagerOffset', String(pagerOffset));

  const html = await fetchText(url.toString());
  const totalCount = parseTotalCount(html);
  const rows = matchAll(html, /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)
    .map((match) => parseListRow(match[1]))
    .filter((item): item is NonNullable<ReturnType<typeof parseListRow>> => Boolean(item));

  return {
    totalCount,
    items: rows,
  };
}

async function fetchDetailPage(boardId: string) {
  const html = await fetchText(buildDetailUrl(boardId));
  return {
    bodyText: parseBodyText(html),
    downloadLinks: parseDownloadLinks(html),
  };
}

function parseListRow(rowHtml: string) {
  const boardId = getFirstMatch(rowHtml, /boardId=(\d+)/i);
  if (!boardId) return null;

  const title = cleanText(
    decodeHtml(
      getFirstMatch(rowHtml, /<a\b[^>]*title="([^"]+)"[^>]*>/i) ??
        stripTags(getFirstMatch(rowHtml, /<a\b[^>]*class="ellipsis"[^>]*>([\s\S]*?)<\/a>/i) ?? ''),
    ),
  );
  const cells = matchAll(rowHtml, /<td\b[^>]*>([\s\S]*?)<\/td>/gi).map((match) => cleanText(stripTags(match[1])));

  return {
    boardId,
    title,
    department: cells[2] ?? '',
    author: cells[3] ?? '',
    publishedDate: normalizeDate(cells[4] ?? ''),
    viewCount: parseNullableInteger(cells[5] ?? ''),
  };
}

function parseBodyText(html: string) {
  const bodyHtml =
    getFirstMatch(html, /<div\b[^>]*class="[^"]*view_con[^"]*"[^>]*>([\s\S]*?)<!--\s*end view_con\s*-->/i) ??
    getFirstMatch(html, /<div\b[^>]*id="boardContentWrap"[^>]*>([\s\S]*?)<\/div>/i) ??
    '';
  return cleanText(stripTags(bodyHtml));
}

function parseDownloadLinks(html: string) {
  return matchAll(
    html,
    /ajaxFileDownLoad\('([^']+)'\s*,\s*'([^']+)'\)[\s\S]*?title="파일다운로드"[^>]*>([\s\S]*?)<\/a>/gi,
  ).map((match) => {
    const nameAndSize = cleanText(stripTags(match[3]));
    const size = getFirstMatch(nameAndSize, /\(([^()]+)\)\s*$/);
    const name = size ? cleanText(nameAndSize.replace(/\s*\([^()]+\)\s*$/, '')) : nameAndSize;
    const extension = getFileExtensionLabel(name);
    const url = new URL('/home/file/readDownloadFile.do', SOURCE_ORIGIN);
    url.searchParams.set('fileId', match[1]);
    url.searchParams.set('fileSeq', match[2]);
    return {
      name,
      url: url.toString(),
      ...(extension ? { extension } : {}),
      ...(size ? { size } : {}),
    };
  });
}

function getFileExtensionLabel(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)(?:[\s)]|$)/);
  if (!match) return '';
  if (match[1] === 'hwp' || match[1] === 'hwpx') return 'HWP';
  return match[1].toUpperCase();
}

function buildDetailUrl(boardId: string) {
  const url = new URL('/home/web/board/read.do', SOURCE_ORIGIN);
  url.searchParams.set('menuId', SOURCE_MENU_ID);
  url.searchParams.set('boardMasterId', SOURCE_BOARD_MASTER_ID);
  url.searchParams.set('boardId', boardId);
  return url.toString();
}

function parseTotalCount(html: string) {
  const value = getFirstMatch(html, /총\s*<i>\s*([\d,]+)\s*<\/i>\s*건/i);
  return parseNullableInteger(value ?? '') ?? 0;
}

async function fetchText(url: string) {
  let lastError = '';

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          Referer: 'https://mcee.go.kr/home/web/index.do?menuId=10598',
        },
      });
      if (!response.ok) {
        throw new Error(`MCEE request failed: ${response.status} ${url}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < 3) {
        await delay(500 * attempt);
      }
    }
  }

  throw new Error(`MCEE request failed after retries: ${lastError}`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function supabaseGet<T>(supabaseUrl: string, serviceRoleKey: string, path: string): Promise<T> {
  const response = await supabaseFetch(supabaseUrl, serviceRoleKey, path, { method: 'GET' });
  return await response.json() as T;
}

async function supabaseFetch(
  supabaseUrl: string,
  serviceRoleKey: string,
  path: string,
  init: RequestInit,
) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed: ${response.status} ${text}`);
  }

  return response;
}

async function getRequestedKeyword(request: Request) {
  if (request.method !== 'POST') return '';
  try {
    const body = await request.json();
    return typeof body?.keyword === 'string' ? body.keyword.trim() : '';
  } catch {
    return '';
  }
}

function assertAuthorized(request: Request) {
  const expectedSecret = Deno.env.get('MCEE_CRAWL_SECRET')?.trim();
  if (!expectedSecret) return;

  const actualSecret = request.headers.get('x-crawl-secret')?.trim();
  if (actualSecret !== expectedSecret) {
    throw new Error('Unauthorized crawler request');
  }
}

function requireEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function getPositiveIntegerEnv(name: string, fallback: number) {
  const value = parseInt(Deno.env.get(name) ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getKstIsoDayOfWeek() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay();
  return day === 0 ? 7 : day;
}

function getKstDateString() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function getMatchedKeywords(text: string, keywords: string[]) {
  const upperText = text.toUpperCase();
  return keywords.filter((keyword) => upperText.includes(keyword.toUpperCase()));
}

function mergeKeywords(current: string[], next: string[]) {
  return Array.from(new Set([...current, ...next])).filter(Boolean);
}

function stripTags(html: string) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<img\b[^>]*alt="([^"]*)"[^>]*>/gi, ' $1 ')
      .replace(/<[^>]+>/g, ' '),
  );
}

function cleanText(value: string) {
  return decodeHtml(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeHtml(value: string) {
  const namedEntities: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  };
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => namedEntities[name] ?? match);
}

function normalizeDate(value: string) {
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function parseNullableInteger(value: string) {
  const parsed = parseInt(value.replace(/,/g, '').trim(), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function getFirstMatch(value: string, pattern: RegExp) {
  return value.match(pattern)?.[1] ?? null;
}

function matchAll(value: string, pattern: RegExp) {
  return Array.from(value.matchAll(pattern));
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
