import { getAuditFields } from './audit';
import { getSupabaseClient } from './supabase/client';

type DailySalesNoteRow = {
  row_key: string;
  note: string | null;
};

export async function fetchDailySalesNotes(yearMonth: string): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('daily_sales_notes')
    .select('row_key, note')
    .eq('year_month', yearMonth);

  if (error) {
    throw error;
  }

  const notes: Record<string, string> = {};
  for (const row of (data ?? []) as DailySalesNoteRow[]) {
    notes[row.row_key] = row.note ?? '';
  }

  return notes;
}

export async function saveDailySalesNote(
  yearMonth: string,
  rowKey: string,
  note: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('daily_sales_notes')
    .upsert(
      {
        year_month: yearMonth,
        row_key: rowKey,
        note,
        ...getAuditFields(),
      },
      { onConflict: 'year_month,row_key' },
    );

  if (error) {
    throw error;
  }
}
