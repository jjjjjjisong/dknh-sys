import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchMceePressReleaseById } from '../api/mceePressReleases';
import PageHeader from '../components/PageHeader';
import Alert from '../components/ui/Alert';
import type { MceePressRelease } from '../types/mceePressRelease';

const NEW_BADGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export default function MceePressReleaseDetailPage() {
  const { pressReleaseId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<MceePressRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    if (!pressReleaseId) {
      setLoading(false);
      setError('보도자료를 찾을 수 없습니다.');
      return;
    }

    void loadDetail(pressReleaseId);
  }, [pressReleaseId]);

  async function loadDetail(id: string) {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    try {
      setLoading(true);
      setError(null);
      const result = await fetchMceePressReleaseById(id);
      if (requestId !== loadRequestIdRef.current) return;
      if (!result) {
        setError('보도자료를 찾을 수 없습니다.');
        setItem(null);
        return;
      }
      setItem(result);
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      setError(err instanceof Error ? err.message : '보도자료 상세를 불러오지 못했습니다.');
    } finally {
      if (requestId !== loadRequestIdRef.current) return;
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      <PageHeader title="보도자료 상세" description="" />

      {error ? <Alert>{error}</Alert> : null}

      <section className="card mcee-detail-card">
        {loading ? (
          <div className="table-empty">보도자료 상세를 불러오는 중입니다...</div>
        ) : item ? (
          <>
            <div className="mcee-detail-head">
              <div>
                <h2 className="mcee-detail-title">
                  {item.title || '-'}
                  {isNewPressRelease(item) ? <span className="mcee-new-badge">N</span> : null}
                </h2>
                <div className="mcee-detail-meta">
                  <span>등록일자 {item.publishedDate || '-'}</span>
                  <span>시행일 {item.effectiveDate || '-'}</span>
                  <span>부서 {item.department || '-'}</span>
                  <span>키워드 {item.searchKeyword || '-'}</span>
                </div>
              </div>
              <div className="mcee-detail-actions">
                {item.sourceUrl ? (
                  <a className="btn btn-secondary btn-sm" href={item.sourceUrl} target="_blank" rel="noreferrer">
                    원문
                  </a>
                ) : null}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/mcee-press-releases')}>
                  목록
                </button>
              </div>
            </div>

            <div className="mcee-detail-section">
              <div className="detail-label">본문</div>
              <div className="mcee-detail-body">{item.bodyText || '본문 내용이 없습니다.'}</div>
            </div>

            <div className="mcee-detail-section">
              <div className="detail-label">첨부파일</div>
              {item.downloadLinks.length > 0 ? (
                <div className="mcee-detail-downloads">
                  {item.downloadLinks.map((downloadLink) => (
                    <a
                      key={downloadLink.url}
                      className="btn btn-secondary btn-sm"
                      href={downloadLink.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {downloadLink.name}
                      {downloadLink.size ? ` (${downloadLink.size})` : ''}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="detail-value">첨부파일이 없습니다.</div>
              )}
            </div>
          </>
        ) : (
          <div className="table-empty">
            보도자료를 찾을 수 없습니다. <Link to="/mcee-press-releases">목록으로 돌아가기</Link>
          </div>
        )}
      </section>
    </div>
  );
}

function isNewPressRelease(item: MceePressRelease) {
  if (!item.scrapedAt) return false;
  const scrapedTime = Date.parse(item.scrapedAt);
  if (!Number.isFinite(scrapedTime)) return false;
  return Date.now() - scrapedTime <= NEW_BADGE_WINDOW_MS;
}
