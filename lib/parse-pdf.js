'use strict';

const { execFileSync } = require('child_process');
const { parseDate, parseReportDate, parseQuantidade, normalizeVesselName } = require('./normalize');

// Regex patterns — order of application is critical (see comments)
const VESSEL_ROW   = /^([A-Z][A-Za-z0-9\s\-\.]+?)\s{2,}(\d{2}\/\w{3}\/\d{2})\s+(\d{2}\/\w{3}\/\d{2})\s+(\d{2}\/\w{3}\/\d{2})\s+(L|D)\s+([\d.]+)\s+(.+?)\s{2,}(.+?)\s{2,}(.+?)\s*$/;
const PORT_HEADER  = /^([A-Za-zÀ-ÿ][a-zA-ZÀ-ÿ\s]+?)\s*-\s*([A-Z].+?)(?:\s{10,}.*)?$/;
const DATE_HEADER  = /Data:\s*(\d{2}\/\d{2}\/\d{2})\s+(\d{2}:\d{2}:\d{2})/;
const HEADER_ROW   = /^Navio\s+ETA\s+ETB\s+ETS\s+OP\./;
const SKIP_NOISY   = /Grupo Orion|Relatório|Página|Sistema Pedra|Copyright|Desenvolvido/;
const SKIP_SECTION = /^\s*Legend\s*$|OP: Type|Tempo Espera|^\s*Obs:|^\s*tino\s*$|^\s*Berth Maintenance/;
const CONTINUATION = /^\s{20,}\S/;

/**
 * Parse a Callidus/Pedra Digital "Relatorio Lineup - Sintetico 3" PDF.
 * Uses pdftotext -layout for text extraction.
 *
 * @param {string} pdfPath - Absolute path to the PDF file
 * @returns {{ reportDate: string|null, vessels: object[], warnings: string[] }}
 */
function parsePdf(pdfPath) {
  const raw = execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  const lines = raw.split('\n');

  let reportDate = null;
  let portCidade = null;
  let portTerminal = null;
  let cols = { origCol: 0, afretCol: 0, isDestino: false };
  let inVesselTable = false;
  const vessels = [];
  const warnings = [];
  let prev = null;

  for (const line of lines) {
    // ---------------------------------------------------------------
    // 1. VESSEL ROW — checked FIRST to catch "SW Legend" and similar
    //    vessel names that would match skip patterns if checked later.
    // ---------------------------------------------------------------
    const mv = VESSEL_ROW.exec(line);
    if (mv && inVesselTable) {
      try {
        const op = mv[5].trim();
        const colVal = mv[8].trim() || null;
        // Determine whether the column value is origem or destino.
        // Business rule: op=L→destino, op=D→origem (always).
        // Column header determines whether we even have a port value, but
        // the op value determines which field it belongs to.
        // Edge case: some PDFs have a "Destino" column but include op=D vessels
        // (data quality issue in source PDF). Always route by op.
        let origemVal, destinoVal;
        if (op === 'L') {
          origemVal  = null;
          destinoVal = colVal;
        } else {
          // op === 'D'
          origemVal  = colVal;
          destinoVal = null;
        }
        const v = {
          vessel_name_raw:       mv[1].trim(),
          vessel_name_canonical: normalizeVesselName(mv[1]),
          eta:                   parseDate(mv[2]),
          etb:                   parseDate(mv[3]),
          ets:                   parseDate(mv[4]),
          op,
          quantidade:            parseQuantidade(mv[6]),
          carga:                 mv[7].trim() || null,
          origem:                origemVal,
          destino:               destinoVal,
          afretador:             mv[9].trim() || null,
          porto_cidade:          portCidade,
          porto_terminal:        portTerminal,
        };
        vessels.push(v);
        prev = v;
      } catch (e) {
        warnings.push(`Linha ignorada: ${line.trim().slice(0, 60)} — ${e.message}`);
        prev = null;
      }
      continue;
    }

    // ---------------------------------------------------------------
    // 2. Report date — appears once on line 4 of every PDF
    // ---------------------------------------------------------------
    const md = DATE_HEADER.exec(line);
    if (md) {
      reportDate = parseReportDate(md[1], md[2]);
      continue;
    }

    // ---------------------------------------------------------------
    // 3. PORT HEADER — checked BEFORE SKIP_SECTION.
    //    Handles the Imbituba first-port case where Legend text is
    //    appended to the same line: "Imbituba - Commercial Quay   OP: Type..."
    //    Fix: truncate to first 70 chars before matching.
    // ---------------------------------------------------------------
    if (!line.startsWith(' ') && line.includes(' - ') && !HEADER_ROW.test(line.trim())) {
      const truncated = line.slice(0, 70).trim();
      const mp = PORT_HEADER.exec(truncated);
      if (mp) {
        portCidade    = mp[1].trim();
        portTerminal  = mp[2].trim();
        inVesselTable = false;
        prev          = null;
        continue;
      }
    }

    // ---------------------------------------------------------------
    // 4. Skip boilerplate lines (page numbers, copyright, system name)
    // ---------------------------------------------------------------
    if (SKIP_NOISY.test(line)) continue;

    // ---------------------------------------------------------------
    // 5. Skip section-level noise (standalone Legend, Tempo Espera, Obs)
    // ---------------------------------------------------------------
    if (SKIP_SECTION.test(line)) continue;

    // ---------------------------------------------------------------
    // 6. Column header row — read column positions for this section.
    //    Column positions vary between sections — NEVER hard-code.
    // ---------------------------------------------------------------
    if (HEADER_ROW.test(line.trim())) {
      const origIdx   = line.indexOf('Origem');
      const destIdx   = line.indexOf('Destino');
      // "Origem/Des" is a truncated combined column (Destino wraps to next line)
      const origDesIdx = line.indexOf('Origem/Des');
      const origCol   = origDesIdx >= 0 ? origDesIdx
                        : Math.max(origIdx, destIdx);
      const afretCol  = line.indexOf('Afretador');
      // Three cases:
      //   "Origem"     → discharge sections (op=D), value goes to origem
      //   "Destino"    → loading sections (op=L), value goes to destino
      //   "Origem/Des" → combined column, assign based on vessel op value
      const hasOrigem  = origIdx >= 0;
      const hasDestino = destIdx >= 0;
      const isCombined = origDesIdx >= 0 || (hasOrigem && hasDestino);
      const isDestino  = hasDestino && !hasOrigem && !isCombined;
      cols = { origCol, afretCol, isDestino, isCombined };
      inVesselTable = true;
      prev = null;
      continue;
    }

    if (!inVesselTable) continue;

    // ---------------------------------------------------------------
    // 7. Continuation line — Origem and Afretador values that wrap.
    //    Split at afretCol to distribute to both fields correctly.
    // ---------------------------------------------------------------
    if (prev && CONTINUATION.test(line) && !/\d{2}\/\w{3}\/\d{2}/.test(line)) {
      const stripped = line.trim();
      if (!stripped) continue;

      if (cols.origCol > 0 && cols.afretCol > 0) {
        const origCont  = line.slice(cols.origCol,  cols.afretCol).trim();
        const afretCont = line.slice(cols.afretCol).trim();
        // Always route continuation by vessel op (same rule as vessel row)
        const field = prev.op === 'L' ? 'destino' : 'origem';
        if (origCont)  prev[field]      = prev[field]      ? prev[field]      + ' ' + origCont  : origCont;
        if (afretCont) prev.afretador   = prev.afretador   ? prev.afretador   + ' ' + afretCont : afretCont;
      } else {
        // Fallback: column positions unavailable — append all to afretador
        prev.afretador = prev.afretador ? prev.afretador + ' ' + stripped : stripped;
      }
    }
  }

  return { reportDate, vessels, warnings };
}

module.exports = { parsePdf };
