export interface PortTrendRow {
  report_date: string;
  porto_cidade: string;
  vessel_count: number;
  total_volume: number;
}

export interface CargoCompositionRow {
  report_date: string;
  porto_cidade: string;
  carga: string;
  vessel_count: number;
  total_volume: number;
}

export interface VesselTimelineRow {
  vessel_name_canonical: string;
  report_date: string;
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

export interface AfretadorSummaryRow {
  afretador: string;
  appearance_count: number;
  unique_vessels: number;
  unique_ports: number;
  first_seen: string;
  last_seen: string;
}
