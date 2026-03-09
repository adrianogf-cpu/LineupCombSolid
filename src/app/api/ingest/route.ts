import { createServiceClient } from '@/lib/supabase/server';
import { parsePdfBuffer } from '@/lib/parse-pdf';
import crypto from 'crypto';

export async function POST(request: Request) {
  const supabase = createServiceClient();

  const formData = await request.formData();
  const file = formData.get('pdf') as File | null;

  if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
    return Response.json({ error: 'No PDF file provided' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name;
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  // Create ingestion log entry
  const { data: logEntry, error: logErr } = await supabase
    .from('ingestion_log')
    .insert({ filename, sha256_hash: sha256, source: 'manual', status: 'processing' })
    .select()
    .single();

  if (logErr) {
    return Response.json({ error: 'Failed to create log entry' }, { status: 500 });
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

      return Response.json({
        status: 'duplicate',
        message: `PDF already imported as ${existing.filename}`,
        report_id: existing.id,
      }, { status: 409 });
    }

    // Store PDF to Supabase Storage
    const storagePath = `uploads/${sha256}.pdf`;
    const { error: storageErr } = await supabase.storage
      .from('lineup-pdfs')
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });

    if (storageErr) {
      console.error('Storage upload failed:', storageErr.message);
      // Not critical — continue with parsing
    }

    await supabase.from('ingestion_log').update({ storage_path: storagePath }).eq('id', logEntry.id);

    // Parse PDF
    const { reportDate, vessels, warnings } = await parsePdfBuffer(buffer);

    if (!reportDate) {
      await supabase.from('ingestion_log').update({
        status: 'failed',
        error_message: 'No report date found in PDF',
      }).eq('id', logEntry.id);
      return Response.json({ error: 'No report date found in PDF' }, { status: 422 });
    }

    // Insert report
    const { data: report, error: reportErr } = await supabase
      .from('lineup_reports')
      .insert({ report_date: reportDate, filename, sha256_hash: sha256, vessel_count: vessels.length })
      .select()
      .single();

    if (reportErr) {
      await supabase.from('ingestion_log').update({
        status: 'failed',
        error_message: reportErr.message,
      }).eq('id', logEntry.id);
      return Response.json({ error: reportErr.message }, { status: 500 });
    }

    // Insert entries
    const entries = vessels.map(v => ({ ...v, report_id: report.id }));
    const { error: entriesErr } = await supabase.from('lineup_entries').insert(entries);

    if (entriesErr) {
      await supabase.from('lineup_reports').delete().eq('id', report.id);
      await supabase.from('ingestion_log').update({
        status: 'failed',
        error_message: entriesErr.message,
      }).eq('id', logEntry.id);
      return Response.json({ error: entriesErr.message }, { status: 500 });
    }

    // Success
    await supabase.from('ingestion_log').update({
      status: 'completed',
      report_id: report.id,
      vessel_count: vessels.length,
    }).eq('id', logEntry.id);

    return Response.json({
      status: 'completed',
      report_id: report.id,
      report_date: reportDate,
      vessel_count: vessels.length,
      warnings,
    }, { status: 201 });

  } catch (e: any) {
    await supabase.from('ingestion_log').update({
      status: 'failed',
      error_message: e.message,
    }).eq('id', logEntry.id);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
