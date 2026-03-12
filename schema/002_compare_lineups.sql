-- Migration: 002_compare_lineups
-- Lineup Dashboard Pro — Phase 7
-- Run in Supabase SQL Editor
-- Compares two lineup reports and returns classified rows with field-level change metadata

CREATE OR REPLACE FUNCTION compare_lineups(
  report_id_a UUID,  -- baseline (old/previous week)
  report_id_b UUID   -- target (new/current week)
)
RETURNS TABLE (
  vessel_name_canonical TEXT,
  porto_cidade          TEXT,
  porto_terminal        TEXT,
  eta                   DATE,
  etb                   DATE,
  ets                   DATE,
  op                    TEXT,
  quantidade            INTEGER,
  carga                 TEXT,
  origem                TEXT,
  destino               TEXT,
  afretador             TEXT,
  diff_status           TEXT,
  eta_shifted_days      INTEGER,
  fields_changed        TEXT[],
  old_eta               DATE,
  old_etb               DATE,
  old_ets               DATE,
  old_carga             TEXT,
  old_afretador         TEXT,
  old_quantidade        INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH
    week_a AS (
      SELECT * FROM lineup_entries WHERE lineup_entries.report_id = report_id_a
    ),
    week_b AS (
      SELECT * FROM lineup_entries WHERE lineup_entries.report_id = report_id_b
    )
  SELECT
    COALESCE(b.vessel_name_canonical, a.vessel_name_canonical),
    COALESCE(b.porto_cidade, a.porto_cidade),
    COALESCE(b.porto_terminal, a.porto_terminal),
    COALESCE(b.eta, a.eta),
    COALESCE(b.etb, a.etb),
    COALESCE(b.ets, a.ets),
    COALESCE(b.op, a.op)::TEXT,
    COALESCE(b.quantidade, a.quantidade),
    COALESCE(b.carga, a.carga),
    COALESCE(b.origem, a.origem),
    COALESCE(b.destino, a.destino),
    COALESCE(b.afretador, a.afretador),
    CASE
      WHEN a.id IS NULL THEN 'ADDED'
      WHEN b.id IS NULL THEN 'REMOVED'
      WHEN (
        a.eta IS DISTINCT FROM b.eta OR
        a.etb IS DISTINCT FROM b.etb OR
        a.ets IS DISTINCT FROM b.ets OR
        a.op  IS DISTINCT FROM b.op  OR
        a.quantidade IS DISTINCT FROM b.quantidade OR
        a.carga IS DISTINCT FROM b.carga OR
        a.origem IS DISTINCT FROM b.origem OR
        a.destino IS DISTINCT FROM b.destino OR
        a.afretador IS DISTINCT FROM b.afretador OR
        a.porto_terminal IS DISTINCT FROM b.porto_terminal
      ) THEN 'CHANGED'
      ELSE 'UNCHANGED'
    END,
    CASE
      WHEN a.id IS NOT NULL AND b.id IS NOT NULL
           AND a.eta IS NOT NULL AND b.eta IS NOT NULL
      THEN (b.eta - a.eta)
      ELSE NULL
    END,
    CASE
      WHEN a.id IS NULL OR b.id IS NULL THEN NULL
      ELSE ARRAY_REMOVE(ARRAY[
        CASE WHEN a.eta IS DISTINCT FROM b.eta THEN 'eta' END,
        CASE WHEN a.etb IS DISTINCT FROM b.etb THEN 'etb' END,
        CASE WHEN a.ets IS DISTINCT FROM b.ets THEN 'ets' END,
        CASE WHEN a.op  IS DISTINCT FROM b.op  THEN 'op'  END,
        CASE WHEN a.quantidade IS DISTINCT FROM b.quantidade THEN 'quantidade' END,
        CASE WHEN a.carga IS DISTINCT FROM b.carga THEN 'carga' END,
        CASE WHEN a.origem IS DISTINCT FROM b.origem THEN 'origem' END,
        CASE WHEN a.destino IS DISTINCT FROM b.destino THEN 'destino' END,
        CASE WHEN a.afretador IS DISTINCT FROM b.afretador THEN 'afretador' END,
        CASE WHEN a.porto_terminal IS DISTINCT FROM b.porto_terminal THEN 'porto_terminal' END
      ], NULL)
    END,
    a.eta,
    a.etb,
    a.ets,
    a.carga,
    a.afretador,
    a.quantidade
  FROM
    week_a a
  FULL OUTER JOIN
    week_b b
    ON a.vessel_name_canonical = b.vessel_name_canonical
    AND a.porto_cidade = b.porto_cidade;
END;
$$ LANGUAGE plpgsql STABLE;
