-- Analytics views for dashboard aggregation
-- Execute in Supabase SQL Editor

-- View 1: Port trends (vessel count and cargo volume per port per week)
CREATE OR REPLACE VIEW v_port_trends AS
SELECT
  lr.report_date::date AS report_date,
  le.porto_cidade,
  COUNT(*)::int AS vessel_count,
  COALESCE(SUM(le.quantidade), 0)::bigint AS total_volume
FROM lineup_entries le
JOIN lineup_reports lr ON lr.id = le.report_id
WHERE le.porto_cidade IS NOT NULL
GROUP BY lr.report_date, le.porto_cidade
ORDER BY lr.report_date, le.porto_cidade;

-- View 2: Cargo composition (cargo type breakdown per port per week)
CREATE OR REPLACE VIEW v_cargo_composition AS
SELECT
  lr.report_date::date AS report_date,
  le.porto_cidade,
  UPPER(le.carga) AS carga,
  COUNT(*)::int AS vessel_count,
  COALESCE(SUM(le.quantidade), 0)::bigint AS total_volume
FROM lineup_entries le
JOIN lineup_reports lr ON lr.id = le.report_id
WHERE le.carga IS NOT NULL AND le.porto_cidade IS NOT NULL
GROUP BY lr.report_date, le.porto_cidade, UPPER(le.carga)
ORDER BY lr.report_date, le.porto_cidade, UPPER(le.carga);

-- View 3: Vessel timeline (denormalized entries with report_date)
CREATE OR REPLACE VIEW v_vessel_timeline AS
SELECT
  le.vessel_name_canonical,
  lr.report_date::date AS report_date,
  le.porto_cidade,
  le.porto_terminal,
  le.eta,
  le.etb,
  le.ets,
  le.op,
  le.quantidade,
  le.carga,
  le.origem,
  le.destino,
  le.afretador
FROM lineup_entries le
JOIN lineup_reports lr ON lr.id = le.report_id
ORDER BY le.vessel_name_canonical, lr.report_date;

-- View 4: Afretador summary (aggregated by afretador for top list)
CREATE OR REPLACE VIEW v_afretador_summary AS
SELECT
  le.afretador,
  COUNT(*)::int AS appearance_count,
  COUNT(DISTINCT le.vessel_name_canonical)::int AS unique_vessels,
  COUNT(DISTINCT le.porto_cidade)::int AS unique_ports,
  MIN(lr.report_date)::date AS first_seen,
  MAX(lr.report_date)::date AS last_seen
FROM lineup_entries le
JOIN lineup_reports lr ON lr.id = le.report_id
WHERE le.afretador IS NOT NULL
GROUP BY le.afretador
ORDER BY appearance_count DESC;
