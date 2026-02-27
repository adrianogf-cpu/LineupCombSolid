'use strict';

const MONTHS = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

/**
 * Parse DD/Mon/YY date string to ISO YYYY-MM-DD.
 * Returns null for empty/invalid input.
 */
function parseDate(s) {
  if (!s || !s.trim()) return null;
  const m = /(\d{2})\/(\w{3})\/(\d{2})/.exec(s.trim());
  if (!m) return null;
  const month = String(MONTHS[m[2]]).padStart(2, '0');
  if (!month || month === 'NaN') return null;
  return `20${m[3]}-${month}-${m[1]}`;
}

/**
 * Parse report date header: "DD/MM/YY HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SS"
 */
function parseReportDate(datePart, timePart) {
  const [dd, mm, yy] = datePart.split('/');
  return `20${yy}-${mm}-${dd}T${timePart}`;
}

/**
 * Parse Quantidade: Brazilian thousands separator ponto -> integer.
 * "32.000" -> 32000. Returns null for empty/invalid.
 */
function parseQuantidade(s) {
  if (!s || !s.trim()) return null;
  const n = parseInt(s.trim().replace(/\./g, ''), 10);
  return isNaN(n) ? null : n;
}

/**
 * Normalize vessel name: TRIM + UPPERCASE.
 * Raw name stored as-is; canonical is uppercased for deduplication.
 */
function normalizeVesselName(raw) {
  return raw.trim().toUpperCase();
}

module.exports = { parseDate, parseReportDate, parseQuantidade, normalizeVesselName };
