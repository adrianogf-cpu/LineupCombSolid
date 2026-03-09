-- Migration: 002_ingestion_log
-- Phase 4: Ingest Pipeline

CREATE TABLE IF NOT EXISTS ingestion_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  filename     TEXT NOT NULL,
  sha256_hash  TEXT,
  source       TEXT NOT NULL DEFAULT 'manual',
  status       TEXT NOT NULL DEFAULT 'pending',
  report_id    UUID REFERENCES lineup_reports(id) ON DELETE SET NULL,
  vessel_count INTEGER,
  error_message TEXT,
  storage_path TEXT
);

CREATE INDEX IF NOT EXISTS idx_ingestion_log_created_at
  ON ingestion_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingestion_log_status
  ON ingestion_log(status);
