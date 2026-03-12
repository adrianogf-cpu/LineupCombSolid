import { SupabaseClient } from '@supabase/supabase-js';
import { DiffEntry } from '@/types/diff';

export async function fetchDiffEntries(
  supabase: SupabaseClient,
  reportIdA: string,  // baseline (old)
  reportIdB: string   // current (new)
): Promise<DiffEntry[]> {
  const { data, error } = await supabase.rpc('compare_lineups', {
    report_id_a: reportIdA,
    report_id_b: reportIdB,
  });

  if (error) throw new Error(`Diff query failed: ${error.message}`);
  return (data ?? []) as DiffEntry[];
}

/** Get the report immediately before a given date */
export async function fetchPreviousReport(
  supabase: SupabaseClient,
  currentReportDate: string
): Promise<{ id: string; report_date: string } | null> {
  const { data, error } = await supabase
    .from('lineup_reports')
    .select('id, report_date')
    .lt('report_date', currentReportDate)
    .order('report_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}
