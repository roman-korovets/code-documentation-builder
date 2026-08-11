#!/usr/bin/env node
// Generic vault link auditor — drop into any documentation/ folder produced by
// code-documentation-builder. Four checks:
//   A. Feature → function count consistency
//   B. Orphan docs (features: [])
//   C. Broken [[wikilinks]]
//   D. Shared-dependency hot spots (functions in ≥3 features)

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, basename } from 'path';

const ROOT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:');

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
};

const parseFrontmatter = (text) => {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    let val = kv[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    }
    fm[kv[1]] = val;
  }
  return fm;
};

const files = walk(ROOT);
const docs = files.map(f => {
  const text = readFileSync(f, 'utf8');
  return { path: f, name: basename(f, '.md'), text, fm: parseFrontmatter(text) };
});

const docNames = new Set(docs.map(d => d.name));

console.log(`\n📊 ${docs.length} docs scanned\n`);

// Check A — feature → function count consistency
console.log('═══ A. Feature → function count consistency ═══');
const features = docs.filter(d => d.path.includes('features') && d.fm.type === 'feature-overview');
const byFeature = new Map();
for (const d of docs) {
  const f = d.fm.features;
  if (Array.isArray(f)) for (const slug of f) {
    if (!byFeature.has(slug)) byFeature.set(slug, []);
    byFeature.get(slug).push(d.name);
  }
}
for (const f of features) {
  const slug = f.fm.slug || f.name;
  const stated = f.fm['function-count'];
  const actual = (byFeature.get(slug) || []).length;
  const status = String(stated) === String(actual) ? '✅' : '⚠️ ';
  console.log(`  ${status} ${slug.padEnd(28)} stated=${stated}  actual=${actual}`);
}

// Check B — orphan docs (features: [])
console.log('\n═══ B. Docs with empty `features: []` ═══');
const orphans = docs.filter(d =>
  d.fm.features && Array.isArray(d.fm.features) && d.fm.features.length === 0
  && !d.path.includes('_templates')
  && !d.name.startsWith('_')
);
console.log(`  Total: ${orphans.length}`);
console.log(`  Sample:`);
orphans.slice(0, 15).forEach(d => console.log(`    - ${d.name}  (module: ${d.fm.module || '?'})`));
if (orphans.length > 15) console.log(`    … ${orphans.length - 15} more`);

// Check C — broken wikilinks
console.log('\n═══ C. Broken `[[wikilinks]]` ═══');
const broken = [];
for (const d of docs) {
  const body = d.text.replace(/^---[\s\S]*?\n---/, '');
  const links = [...body.matchAll(/\[\[([^\]|#]+)/g)].map(m => m[1].trim().split('/').pop());
  for (const l of links) {
    if (!docNames.has(l)
      && !l.startsWith('callee-')
      && !l.startsWith('caller-')
      && l !== 'name'
      && !l.includes(' ')) {
      broken.push({ from: d.name, to: l });
    }
  }
}
console.log(`  Total broken: ${broken.length}`);
console.log(`  Sample:`);
[...new Set(broken.map(b => b.to))].slice(0, 15).forEach(t => {
  const refs = broken.filter(b => b.to === t).length;
  console.log(`    - [[${t}]]  (${refs} ref${refs > 1 ? 's' : ''})`);
});

// Check D — shared dependencies (functions in ≥3 features)
console.log('\n═══ D. Shared dependencies (functions in ≥3 features) ═══');
const shared = docs
  .filter(d => Array.isArray(d.fm.features) && d.fm.features.length >= 3)
  .sort((a, b) => b.fm.features.length - a.fm.features.length);
console.log(`  Total: ${shared.length}`);
shared.slice(0, 10).forEach(d =>
  console.log(`    - ${d.name.padEnd(50)} [${d.fm.features.join(', ')}]`)
);
