import { getDocumentProxy } from 'unpdf';
import { parseDate, parseReportDate, parseQuantidade, normalizeVesselName } from './normalize';

// --- Layout reconstruction from pdf.js text items ---

interface PositionedItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const CHAR_WIDTH = 3.6; // PDF points per character column — calibrated against Callidus Lineup PDFs

function reconstructLayout(items: any[], viewportHeight: number, fixedLeftMargin?: number): string {
  const textItems: PositionedItem[] = items
    .filter((item: any) => item.str != null && item.str !== '')
    .map((item: any) => ({
      str:    item.str,
      x:      item.transform[4],
      y:      viewportHeight - item.transform[5],
      width:  item.width,
      height: Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 8,
    }));

  if (!textItems.length) return '';

  // Use fixed left margin if provided (computed from page 1 for consistency).
  // Otherwise, compute from this page's content items.
  let leftMargin: number;
  if (fixedLeftMargin != null) {
    leftMargin = fixedLeftMargin;
  } else {
    // Find the most common leftmost x-position per row
    const rowMinX: number[] = [];
    let rItems = [textItems[0]];
    let rY = textItems[0].y;
    for (let i = 1; i < textItems.length; i++) {
      const tolerance = (textItems[i].height || 8) * 0.5;
      if (Math.abs(textItems[i].y - rY) <= tolerance) {
        rItems.push(textItems[i]);
      } else {
        rowMinX.push(Math.min(...rItems.map(it => it.x)));
        rItems = [textItems[i]];
        rY = textItems[i].y;
      }
    }
    rowMinX.push(Math.min(...rItems.map(it => it.x)));
    const xCounts = new Map<number, number>();
    for (const x of rowMinX) {
      const rounded = Math.round(x * 10) / 10;
      xCounts.set(rounded, (xCounts.get(rounded) || 0) + 1);
    }
    leftMargin = 0;
    let maxCount = 0;
    for (const [x, count] of xCounts) {
      if (count > maxCount) { maxCount = count; leftMargin = x; }
    }
  }

  textItems.sort((a, b) => a.y - b.y || a.x - b.x);

  const rows: PositionedItem[][] = [];
  let currentRow: PositionedItem[] = [textItems[0]];
  let currentY = textItems[0].y;

  for (let i = 1; i < textItems.length; i++) {
    const item = textItems[i];
    const tolerance = item.height * 0.5;
    if (Math.abs(item.y - currentY) <= tolerance) {
      currentRow.push(item);
    } else {
      rows.push(currentRow);
      currentRow = [item];
      currentY = item.y;
    }
  }
  rows.push(currentRow);

  const lines = rows.map(row => {
    row.sort((a, b) => a.x - b.x);
    let line = '';
    for (const item of row) {
      const targetCol = Math.round((item.x - leftMargin) / CHAR_WIDTH);
      while (line.length < targetCol) line += ' ';
      line += item.str;
    }
    return line;
  });

  return lines.join('\n');
}

async function extractLayoutText(pdfBuffer: Buffer | Uint8Array): Promise<string> {
  const data = pdfBuffer instanceof Buffer ? new Uint8Array(pdfBuffer) : pdfBuffer;
  const pdf = await getDocumentProxy(data);
  const pageTexts: string[] = [];
  let leftMargin: number | undefined;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const text = reconstructLayout(content.items, viewport.height, leftMargin);
    pageTexts.push(text);

    // After page 1, capture the left margin for consistency across pages
    if (i === 1 && !leftMargin) {
      // Re-derive: find the leftMargin that was used
      const items = content.items
        .filter((item: any) => item.str != null && item.str !== '')
        .map((item: any) => ({ x: item.transform[4] }));
      // The mode computation ran inside reconstructLayout for page 1;
      // replicate it here to capture the value
      const rowMinX: number[] = [];
      const sorted = [...items].sort((a, b) => a.x - b.x);
      // Simple: use the most common x rounded to 0.1
      const xCounts = new Map<number, number>();
      for (const it of items) {
        const r = Math.round(it.x * 10) / 10;
        xCounts.set(r, (xCounts.get(r) || 0) + 1);
      }
      let bestX = 0, bestCount = 0;
      for (const [x, count] of xCounts) {
        if (count > bestCount) { bestCount = count; bestX = x; }
      }
      leftMargin = bestX;
    }
  }

  pdf.destroy();
  return pageTexts.join('\n');
}

// --- Regex patterns (identical to Phase 1 parser) ---

const VESSEL_ROW   = /^([A-Z][A-Za-z0-9\s\-\.]+?)\s{2,}(\d{2}\/\w{3}\/\d{2})\s+(\d{2}\/\w{3}\/\d{2})\s+(\d{2}\/\w{3}\/\d{2})\s+(L|D)\s+([\d.]+)\s+(.+?)\s{2,}(.+?)\s{2,}(.+?)\s*$/;
const PORT_HEADER  = /^([A-Za-z\u00C0-\u00FF][a-zA-Z\u00C0-\u00FF\s]+?)\s*-\s*([A-Z].+?)(?:\s{10,}.*)?$/;
const DATE_HEADER  = /Data:\s*(\d{2}\/\d{2}\/\d{2})\s+(\d{2}:\d{2}:\d{2})/;
const HEADER_ROW   = /^Navio\s+ETA\s+ETB\s+ETS\s+OP\./;
const SKIP_NOISY   = /Grupo Orion|Relat\u00F3rio|P\u00E1gina|Sistema Pedra|Copyright|Desenvolvido/;
const SKIP_SECTION = /^\s*Legend\s*$|OP: Type|Tempo Espera|^\s*Obs:|^\s*tino\s*$|^\s*Berth Maintenance/;
const CONTINUATION = /^\s{20,}\S/;

// --- Types ---

export interface VesselEntry {
  vessel_name_raw: string;
  vessel_name_canonical: string;
  eta: string | null;
  etb: string | null;
  ets: string | null;
  op: string;
  quantidade: number | null;
  carga: string | null;
  origem: string | null;
  destino: string | null;
  afretador: string | null;
  porto_cidade: string | null;
  porto_terminal: string | null;
}

export interface ParseResult {
  reportDate: string | null;
  vessels: VesselEntry[];
  warnings: string[];
}

// --- Main parser ---

export async function parsePdfBuffer(buffer: Buffer | Uint8Array): Promise<ParseResult> {
  const raw = await extractLayoutText(buffer);
  const lines = raw.split('\n');

  let reportDate: string | null = null;
  let portCidade: string | null = null;
  let portTerminal: string | null = null;
  let cols = { origCol: 0, afretCol: 0, isDestino: false, isCombined: false };
  let inVesselTable = false;
  const vessels: VesselEntry[] = [];
  const warnings: string[] = [];
  let prev: VesselEntry | null = null;

  for (const line of lines) {
    // 1. VESSEL ROW — checked FIRST
    const mv = VESSEL_ROW.exec(line);
    if (mv && inVesselTable) {
      try {
        const op = mv[5].trim();
        const colVal = mv[8].trim() || null;
        let origemVal: string | null, destinoVal: string | null;
        if (op === 'L') { origemVal = null; destinoVal = colVal; }
        else { origemVal = colVal; destinoVal = null; }

        const v: VesselEntry = {
          vessel_name_raw: mv[1].trim(),
          vessel_name_canonical: normalizeVesselName(mv[1]),
          eta: parseDate(mv[2]),
          etb: parseDate(mv[3]),
          ets: parseDate(mv[4]),
          op,
          quantidade: parseQuantidade(mv[6]),
          carga: mv[7].trim() || null,
          origem: origemVal,
          destino: destinoVal,
          afretador: mv[9].trim() || null,
          porto_cidade: portCidade,
          porto_terminal: portTerminal,
        };
        vessels.push(v);
        prev = v;
      } catch (e: any) {
        warnings.push(`Linha ignorada: ${line.trim().slice(0, 60)} — ${e.message}`);
        prev = null;
      }
      continue;
    }

    // 2. Report date
    const md = DATE_HEADER.exec(line);
    if (md) { reportDate = parseReportDate(md[1], md[2]); continue; }

    // 3. Port header
    if (!line.startsWith(' ') && line.includes(' - ') && !HEADER_ROW.test(line.trim())) {
      const truncated = line.slice(0, 70).trim();
      const mp = PORT_HEADER.exec(truncated);
      if (mp) {
        portCidade = mp[1].trim();
        portTerminal = mp[2].trim();
        inVesselTable = false;
        prev = null;
        continue;
      }
    }

    // 4-5. Skip noise
    if (SKIP_NOISY.test(line)) continue;
    if (SKIP_SECTION.test(line)) continue;

    // 6. Column header row
    if (HEADER_ROW.test(line.trim())) {
      const origIdx = line.indexOf('Origem');
      const destIdx = line.indexOf('Destino');
      const origDesIdx = line.indexOf('Origem/Des');
      const origCol = origDesIdx >= 0 ? origDesIdx : Math.max(origIdx, destIdx);
      const afretCol = line.indexOf('Afretador');
      const hasOrigem = origIdx >= 0;
      const hasDestino = destIdx >= 0;
      const isCombined = origDesIdx >= 0 || (hasOrigem && hasDestino);
      const isDestino = hasDestino && !hasOrigem && !isCombined;
      cols = { origCol, afretCol, isDestino, isCombined };
      inVesselTable = true;
      prev = null;
      continue;
    }

    if (!inVesselTable) continue;

    // 7. Continuation line
    if (prev && CONTINUATION.test(line) && !/\d{2}\/\w{3}\/\d{2}/.test(line)) {
      const stripped = line.trim();
      if (!stripped) continue;
      if (cols.origCol > 0 && cols.afretCol > 0) {
        const origCont = line.slice(cols.origCol, cols.afretCol).trim();
        const afretCont = line.slice(cols.afretCol).trim();
        const field: 'destino' | 'origem' = prev.op === 'L' ? 'destino' : 'origem';
        if (origCont) prev[field] = prev[field] ? prev[field] + ' ' + origCont : origCont;
        if (afretCont) prev.afretador = prev.afretador ? prev.afretador + ' ' + afretCont : afretCont;
      } else {
        prev.afretador = prev.afretador ? prev.afretador + ' ' + stripped : stripped;
      }
    }
  }

  return { reportDate, vessels, warnings };
}
