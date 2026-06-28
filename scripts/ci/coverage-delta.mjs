#!/usr/bin/env node
// Compare two Istanbul/vitest `coverage-summary.json` files and print a markdown
// table of the total coverage delta (PR vs. main baseline).
//
// Usage:
//   node scripts/ci/coverage-delta.mjs <pr-summary.json> [baseline-summary.json]
//
// - With one argument: prints the PR's absolute totals (no baseline to diff).
// - With two arguments: prints PR totals plus the delta against the baseline.
// - Missing/unreadable files degrade gracefully to an informational message so
//   the CI conclusion step never hard-fails on a first PR (no baseline yet).
//
// Pure Node, no dependencies — mirrors data-platform's deterministic coverage
// diff (no third-party action, no LLM).

import { readFileSync } from 'node:fs';

const METRICS = ['lines', 'statements', 'functions', 'branches'];

function readTotals(file) {
  if (!file) return null;
  try {
    const json = JSON.parse(readFileSync(file, 'utf8'));
    return json.total ?? null;
  } catch {
    return null;
  }
}

function pct(metric) {
  return typeof metric?.pct === 'number' ? metric.pct : null;
}

function fmtPct(value) {
  return value === null ? 'n/a' : `${value.toFixed(2)}%`;
}

function fmtDelta(value) {
  if (value === null) return '—';
  const sign = value > 0 ? '+' : '';
  const arrow = value > 0.0001 ? ' ▲' : value < -0.0001 ? ' ▼' : '';
  return `${sign}${value.toFixed(2)}%${arrow}`;
}

const [, , prFile, baselineFile] = process.argv;

const prTotals = readTotals(prFile);
const baseTotals = readTotals(baselineFile);

if (!prTotals) {
  console.log('> ⚠️ No PR coverage summary found — coverage delta unavailable.');
  process.exit(0);
}

const rows = METRICS.map((metric) => {
  const cur = pct(prTotals[metric]);
  const base = pct(baseTotals?.[metric]);
  const delta = cur !== null && base !== null ? cur - base : null;
  const label = metric.charAt(0).toUpperCase() + metric.slice(1);
  return `| ${label} | ${fmtPct(cur)} | ${fmtPct(base)} | ${fmtDelta(delta)} |`;
});

const lines = [];
lines.push('| Metric | PR | main | Δ |');
lines.push('| ------ | -- | ---- | - |');
lines.push(...rows);

if (!baseTotals) {
  lines.push('');
  lines.push(
    '> ℹ️ No `main` coverage baseline available yet — delta will populate once `main` runs `ci.yml`.',
  );
}

console.log(lines.join('\n'));
