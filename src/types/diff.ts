export type DiffStatus = 'ADDED' | 'REMOVED' | 'CHANGED' | 'UNCHANGED';

export interface DiffEntry {
  vessel_name_canonical: string;
  porto_cidade: string | null;
  porto_terminal: string | null;
  eta: string | null;
  etb: string | null;
  ets: string | null;
  op: string | null;
  quantidade: number | null;
  carga: string | null;
  origem: string | null;
  destino: string | null;
  afretador: string | null;
  diff_status: DiffStatus;
  eta_shifted_days: number | null;
  fields_changed: string[] | null;
  old_eta: string | null;
  old_etb: string | null;
  old_ets: string | null;
  old_carga: string | null;
  old_afretador: string | null;
  old_quantidade: number | null;
}

/** Row background class by diff status */
export function diffRowClass(status: DiffStatus): string {
  switch (status) {
    case 'ADDED':     return 'bg-green-50 dark:bg-green-950/30';
    case 'REMOVED':   return 'bg-red-50 dark:bg-red-950/30 opacity-70';
    case 'CHANGED':   return '';
    case 'UNCHANGED': return '';
  }
}

/** Cell highlight class for changed fields */
export function diffCellClass(
  fieldName: string,
  fieldsChanged: string[] | null
): string {
  if (!fieldsChanged?.includes(fieldName)) return '';
  return 'bg-yellow-100 dark:bg-yellow-900/40';
}
