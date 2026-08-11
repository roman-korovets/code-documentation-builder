#!/usr/bin/env node
// Generic vault quality auditor — drop into any documentation/ folder
// produced by code-documentation-builder. Karpathy rules R1-R4:
//   R1 — first body line is fact-first (no filler openings)
//   R2 — no plain-text .md references (everything via [[wikilinks]] or [text](path))
//   R3 — at least one outgoing link per doc
//   R4 — hot-path: true docs must contain a ⚠️ warning in body
//
// TARGETS is populated by the build orchestrator with: every hot-path doc,
// every shared-dep hotspot (≥3 features), and the top 3 most-linked docs.
// Edit by hand to add more files to spot-check.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:');

// Auto-populated by orchestrator; empty by default.
const TARGETS = [
  'store-set-entry.md',
  'utils-chunk.md',
  'utils-is-blank.md',
];

// Fallback: when TARGETS is empty, audit every hot-path doc found in the vault.
const collectTargets = () => {
  if (TARGETS.length > 0) return TARGETS;
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.')) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.md')) {
        const text = readFileSync(p, 'utf8');
        if (/hot-path:\s*true/.test(text)) out.push(p.slice(ROOT.length));
      }
    }
  };
  walk(ROOT);
  return out;
};

const FILLERS = /^(this|the following|here|in this|below|above|note that|please|simply|just|basically|essentially)\b/i;

const targets = collectTargets();
if (targets.length === 0) {
  console.log('No TARGETS configured and no hot-path docs found. Edit TARGETS in audit-quality.mjs to spot-check specific files.');
  process.exit(0);
}

for (const file of targets) {
  const path = join(ROOT, file);
  let text;
  try { text = readFileSync(path, 'utf8'); }
  catch { console.log(`\n❌ ${file}: NOT FOUND`); continue; }

  const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
  const fm = fmMatch ? fmMatch[1] : '';
  const body = text.replace(/^---[\s\S]*?\n---/, '').trim();
  const hotPath = /hot-path:\s*true/.test(fm);

  console.log(`\n═══ ${file} ${hotPath ? '🔥' : ''} ═══`);

  // R1 — first paragraph fact-first
  const firstPara = body.split('\n').find(l => l.trim() && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('---')) || '';
  const filler = FILLERS.test(firstPara.replace(/^[`*_>\s]+/, ''));
  console.log(`  R1 first-line fact: ${filler ? '⚠️  filler start' : '✅'}  "${firstPara.slice(0, 80).trim()}..."`);

  // R2 — TRUE plain-text refs (bare file.md not in any link syntax)
  const stripped = body
    .replace(/\[\[[^\]]+\]\]/g, '')           // remove [[wikilinks]]
    .replace(/\[[^\]]*\]\([^)]+\)/g, '')      // remove [text](url) markdown links
    .replace(/`[^`]+`/g, '');                  // remove `code spans`
  const trulyPlain = [...stripped.matchAll(/\b([a-z][a-z0-9-]+\.md)\b/g)].map(m => m[1]);
  console.log(`  R2 truly-plain .md refs: ${trulyPlain.length === 0 ? '✅' : `⚠️  ${trulyPlain.length} found (${[...new Set(trulyPlain)].slice(0,3).join(', ')}...)`}`);

  // R3 — at least one outgoing link
  const wikilinks = (body.match(/\[\[[^\]]+\]\]/g) || []).length;
  const mdLinks = (body.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;
  const outgoing = wikilinks + mdLinks;
  console.log(`  R3 outgoing links: ${outgoing > 0 ? `✅ ${outgoing}` : '❌ DEAD END'}`);

  // R4 — hot-path docs need visible ⚠️
  if (hotPath) {
    const hasWarning = /⚠️/.test(body);
    console.log(`  R4 hot-path ⚠️ in body: ${hasWarning ? '✅' : '⚠️  MISSING'}`);
  } else {
    console.log(`  R4 hot-path ⚠️: n/a (not hot-path)`);
  }
}
