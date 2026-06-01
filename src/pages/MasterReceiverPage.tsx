import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  createCommonCode,
  fetchCommonCodes,
  RECEIVER_GROUP,
  removeCommonCode,
  updateCommonCode,
} from '../api/commonCodes';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import Modal from '../components/ui/Modal';
import TableActionButton from '../components/ui/TableActionButton';
import type { CommonCode, CommonCodeInput } from '../types/commonCode';

const PAGE_SIZE = 15;

const emptyForm: CommonCodeInput = {
  label: '',
  sortOrder: 0,
  active: true,
  note: '',
};

export default function MasterReceiverPage() {
  const [receivers, setReceivers] = useState<CommonCode[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReceiver, setEditingReceiver] = useState<CommonCode | null>(null);
  const [form, setForm] = useState<CommonCodeInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    void loadReceivers();
  }, []);

  const filteredReceivers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return receivers;

    return receivers.filter((receiver) =>
      [receiver.code, receiver.label, receiver.note]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [query, receivers]);

  const pagedReceivers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredReceivers.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredReceivers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredReceivers.length / PAGE_SIZE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredReceivers.length]);

  async function loadReceivers() {
    try {
      setLoading(true);
      setError(null);
      setReceivers(await fetchCommonCodes(RECEIVER_GROUP));
    } catch (err) {
      setError(err instanceof Error ? err.message : '수신처 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    const maxSortOrder = receivers.reduce((max, receiver) => Math.max(max, receiver.sortOrder), 0);
    setEditingReceiver(null);
    setForm({ ...emptyForm, sortOrder: maxSortOrder + 1 });
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(receiver: CommonCode) {
    setEditingReceiver(receiver);
    setForm({
      label: receiver.label,
      sortOrder: receiver.sortOrder,
      active: receiver.active,
      note: receiver.note,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setFormError(null);
  }

  function updateForm<K extends keyof CommonCodeInput>(key: K, value: CommonCodeInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.label.trim()) {
      setFormError('수신처명을 입력해 주세요.');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const payload: CommonCodeInput = {
        label: form.label.trim(),
        sortOrder: Number.isFinite(Number(form.sortOrder)) ? Number(form.sortOrder) : 0,
        active: form.active,
        note: form.note.trim(),
      };

      if (editingReceiver) {
        await updateCommonCode(RECEIVER_GROUP, editingReceiver.code, payload);
      } else {
        await createCommonCode(RECEIVER_GROUP, payload);
      }

      await loadReceivers();
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '수신처를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(receiver: CommonCode) {
    const confirmed = window.confirm(
      `"${receiver.label}" 수신처를 삭제하시겠습니까?\n기존 문서와 품목의 표시 텍스트는 유지됩니다.`,
    );
    if (!confirmed) return;

    try {
      await removeCommonCode(RECEIVER_GROUP, receiver.code);
      setReceivers((current) => current.filter((item) => item.code !== receiver.code));
    } catch (err) {
      setError(err instanceof Error ? err.message : '수신처를 삭제하지 못했습니다.');
    }
  }

  return (
    <div className="page-content">
      <PageHeader title="수신처 관리" description="" />

      {error ? <Alert>{error}</Alert> : null}

      <section className="card">
        <div className="toolbar client-toolbar client-toolbar-stacked">
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="코드, 수신처명, 비고로 검색"
          />
          <div className="client-toolbar-actions">
            <div className="toolbar-meta">검색 결과 {filteredReceivers.length}건</div>
            <div className="button-row">
              <Button type="button" variant="primary" onClick={openCreateModal}>
                수신처 추가
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">수신처 목록을 불러오는 중입니다...</div>
        ) : (
          <div className="table-wrap">
            <table className="table client-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 260 }}>수신처명</th>
                  <th style={{ minWidth: 220 }}>비고</th>
                  <th style={{ width: 90 }}>상태</th>
                  <th style={{ width: 72 }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceivers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="table-empty">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  pagedReceivers.map((receiver) => (
                    <tr
                      key={receiver.code}
                      className="history-clickable-row"
                      onClick={() => openEditModal(receiver)}
                    >
                      <td>
                        <div className="table-primary table-clamp-2" title={receiver.label}>
                          {receiver.label}
                        </div>
                      </td>
                      <td>
                        <div className="table-clamp-2" title={receiver.note || '-'}>
                          {receiver.note || '-'}
                        </div>
                      </td>
                      <td>
                        <span className={receiver.active ? 'badge' : 'badge badge-muted'}>
                          {receiver.active ? '사용중' : '비활성'}
                        </span>
                      </td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <TableActionButton variant="danger" onClick={() => void handleDelete(receiver)}>
                          삭제
                        </TableActionButton>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={filteredReceivers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </section>

      <Modal
        open={modalOpen}
        title={editingReceiver ? '수신처 수정' : '수신처 추가'}
        onClose={closeModal}
        closeOnOverlayClick={false}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal}>
              취소
            </Button>
            <Button type="submit" form="receiver-form" variant="primary" disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </>
        }
      >
        <form id="receiver-form" className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <FormField label="수신처명 *">
              <input
                value={form.label}
                onChange={(event) => updateForm('label', event.target.value)}
                readOnly={Boolean(editingReceiver)}
              />
            </FormField>

            <FormField label="상태" className="field-check">
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => updateForm('active', event.target.checked)}
                />
                사용중
              </label>
            </FormField>

            <FormField label="비고" className="field-span-2">
              <textarea value={form.note} onChange={(event) => updateForm('note', event.target.value)} />
            </FormField>
          </div>

          {formError ? <Alert>{formError}</Alert> : null}
        </form>
      </Modal>
    </div>
  );
}
