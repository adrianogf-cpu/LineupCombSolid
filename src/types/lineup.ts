export interface LineupEntry {
  id: string;
  report_id: string;
  vessel_name_raw: string;
  vessel_name_canonical: string | null;
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
}
