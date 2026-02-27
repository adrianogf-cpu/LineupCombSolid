#!/usr/bin/env node
'use strict';

/**
 * validate.js
 *
 * Runs the PDF parser against all 11 historical PDFs and asserts correctness.
 * Exits with code 0 if all assertions pass, code 1 if any fail.
 *
 * Usage:
 *   node scripts/validate.js          # full validation
 *   node scripts/validate.js --verbose # print every vessel row
 */

const path = require('path');
const fs   = require('fs');
const { parsePdf } = require('../lib/parse-pdf');

const PDF_DIR = path.join(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------
// Known ground-truth vessel counts per PDF
// Key: partial filename match (YYYYMMDD portion)
// Value: expected vessel count
// ---------------------------------------------------------------
const EXPECTED_COUNTS = {
  '20260128': 51,   // Contains "SW Legend" — must NOT be 50
  '20260220': 3,    // Special Maceio liquid bulk report
};

const EXPECTED_TOTAL = 534;

// ---------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(`FAIL: ${message}`);
    console.error(`  FAIL: ${message}`);
  }
}

function assertEq(actual, expected, message) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    const msg = `${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
    failures.push(`FAIL: ${msg}`);
    console.error(`  FAIL: ${msg}`);
  }
}

// ---------------------------------------------------------------
// Run validation
// ---------------------------------------------------------------
const pdfFiles = fs.readdirSync(PDF_DIR)
  .filter(f => f.startsWith('Report_LineupSintetico3_') && f.endsWith('.pdf'))
  .map(f => path.join(PDF_DIR, f))
  .sort();

assertEq(pdfFiles.length, 11, 'Number of PDF files found in PDF_DIR');

let totalVessels = 0;
let sawSwLegend  = false;

for (const pdfPath of pdfFiles) {
  const filename = path.basename(pdfPath);
  const dateKey  = filename.match(/(\d{8})/)?.[1] || filename;

  console.log(`\nValidating: ${filename}`);

  let result;
  try {
    result = parsePdf(pdfPath);
  } catch (e) {
    assert(false, `parsePdf threw exception for ${filename}: ${e.message}`);
    continue;
  }

  const { reportDate, vessels, warnings } = result;

  // ---- Report date ----
  assert(!!reportDate, `${filename}: reportDate must not be null`);
  if (reportDate) {
    assert(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(reportDate),
      `${filename}: reportDate format must be YYYY-MM-DDTHH:MM:SS, got "${reportDate}"`
    );
  }

  // ---- Vessel count ----
  assert(vessels.length > 0, `${filename}: vessel count must be > 0`);

  if (EXPECTED_COUNTS[dateKey]) {
    assertEq(vessels.length, EXPECTED_COUNTS[dateKey], `${filename}: vessel count`);
  }

  totalVessels += vessels.length;

  if (VERBOSE) {
    vessels.forEach(v => console.log('  ', JSON.stringify(v)));
  } else {
    console.log(`  Vessels: ${vessels.length}, Warnings: ${warnings.length}`);
  }

  // ---- Per-vessel assertions ----
  for (const [i, v] of vessels.entries()) {
    const ctx = `${filename} vessel[${i}] "${v.vessel_name_raw}"`;

    // Required fields present
    assert(!!v.vessel_name_raw,       `${ctx}: vessel_name_raw must not be empty`);
    assert(!!v.vessel_name_canonical, `${ctx}: vessel_name_canonical must not be empty`);
    assert(!!v.porto_cidade,          `${ctx}: porto_cidade must not be null (all vessels must have a port)`);

    // Canonical is uppercase
    assert(
      v.vessel_name_canonical === v.vessel_name_canonical.toUpperCase(),
      `${ctx}: vessel_name_canonical must be UPPERCASE, got "${v.vessel_name_canonical}"`
    );

    // Canonical is TRIM of raw UPPERCASED
    assert(
      v.vessel_name_canonical === v.vessel_name_raw.trim().toUpperCase(),
      `${ctx}: vessel_name_canonical must equal UPPER(TRIM(vessel_name_raw))`
    );

    // SW Legend check
    if (v.vessel_name_canonical === 'SW LEGEND') {
      sawSwLegend = true;
    }

    // OP value
    assert(
      v.op === 'L' || v.op === 'D',
      `${ctx}: op must be "L" or "D", got "${v.op}"`
    );

    // Date fields: if present, must be ISO format
    for (const dateField of ['eta', 'etb', 'ets']) {
      if (v[dateField] !== null) {
        assert(
          ISO_DATE_RE.test(v[dateField]),
          `${ctx}: ${dateField} must be YYYY-MM-DD or null, got "${v[dateField]}"`
        );
      }
    }

    // Quantidade: if present, must be integer
    if (v.quantidade !== null) {
      assert(
        Number.isInteger(v.quantidade),
        `${ctx}: quantidade must be integer or null, got ${typeof v.quantidade} ${v.quantidade}`
      );
      assert(
        v.quantidade > 0,
        `${ctx}: quantidade must be positive, got ${v.quantidade}`
      );
    }

    // No empty strings — empty values must be NULL
    const stringFields = ['carga', 'origem', 'destino', 'afretador', 'porto_cidade', 'porto_terminal'];
    for (const field of stringFields) {
      assert(
        v[field] !== '',
        `${ctx}: field "${field}" must be null or non-empty string, not empty string ""`
      );
    }

    // Origem/Destino mutual exclusivity based on op
    if (v.op === 'D') {
      assert(
        v.destino === null,
        `${ctx}: destino must be null when op=D (discharge), got "${v.destino}"`
      );
    }
    if (v.op === 'L') {
      assert(
        v.origem === null,
        `${ctx}: origem must be null when op=L (loading), got "${v.origem}"`
      );
    }
  }
}

// ---------------------------------------------------------------
// Cross-PDF assertions
// ---------------------------------------------------------------
console.log('\n--- Cross-PDF assertions ---');

assertEq(totalVessels, EXPECTED_TOTAL, `Total vessel count across all 11 PDFs`);

assert(
  sawSwLegend,
  `"SW LEGEND" vessel must appear in at least one PDF — if missing, VESSEL_ROW check order is wrong`
);

// ---------------------------------------------------------------
// Results
// ---------------------------------------------------------------
console.log('\n===============================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('===============================');

if (failures.length > 0) {
  console.error('\nFailure summary:');
  failures.forEach(f => console.error(' ', f));
  process.exit(1);
} else {
  console.log('\nAll assertions passed. Parser is valid for carga inicial.');
  process.exit(0);
}
