-- Migration: 001_initial_schema
-- Lineup Dashboard Pro — Phase 1
-- Run in Supabase SQL Editor (requires Supabase project provisioned in Phase 2)

-- ---------------------------------------------------------------
-- lineup_reports: one row per PDF ingestion
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lineup_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date   TIMESTAMPTZ NOT NULL,
  filename      TEXT NOT NULL,
  sha256_hash   TEXT NOT NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vessel_count  INTEGER,
  CONSTRAINT lineup_reports_sha256_hash_key UNIQUE (sha256_hash)
);

-- ---------------------------------------------------------------
-- lineup_entries: one row per vessel per report
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lineup_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id             UUID NOT NULL REFERENCES lineup_reports(id) ON DELETE CASCADE,
  vessel_name_raw       TEXT NOT NULL,
  vessel_name_canonical TEXT NOT NULL,
  porto_cidade          TEXT,
  porto_terminal        TEXT,
  eta                   DATE,
  etb                   DATE,
  ets                   DATE,
  op                    TEXT CHECK (op IN ('L', 'D')),
  quantidade            INTEGER,
  carga                 TEXT,
  origem                TEXT,
  destino               TEXT,
  afretador             TEXT,
  CONSTRAINT lineup_entries_unique_per_report
    UNIQUE (report_id, vessel_name_canonical, porto_cidade, porto_terminal)
);

-- ---------------------------------------------------------------
-- vessel_aliases: manual vessel name normalization map
-- Populated manually over time — NOT auto-populated in Phase 1
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vessel_aliases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias           TEXT NOT NULL,
  canonical_name  TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vessel_aliases_alias_key UNIQUE (alias)
);

-- ---------------------------------------------------------------
-- Indexes — optimized for Phase 6 dashboard query patterns
-- ---------------------------------------------------------------

-- Fast lookup of entries belonging to a report
CREATE INDEX IF NOT EXISTS idx_lineup_entries_report_id
  ON lineup_entries(report_id);

-- Vessel search and timeline (Phase 8)
CREATE INDEX IF NOT EXISTS idx_lineup_entries_vessel_canonical
  ON lineup_entries(vessel_name_canonical);

-- ETA-based sorting and date range filtering
CREATE INDEX IF NOT EXISTS idx_lineup_entries_eta
  ON lineup_entries(eta);

-- Port filter (city-level)
CREATE INDEX IF NOT EXISTS idx_lineup_entries_porto_cidade
  ON lineup_entries(porto_cidade);

-- Cargo type filter
CREATE INDEX IF NOT EXISTS idx_lineup_entries_carga
  ON lineup_entries(carga);

-- Afretador filter (Phase 8 tracker)
CREATE INDEX IF NOT EXISTS idx_lineup_entries_afretador
  ON lineup_entries(afretador);

-- Report date descending — default sort for "most recent report"
CREATE INDEX IF NOT EXISTS idx_lineup_reports_report_date
  ON lineup_reports(report_date DESC);
