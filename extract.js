#!/usr/bin/env node
'use strict';

const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const { parsePdf }         = require('./lib/parse-pdf');
const { getSupabaseClient } = require('./lib/supabase');

async function main() {
  const args    = process.argv.slice(2);
  const dryRun  = args.includes('--dry-run');
  const force   = args.includes('--force');
  const pdfArg  = args.find(a => !a.startsWith('--'));

  if (!pdfArg) {
    console.error('Usage: node extract.js <report.pdf> [--dry-run] [--force]');
    console.error('  --dry-run  Parse and preview without inserting to database');
    console.error('  --force    Re-process a PDF that was already imported (deletes existing data first)');
    process.exit(1);
  }

  const pdfPath = path.resolve(pdfArg);

  if (!fs.existsSync(pdfPath)) {
    console.error(`Arquivo nao encontrado: ${pdfPath}`);
    process.exit(1);
  }

  console.log(`Processando: ${path.basename(pdfPath)}`);
  const { reportDate, vessels, warnings } = parsePdf(pdfPath);

  if (!reportDate) {
    console.error('ERRO: Data do relatorio nao encontrada no PDF. Verifique o formato.');
    process.exit(1);
  }

  const ports = [...new Set(vessels.map(v => v.porto_cidade).filter(Boolean))];
  console.log(`\nProcessado: ${vessels.length} navios, ${ports.length} portos, ${warnings.length} avisos`);
  console.log(`Data do relatorio: ${reportDate}`);

  if (warnings.length > 0) {
    console.warn('\nAvisos:');
    warnings.forEach(w => console.warn('  AVISO:', w));
  }

  console.log('\nPreview (primeiros 5 navios):');
  vessels.slice(0, 5).forEach(v => {
    console.log(
      `  ${String(v.vessel_name_raw).padEnd(30)} | ${v.eta || 'N/A'} | ` +
      `${String(v.porto_cidade || '').padEnd(20)} | ${String(v.carga || '').padEnd(15)} | ` +
      `${v.quantidade ?? 'N/A'} t`
    );
  });

  if (dryRun) {
    console.log('\n[DRY-RUN] Nenhum dado inserido no banco.');
    return;
  }

  const supabase = getSupabaseClient();

  const filename   = path.basename(pdfPath);
  const sha256     = crypto.createHash('sha256').update(fs.readFileSync(pdfPath)).digest('hex');

  if (force) {
    const { data: existing } = await supabase
      .from('lineup_reports')
      .select('id')
      .eq('sha256_hash', sha256)
      .maybeSingle();

    if (existing) {
      console.log(`\n[FORCE] Deletando relatorio existente id=${existing.id}...`);
      const { error: delErr } = await supabase
        .from('lineup_reports')
        .delete()
        .eq('id', existing.id);
      if (delErr) {
        console.error('Erro ao deletar relatorio existente:', delErr.message);
        process.exit(1);
      }
    }
  }

  const { data: report, error: reportErr } = await supabase
    .from('lineup_reports')
    .insert({
      report_date:  reportDate,
      filename,
      sha256_hash:  sha256,
      vessel_count: vessels.length,
    })
    .select()
    .single();

  if (reportErr) {
    if (reportErr.code === '23505') {
      console.error(
        '\nERRO: PDF ja foi importado anteriormente (sha256 duplicado).\n' +
        'Use --force para reprocessar e sobrescrever os dados existentes.'
      );
    } else {
      console.error('Erro ao inserir relatorio:', reportErr.message);
    }
    process.exit(1);
  }

  const entries = vessels.map(v => ({ ...v, report_id: report.id }));
  const { error: entriesErr } = await supabase
    .from('lineup_entries')
    .insert(entries);

  if (entriesErr) {
    console.error('Erro ao inserir entries:', entriesErr.message);
    await supabase.from('lineup_reports').delete().eq('id', report.id);
    process.exit(1);
  }

  console.log(`\nInserido com sucesso: report_id=${report.id}`);
  console.log(`Total: ${vessels.length} navios em ${ports.length} portos`);
}

main().catch(e => {
  console.error('Erro fatal:', e.message);
  process.exit(1);
});
