#!/usr/bin/env node
'use strict';

const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { parsePdf }         = require('../lib/parse-pdf');
const { getSupabaseClient } = require('../lib/supabase');

async function main() {
  const pattern = process.argv[2];
  if (!pattern) {
    console.error('Usage: node scripts/bulk-import.js <glob-or-directory>');
    console.error('  Example: node scripts/bulk-import.js "/path/to/Report_*.pdf"');
    process.exit(1);
  }

  // Resolve files: if pattern contains *, use glob; otherwise treat as directory
  let files;
  if (pattern.includes('*')) {
    const { globSync } = require('glob');
    files = globSync(pattern).sort();
  } else {
    const dir = path.resolve(pattern);
    files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.pdf'))
      .map(f => path.join(dir, f))
      .sort();
  }

  if (files.length === 0) {
    console.error('No PDF files found matching:', pattern);
    process.exit(1);
  }

  console.log(`Found ${files.length} PDFs to import\n`);

  const supabase = getSupabaseClient();
  const results  = [];

  for (const pdfPath of files) {
    const filename = path.basename(pdfPath);
    console.log(`Processing: ${filename}`);

    try {
      const { reportDate, vessels, warnings } = parsePdf(pdfPath);
      if (!reportDate) {
        results.push({ filename, status: 'FAILED', reason: 'No report date found' });
        console.log(`  FAILED: No report date found\n`);
        continue;
      }

      const sha256 = crypto.createHash('sha256').update(fs.readFileSync(pdfPath)).digest('hex');

      // Check if already imported
      const { data: existing } = await supabase
        .from('lineup_reports')
        .select('id')
        .eq('sha256_hash', sha256)
        .maybeSingle();

      if (existing) {
        results.push({ filename, status: 'SKIPPED', reason: 'Already imported (SHA256 match)' });
        console.log(`  SKIPPED: Already imported\n`);
        continue;
      }

      // Insert report
      const { data: report, error: reportErr } = await supabase
        .from('lineup_reports')
        .insert({ report_date: reportDate, filename, sha256_hash: sha256, vessel_count: vessels.length })
        .select()
        .single();

      if (reportErr) {
        results.push({ filename, status: 'FAILED', reason: reportErr.message });
        console.log(`  FAILED: ${reportErr.message}\n`);
        continue;
      }

      // Insert entries
      const entries = vessels.map(v => ({ ...v, report_id: report.id }));
      const { error: entriesErr } = await supabase
        .from('lineup_entries')
        .insert(entries);

      if (entriesErr) {
        await supabase.from('lineup_reports').delete().eq('id', report.id);
        results.push({ filename, status: 'FAILED', reason: entriesErr.message });
        console.log(`  FAILED: ${entriesErr.message}\n`);
        continue;
      }

      results.push({ filename, status: 'OK', vessels: vessels.length, reportDate, warnings: warnings.length });
      console.log(`  OK: ${vessels.length} vessels, date ${reportDate}, ${warnings.length} warnings\n`);

    } catch (e) {
      results.push({ filename, status: 'FAILED', reason: e.message });
      console.log(`  FAILED: ${e.message}\n`);
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log('BULK IMPORT SUMMARY');
  console.log('='.repeat(60));
  const ok      = results.filter(r => r.status === 'OK');
  const skipped = results.filter(r => r.status === 'SKIPPED');
  const failed  = results.filter(r => r.status === 'FAILED');
  console.log(`Total PDFs:  ${results.length}`);
  console.log(`Imported:    ${ok.length}`);
  console.log(`Skipped:     ${skipped.length}`);
  console.log(`Failed:      ${failed.length}`);
  console.log(`Total vessels imported: ${ok.reduce((sum, r) => sum + (r.vessels || 0), 0)}`);

  if (failed.length > 0) {
    console.log('\nFailed PDFs:');
    failed.forEach(r => console.log(`  ${r.filename}: ${r.reason}`));
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
