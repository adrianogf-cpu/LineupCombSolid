import { createServiceClient } from '@/lib/supabase/server';
import { parsePdfBuffer } from '@/lib/parse-pdf';
import crypto from 'crypto';

export interface IngestResult {
  status: 'completed' | 'duplicate' | 'failed';
  reportId?: string;
  reportDate?: string;
  vesselCount?: number;
  message?: string;
  warnings?: string[];
}

export async function ingestPdf(
  buffer: Buffer,
  filename: string,
  source: 'manual' | 'email'
): Promise<IngestResult> {
  const supabase = createServiceClient();
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  // Create ingestion log entry
  const { data: logEntry, error: logErr } = await supabase
    .from('ingestion_log')
    .insert({ filename, sha256_hash: sha256, source, status: 'processing' })
    .select()
    .single();

  if (logErr) {
    throw new Error('Failed to create log entry');
  }

  try {
    // Check for duplicate
    const { data: existing } = await supabase
      .from('lineup_reports')
      .select('id, filename')
      .eq('sha256_hash', sha256)
      .maybeSingle();

    if (existing) {
      await supabase.from('ingestion_log').update({
        status: 'duplicate',
        error_message: `Already imported as ${existing.filename}`,
        report_id: existing.id,
      }).eq('id', logEntry.id);

      return {
        status: 'duplicate',
        message: `Already imported as ${existing.filename}`,
        reportId: existing.id,
      };
    }

    // Store PDF to Supabase Storage (non-blocking on failure)
    const storagePath = `uploads/${sha256}.pdf`;
    const { error: storageErr } = await supabase.storage
      .from('lineup-pdfs')
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });

    if (storageErr) {
      console.error('Storage upload failed:', storageErr.message);
    }

    await supabase.from('ingestion_log').update({ storage_path: storagePath }).eq('id', logEntry.id);

    // Parse PDF
    const { reportDate, vessels, warnings } = await parsePdfBuffer(buffer);

    if (!reportDate) {
      await supabase.from('ingestion_log').update({
        status: 'failed',
        error_message: 'No report date found in PDF',
      }).eq('id', logEntry.id);
      return { status: 'failed', message: 'No report date found in PDF' };
    }

    // Insert report
    const { data: report, error: reportErr } = await supabase
      .from('lineup_reports')
      .insert({ report_date: reportDate, filename, sha256_hash: sha256, vessel_count: vessels.length })
      .select()
      .single();

    if (reportErr) {
      throw new Error(reportErr.message);
    }

    // Insert entries
    const entries = vessels.map(v => ({ ...v, report_id: report.id }));
    const { error: entriesErr } = await supabase.from('lineup_entries').insert(entries);

    if (entriesErr) {
      // Rollback: delete the report row
      await supabase.from('lineup_reports').delete().eq('id', report.id);
      throw new Error(entriesErr.message);
    }

    // Success
    await supabase.from('ingestion_log').update({
      status: 'completed',
      report_id: report.id,
      vessel_count: vessels.length,
    }).eq('id', logEntry.id);

    return {
      status: 'completed',
      reportId: report.id,
      reportDate,
      vesselCount: vessels.length,
      warnings,
    };

  } catch (e: any) {
    await supabase.from('ingestion_log').update({
      status: 'failed',
      error_message: e.message,
    }).eq('id', logEntry.id);
    return { status: 'failed', message: e.message };
  }
}
