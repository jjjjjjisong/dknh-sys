import { getSupabaseClient } from './supabase/client';
import type { MceeDownloadLink, MceePressRelease } from '../types/mceePressRelease';

type MceePressReleaseRow = {
  id: string;
  title: string | null;
  body_text: string | null;
  department: string | null;
  author: string | null;
  published_date: string | null;
  effective_date: string | null;
  view_count: number | null;
  source_url: string | null;
  download_links: unknown;
  search_keyword: string | null;
  matched_keywords: string[] | null;
  scraped_at: string | null;
};

type FetchMceePressReleaseParams = {
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
};

type MceePressReleasePageResult = {
  items: MceePressRelease[];
  totalCount: number;
};

const MCEE_PRESS_RELEASE_SELECT =
  'id, title, body_text, department, author, published_date, effective_date, view_count, source_url, download_links, search_keyword, matched_keywords, scraped_at';

export async function fetchMceePressReleasePage(
  params: FetchMceePressReleaseParams,
): Promise<MceePressReleasePageResult> {
  const supabase = getSupabaseClient();
  const page = Math.max(1, params.page);
  const pageSize = Math.max(1, params.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('mcee_press_releases')
    .select(MCEE_PRESS_RELEASE_SELECT, { count: 'exact' })
    .eq('del_yn', 'N');

  if (params.dateFrom) {
    query = query.gte('published_date', params.dateFrom);
  }

  if (params.dateTo) {
    query = query.lte('published_date', params.dateTo);
  }

  const keyword = params.keyword?.trim() ?? '';
  if (keyword) {
    const pattern = `%${escapeForIlike(keyword)}%`;
    query = query.or(
      `title.ilike.${pattern},body_text.ilike.${pattern},department.ilike.${pattern},search_keyword.ilike.${pattern}`,
    );
  }

  const { data, error, count } = await query
    .order('published_date', { ascending: false, nullsFirst: false })
    .order('title', { ascending: true })
    .range(from, to);

  if (error) throw error;

  return {
    items: ((data ?? []) as MceePressReleaseRow[]).map(mapMceePressReleaseRow),
    totalCount: count ?? 0,
  };
}

export async function fetchMceePressReleaseById(id: string): Promise<MceePressRelease | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('mcee_press_releases')
    .select(MCEE_PRESS_RELEASE_SELECT)
    .eq('id', id)
    .eq('del_yn', 'N')
    .maybeSingle();

  if (error) throw error;
  return data ? mapMceePressReleaseRow(data as MceePressReleaseRow) : null;
}

export async function updateMceePressReleaseEffectiveDate(id: string, effectiveDate: string | null) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('mcee_press_releases')
    .update({
      effective_date: effectiveDate,
      updated_at: new Date().toISOString(),
      updated_by: 'web',
    })
    .eq('id', id);

  if (error) throw error;
}

function mapMceePressReleaseRow(row: MceePressReleaseRow): MceePressRelease {
  return {
    id: String(row.id),
    title: row.title ?? '',
    bodyText: row.body_text ?? '',
    department: row.department ?? '',
    author: row.author ?? '',
    publishedDate: row.published_date ?? null,
    effectiveDate: row.effective_date ?? null,
    viewCount: row.view_count ?? null,
    sourceUrl: row.source_url ?? '',
    downloadLinks: parseDownloadLinks(row.download_links),
    searchKeyword: row.search_keyword ?? '',
    matchedKeywords: row.matched_keywords ?? [],
    scrapedAt: row.scraped_at ?? null,
  };
}

function parseDownloadLinks(value: unknown): MceeDownloadLink[] {
  if (!Array.isArray(value)) return [];

  const links: MceeDownloadLink[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name : '';
    const url = typeof record.url === 'string' ? record.url : '';
    const extension = typeof record.extension === 'string' ? record.extension : undefined;
    const size = typeof record.size === 'string' ? record.size : undefined;
    if (!name || !url) continue;
    links.push({ name, url, extension, size });
  }

  return links;
}

function escapeForIlike(value: string) {
  return value.replace(/[%*,()]/g, ' ').trim();
}
