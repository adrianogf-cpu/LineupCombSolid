const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

export function parseDate(s: string | null | undefined): string | null {
  if (!s || !s.trim()) return null;
  const m = /(\d{2})\/(\w{3})\/(\d{2})/.exec(s.trim());
  if (!m) return null;
  const month = String(MONTHS[m[2]]).padStart(2, '0');
  if (!month || month === 'NaN') return null;
  return `20${m[3]}-${month}-${m[1]}`;
}

export function parseReportDate(datePart: string, timePart: string): string {
  const [dd, mm, yy] = datePart.split('/');
  return `20${yy}-${mm}-${dd}T${timePart}`;
}

export function parseQuantidade(s: string | null | undefined): number | null {
  if (!s || !s.trim()) return null;
  const n = parseInt(s.trim().replace(/\./g, ''), 10);
  return isNaN(n) ? null : n;
}

export function normalizeVesselName(raw: string): string {
  return raw.trim().toUpperCase();
}
