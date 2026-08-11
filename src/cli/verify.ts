#!/usr/bin/env node
// CLI: verify classifier output against an existing reference vault.
// Reads frontmatter from each <slug>.md in <vaultRoot>, joins with the
// classified inventory by source-file + name (or by slug guess), and reports
// agreement / disagreement on module, type, hot-path, and features overlap.
//
// Usage:
//   npm run verify -- <vaultRoot> <projectRoot> [--config <path>] [--sample N]

import { resolve, basename, join } from 'node:path';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { discover } from '../discover/index.js';
import { classify, type ClassifiedEntry, type FeatureTaxonomyEntry } from '../classify/index.js';

interface CliConfig {
  moduleMap?: Record<string, string>;
  featureTaxonomy?: FeatureTaxonomyEntry[];
  hotPathPatterns?: string[];
}

const args = process.argv.slice(2);
const positional: string[] = [];
let configPath: string | undefined;
let sample = 0;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--config') configPath = resolve(args[++i]);
  else if (a === '--sample') sample = Number(args[++i]);
  else if (a && !a.startsWith('--')) positional.push(a);
}
if (positional.length < 2) {
  console.error('Usage: verify <vaultRoot> <projectRoot> [--config path] [--sample N]');
  process.exit(2);
}
const vaultRoot = resolve(positional[0]);
const projectRoot = resolve(positional[1]);

const walkMd = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkMd(p, out);
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
};

const parseFrontmatter = (text: string): Record<string, unknown> => {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm: Record<string, unknown> = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    let val: unknown = kv[2].trim();
    if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    } else if (val === 'true') val = true;
    else if (val === 'false') val = false;
    fm[kv[1]] = val;
  }
  return fm;
};

(async () => {
  const config: CliConfig = configPath ? JSON.parse(readFileSync(configPath, 'utf8')) : {};

  const inventory = await discover({ projectRoot, cache: false });
  const classified = await classify({
    inventory,
    projectRoot,
    moduleMap: config.moduleMap,
    featureTaxonomy: config.featureTaxonomy,
    hotPathPatterns: config.hotPathPatterns?.map((p) => new RegExp(p)),
  });

  // Index classified by file → list of entries (multiple per file likely).
  const byFile = new Map<string, ClassifiedEntry[]>();
  for (const e of classified) {
    const arr = byFile.get(e.file) ?? [];
    arr.push(e);
    byFile.set(e.file, arr);
  }

  const docs = walkMd(vaultRoot)
    .map((p) => ({ path: p, slug: basename(p, '.md'), text: readFileSync(p, 'utf8') }))
    .map((d) => ({ ...d, fm: parseFrontmatter(d.text) }))
    .filter((d) => typeof d.fm['source-file'] === 'string' && d.fm.type !== 'feature-overview' && d.fm.type !== 'module-overview' && d.fm.type !== 'index');

  let total = 0;
  let moduleHit = 0;
  let typeHit = 0;
  let hotPathHit = 0;
  let featureOverlap = 0;
  const mismatches: { slug: string; got: ClassifiedEntry | null; want: Record<string, unknown> }[] = [];

  const picked = sample > 0 ? docs.filter((_, i) => i % Math.max(1, Math.floor(docs.length / sample)) === 0).slice(0, sample) : docs;

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const doc of picked) {
    const wantFile = (doc.fm['source-file'] as string).replace(/\\/g, '/').replace(/:\d+(-\d+)?$/, '');
    const candidates = byFile.get(wantFile) ?? [];
    const slugNorm = norm(doc.slug);
    let got: ClassifiedEntry | null = null;
    if (candidates.length === 1) got = candidates[0];
    else if (candidates.length > 1) {
      // Prefer the candidate whose normalised name appears in the slug (longest wins).
      let bestLen = 0;
      for (const c of candidates) {
        const localName = c.name.includes('.') ? c.name.split('.').pop()! : c.name;
        const nameNorm = norm(localName);
        if (nameNorm.length > bestLen && slugNorm.includes(nameNorm)) {
          got = c;
          bestLen = nameNorm.length;
        }
      }
    }

    total++;
    if (!got) {
      mismatches.push({ slug: doc.slug, got: null, want: doc.fm });
      continue;
    }

    const wantModule = String(doc.fm.module ?? '');
    const wantType = String(doc.fm.type ?? '');
    const wantHotPath = doc.fm['hot-path'] === true;
    const wantFeatures = Array.isArray(doc.fm.features) ? (doc.fm.features as string[]) : [];

    if (got.module === wantModule) moduleHit++;
    if (got.type === wantType) typeHit++;
    if (got.hotPath === wantHotPath) hotPathHit++;
    const overlap = wantFeatures.filter((f) => got!.features.includes(f)).length;
    if (wantFeatures.length === 0) featureOverlap++;
    else featureOverlap += overlap / wantFeatures.length;

    if (got.module !== wantModule || got.type !== wantType || got.hotPath !== wantHotPath) {
      mismatches.push({ slug: doc.slug, got, want: doc.fm });
    }
  }

  console.log(`\n📊 Verification on ${total} docs (sample=${sample || 'all'}):\n`);
  console.log(`   Module match : ${moduleHit}/${total} (${Math.round((moduleHit / total) * 100)}%)`);
  console.log(`   Type match   : ${typeHit}/${total} (${Math.round((typeHit / total) * 100)}%)`);
  console.log(`   Hot-path     : ${hotPathHit}/${total} (${Math.round((hotPathHit / total) * 100)}%)`);
  console.log(`   Feature avg  : ${(featureOverlap / total).toFixed(2)} jaccard`);

  if (mismatches.length > 0) {
    console.log(`\n   First 10 mismatches:`);
    for (const m of mismatches.slice(0, 10)) {
      if (!m.got) {
        console.log(`     ${m.slug.padEnd(50)} → NOT FOUND in inventory (want file=${m.want['source-file']})`);
      } else {
        const reasons: string[] = [];
        if (m.got.module !== m.want.module) reasons.push(`module: got=${m.got.module} want=${m.want.module}`);
        if (m.got.type !== m.want.type) reasons.push(`type: got=${m.got.type} want=${m.want.type}`);
        if (m.got.hotPath !== (m.want['hot-path'] === true)) reasons.push(`hot-path: got=${m.got.hotPath} want=${m.want['hot-path']}`);
        console.log(`     ${m.slug.padEnd(50)} ${reasons.join('; ')}`);
      }
    }
  }
})().catch((e) => {
  console.error(`\n❌ verify failed: ${e.message}`);
  process.exit(1);
});
