import { getActiveAuditFields, getAuditFields, getDeletedAuditFields } from './audit';
import { getSupabaseClient } from './supabase/client';
import type { CommonCode, CommonCodeGroup, CommonCodeInput } from '../types/commonCode';

type CommonCodeRow = {
  group_code: string | null;
  code: string | null;
  label: string | null;
  sort_order: number | null;
  active: boolean | null;
  note: string | null;
  del_yn?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

const commonCodeSelectColumns =
  'group_code, code, label, sort_order, active, note, del_yn, updated_at, updated_by';

export const RECEIVER_GROUP: CommonCodeGroup = 'RECEIVER';

export async function fetchCommonCodes(groupCode: CommonCodeGroup): Promise<CommonCode[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('common_codes')
    .select(commonCodeSelectColumns)
    .eq('group_code', groupCode)
    .eq('del_yn', 'N')
    .order('sort_order', { ascending: true })
    .order('code', { ascending: true });

  if (error) {
    throw toReadableError(error);
  }

  return (data ?? []).map((row: CommonCodeRow) => mapCommonCodeRow(row));
}

export async function fetchActiveReceiverCodes(): Promise<CommonCode[]> {
  const codes = await fetchCommonCodes(RECEIVER_GROUP);
  return codes.filter((code) => code.active);
}

export async function createCommonCode(
  groupCode: CommonCodeGroup,
  input: CommonCodeInput,
): Promise<CommonCode> {
  validateCommonCodeInput(input);

  const supabase = getSupabaseClient();
  const nextCode = await fetchNextCode(groupCode);
  const payload = {
    group_code: groupCode,
    code: nextCode,
    label: input.label.trim(),
    sort_order: input.sortOrder,
    active: input.active,
    note: input.note.trim(),
    ...getActiveAuditFields(),
  };

  const { data, error } = await supabase
    .from('common_codes')
    .insert(payload)
    .select(commonCodeSelectColumns)
    .single();

  if (error || !data) {
    throw toReadableError(error);
  }

  return mapCommonCodeRow(data as CommonCodeRow);
}

export async function updateCommonCode(
  groupCode: CommonCodeGroup,
  code: string,
  input: CommonCodeInput,
): Promise<CommonCode> {
  validateCommonCodeInput(input);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('common_codes')
    .update({
      label: input.label.trim(),
      sort_order: input.sortOrder,
      active: input.active,
      note: input.note.trim(),
      ...getAuditFields(),
    })
    .eq('group_code', groupCode)
    .eq('code', code)
    .eq('del_yn', 'N')
    .select(commonCodeSelectColumns)
    .single();

  if (error || !data) {
    throw toReadableError(error);
  }

  return mapCommonCodeRow(data as CommonCodeRow);
}

export async function removeCommonCode(groupCode: CommonCodeGroup, code: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('common_codes')
    .update(getDeletedAuditFields())
    .eq('group_code', groupCode)
    .eq('code', code);

  if (error) {
    throw toReadableError(error);
  }
}

async function fetchNextCode(groupCode: CommonCodeGroup) {
  const prefix = getCodePrefix(groupCode);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('common_codes')
    .select('code')
    .eq('group_code', groupCode)
    .like('code', `${prefix}%`)
    .order('code', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toReadableError(error);
  }

  const latestNumber = parseInt(String(data?.code ?? '').replace(/\D/g, ''), 10);
  const nextNumber = Number.isFinite(latestNumber) ? latestNumber + 1 : 1;
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

function getCodePrefix(groupCode: CommonCodeGroup) {
  if (groupCode === RECEIVER_GROUP) return 'RCV';
  return 'COD';
}

function validateCommonCodeInput(input: CommonCodeInput) {
  if (!input.label.trim()) {
    throw new Error('코드명을 입력해 주세요.');
  }
}

function mapCommonCodeRow(row: CommonCodeRow): CommonCode {
  return {
    groupCode: (row.group_code ?? RECEIVER_GROUP) as CommonCodeGroup,
    code: row.code ?? '',
    label: row.label ?? '',
    sortOrder: row.sort_order ?? 0,
    active: row.active ?? true,
    note: row.note ?? '',
    delYn: (row.del_yn ?? 'N') as CommonCode['delYn'],
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? '',
  };
}

function toReadableError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String(error.message));
  }

  return new Error('공통코드 처리 중 알 수 없는 오류가 발생했습니다.');
}
