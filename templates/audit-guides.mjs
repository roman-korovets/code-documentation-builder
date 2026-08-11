#!/usr/bin/env node
// Generic vault user-documentation auditor — drop into any documentation/
// folder produced by code-documentation-builder. Six checks (G1–G6):
//
//   G1 — required frontmatter present (type, audience; type=guide also needs related-settings)
//   G2 — every `prerequisites:` slug resolves to a real guide
//   G3 — every `screenshots:` path exists on disk
//   G4 — no dead-end pages (every non-index guide has >=1 link)
//   G5 — every how-to / workflow is reachable from _guides-index.md
//   G6 — `audience: report-author` (or `end-user`) docs avoid dev jargon
//
// Project-specific dev-jargon patterns go in JARGON_PATTERNS below. Default
// list is empty — the installer rewrites it during `npm run audit` based on
// the project's `audit-guides.jargon` config block.

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT_DOC = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:');
const GUIDES_DIR = join(ROOT_DOC, 'guides');
const ASSETS_DIR = join(GUIDES_DIR, 'assets');
const INDEX_FILE = join(GUIDES_DIR, '_guides-index.md');

// Auto-populated by the audit installer; empty by default.
const JARGON_PATTERNS = [
  // /\bIVisual\b/,
];

if (!existsSync(GUIDES_DIR)) {
  console.log('ℹ guides/ folder does not exist — nothing to audit');
  process.exit(0);
}

const safeReadDir = (d) => { try { return readdirSync(d); } catch { return []; } };
const safeStat = (p) => { try { return statSync(p); } catch { return null; } };

const guides = [];
const walk = (dir) => {
  for (const entry of safeReadDir(dir)) {
    const full = join(dir, entry);
    const stat = safeStat(full);
    if (!stat) continue;
    if (stat.isDirectory()) {
      if (full.startsWith(ASSETS_DIR)) continue;
      walk(full);
    } else if (entry.endsWith('.md')) {
      const rel = relative(ROOT_DOC, full).replace(/\\/g, '/');
      const slug = rel.replace(/\.md$/, '');
      const text = readFileSync(full, 'utf8');
      const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      const frontmatter = fmMatch ? parseFrontmatter(fmMatch[1]) : {};
      const body = fmMatch ? fmMatch[2] : text;
      const section = rel.split('/')[1] || '';
      guides.push({ slug, file: full, rel, section, frontmatter, body });
    }
  }
};

function parseFrontmatter(raw) {
  const out = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([a-z][a-z0-9-]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      out[key] = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    } else if (val === 'true' || val === 'false') {
      out[key] = val === 'true';
    } else {
      out[key] = val;
    }
  }
  return out;
}

walk(GUIDES_DIR);
console.log(`\n📘 ${guides.length} guide file(s) under documentation/guides/\n`);

const guideSlugs = new Set(guides.map(g => g.slug));
let totalIssues = 0;

// ── G1: required frontmatter ──
console.log('═══ G1. Required frontmatter ═══');
let g1 = 0;
const VALID_TYPES = new Set(['guide', 'concept', 'workflow', 'troubleshooting', 'reference-user', 'persona', 'index']);
const VALID_AUDIENCE = new Set(['report-author', 'end-user', 'developer', 'admin']);
for (const g of guides) {
  const fm = g.frontmatter;
  for (const k of ['type', 'audience']) {
    if (!fm[k]) { console.log(`  ⚠ ${g.rel} — missing required frontmatter "${k}"`); g1++; }
  }
  if (fm.type === 'guide' && !fm['related-settings']) {
    console.log(`  ⚠ ${g.rel} — type=guide requires "related-settings"`);
    g1++;
  }
  if (fm.type && !VALID_TYPES.has(fm.type)) {
    console.log(`  ⚠ ${g.rel} — invalid type "${fm.type}"`);
    g1++;
  }
  if (fm.audience && !VALID_AUDIENCE.has(fm.audience)) {
    console.log(`  ⚠ ${g.rel} — invalid audience "${fm.audience}"`);
    g1++;
  }
}
if (g1 === 0) console.log('  ✅ all required frontmatter present');
totalIssues += g1;

// ── G2: prerequisites resolve ──
console.log('\n═══ G2. Prerequisites resolve ═══');
let g2 = 0;
for (const g of guides) {
  const prereqs = g.frontmatter.prerequisites || [];
  if (!Array.isArray(prereqs)) continue;
  for (const p of prereqs) {
    if (!guideSlugs.has(p)) {
      console.log(`  ⚠ ${g.rel} — prerequisite "${p}" not found`);
      g2++;
    }
  }
}
if (g2 === 0) console.log('  ✅ all prerequisites resolve');
totalIssues += g2;

// ── G3: screenshots exist ──
console.log('\n═══ G3. Screenshots exist ═══');
let g3 = 0;
for (const g of guides) {
  const shots = g.frontmatter.screenshots || [];
  if (!Array.isArray(shots)) continue;
  for (const s of shots) {
    const full = join(GUIDES_DIR, s);
    if (!existsSync(full)) {
      console.log(`  ⚠ ${g.rel} — screenshot "${s}" not found at guides/${s}`);
      g3++;
    }
  }
}
if (g3 === 0) console.log('  ✅ all screenshot paths exist');
totalIssues += g3;

// ── G4: no dead-end pages ──
console.log('\n═══ G4. No dead-end pages ═══');
let g4 = 0;
const WIKILINK_RE = /\[\[([^\]]+?)\]\]/g;
const MD_LINK_RE = /\[[^\]]+\]\(([^)]+)\)/g;
for (const g of guides) {
  if (g.frontmatter.type === 'index') continue;
  const wikilinks = [...g.body.matchAll(WIKILINK_RE)].length;
  const mdlinks = [...g.body.matchAll(MD_LINK_RE)].length;
  if (wikilinks + mdlinks === 0) {
    console.log(`  ⚠ ${g.rel} — dead-end (no [[wikilinks]] or [text](file.md) links in body)`);
    g4++;
  }
}
if (g4 === 0) console.log('  ✅ no dead-end pages');
totalIssues += g4;

// ── G5: how-tos reachable from master index ──
console.log('\n═══ G5. How-tos reachable from _guides-index.md ═══');
let g5 = 0;
if (!existsSync(INDEX_FILE)) {
  console.log(`  ℹ ${INDEX_FILE} not found — skipping G5`);
} else {
  const indexText = readFileSync(INDEX_FILE, 'utf8');
  const sectionIndexLinked = (section) => indexText.includes(`[[guides/${section}/_section-index]]`);
  const sectionIndexText = (section) => {
    const p = join(GUIDES_DIR, section, '_section-index.md');
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  };
  for (const g of guides) {
    if (g.section !== 'how-to' && g.section !== 'workflows') continue;
    if (g.slug.endsWith('_section-index')) continue;
    const directLink = indexText.includes(`[[${g.slug}]]`);
    const viaSection = sectionIndexLinked(g.section) && sectionIndexText(g.section).includes(`[[${g.slug}]]`);
    if (!directLink && !viaSection) {
      console.log(`  ⚠ ${g.rel} — not reachable from master index`);
      g5++;
    }
  }
}
if (g5 === 0) console.log('  ✅ all how-tos / workflows reachable from master index');
totalIssues += g5;

// ── G6: user-facing docs avoid dev jargon ──
console.log('\n═══ G6. User-facing docs avoid dev jargon ═══');
let g6 = 0;
if (JARGON_PATTERNS.length === 0) {
  console.log('  ℹ no JARGON_PATTERNS configured — skipping G6');
} else {
  for (const g of guides) {
    if (g.frontmatter.audience !== 'report-author' && g.frontmatter.audience !== 'end-user') continue;
    for (const re of JARGON_PATTERNS) {
      const m = g.body.match(re);
      if (m) {
        console.log(`  ⚠ ${g.rel} — contains dev jargon "${m[0]}"`);
        g6++;
      }
    }
  }
}
if (g6 === 0) console.log('  ✅ no dev jargon in user-facing docs');
totalIssues += g6;

// ── Summary ──
console.log(`\n${totalIssues === 0 ? '✅' : '⚠ '} ${totalIssues} issue(s) total\n`);
process.exit(totalIssues === 0 ? 0 : 1);
