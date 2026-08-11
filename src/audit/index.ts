// Audit — Phase 8.
// Installs audit-links.mjs and audit-quality.mjs into the vault. The links
// script is copied verbatim (parameter-free; walks the vault on its own). The
// quality script is rewritten with a computed TARGETS array: hot-path docs +
// shared-dep hotspots (functions in ≥3 features) + top-N most-linked docs.
// Optionally executes both scripts and parses their output.

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { ClassifiedInventory } from '../classify/index.js';
import type { CallGraph } from '../graph/index.js';
import { entryKey } from '../graph/index.js';

export interface InstallAuditsOptions {
  inventory: ClassifiedInventory;
  graph: CallGraph;
  slugByKey: Map<string, string>;
  sharedHotspots: { slug: string; features: string[] }[];
  outputRoot: string;
  templatesRoot?: string;
  topLinkedCount?: number;
  write?: boolean;
}

export interface InstallAuditsResult {
  linksPath: string;
  qualityPath: string;
  guidesPath: string;
  targets: string[];
}

export interface RunAuditsOptions {
  outputRoot: string;
}

export interface AuditReport {
  links: { broken: number; orphans: number; sharedDeps: number; raw: string };
  quality: { r1Fails: number; r3Fails: number; r4Fails: number; targets: number; raw: string };
  guides: { totalIssues: number; raw: string };
}

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATES_ROOT = resolve(HERE, '..', '..', 'templates');

export async function installAudits(opts: InstallAuditsOptions): Promise<InstallAuditsResult> {
  const templatesRoot = opts.topLinkedCount === undefined && opts.templatesRoot === undefined
    ? DEFAULT_TEMPLATES_ROOT
    : (opts.templatesRoot ?? DEFAULT_TEMPLATES_ROOT);
  const topN = opts.topLinkedCount ?? 3;

  const linksPath = join(opts.outputRoot, 'audit-links.mjs');
  const qualityPath = join(opts.outputRoot, 'audit-quality.mjs');
  const guidesPath = join(opts.outputRoot, 'audit-guides.mjs');

  if (opts.write !== false) {
    copyFileSync(join(templatesRoot, 'audit-links.mjs'), linksPath);
    copyFileSync(join(templatesRoot, 'audit-guides.mjs'), guidesPath);
  }

  const targets = computeTargets({
    inventory: opts.inventory,
    graph: opts.graph,
    slugByKey: opts.slugByKey,
    sharedHotspots: opts.sharedHotspots,
    topLinkedCount: topN,
  });

  const qualityTemplate = readFileSync(join(templatesRoot, 'audit-quality.mjs'), 'utf8');
  const qualityRewritten = injectTargets(qualityTemplate, targets);
  if (opts.write !== false) writeFileSync(qualityPath, qualityRewritten, 'utf8');

  return { linksPath, qualityPath, guidesPath, targets };
}

export function computeTargets(args: {
  inventory: ClassifiedInventory;
  graph: CallGraph;
  slugByKey: Map<string, string>;
  sharedHotspots: { slug: string; features: string[] }[];
  topLinkedCount: number;
}): string[] {
  const { inventory, graph, slugByKey, sharedHotspots, topLinkedCount } = args;
  const out = new Set<string>();

  // Hot-path docs.
  for (const e of inventory) {
    if (!e.hotPath) continue;
    const s = slugByKey.get(entryKey(e.file, e.name));
    if (s) out.add(`${s}.md`);
  }

  // Shared-dep hot spots — functions in ≥ 3 features (already deduped upstream).
  for (const h of sharedHotspots) out.add(`${h.slug}.md`);

  // Top-N most-linked docs by incoming edges.
  const incoming = new Map<string, number>();
  for (const node of graph.values()) {
    for (const c of node.calls) {
      if (c.startsWith('[')) continue;
      incoming.set(c, (incoming.get(c) ?? 0) + 1);
    }
  }
  const ranked = [...incoming.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topLinkedCount);
  for (const [k] of ranked) {
    const s = slugByKey.get(k);
    if (s) out.add(`${s}.md`);
  }

  return [...out].sort();
}

export function injectTargets(template: string, targets: string[]): string {
  const literal = targets.length === 0
    ? '[]'
    : '[\n' + targets.map((t) => `  '${t}',`).join('\n') + '\n]';
  return template.replace(/const TARGETS = \[[\s\S]*?\];/, `const TARGETS = ${literal};`);
}

export async function runAudits(opts: RunAuditsOptions): Promise<AuditReport> {
  const linksOut = execSync(`node ${JSON.stringify(join(opts.outputRoot, 'audit-links.mjs'))}`, {
    cwd: opts.outputRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const qualityOut = execSync(`node ${JSON.stringify(join(opts.outputRoot, 'audit-quality.mjs'))}`, {
    cwd: opts.outputRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let guidesOut = '';
  try {
    guidesOut = execSync(`node ${JSON.stringify(join(opts.outputRoot, 'audit-guides.mjs'))}`, {
      cwd: opts.outputRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e: unknown) {
    // audit-guides exits 1 when issues found; capture stdout from the error.
    const err = e as { stdout?: string | Buffer };
    guidesOut = err.stdout ? String(err.stdout) : '';
  }

  return {
    links: parseLinksOutput(linksOut),
    quality: parseQualityOutput(qualityOut),
    guides: parseGuidesOutput(guidesOut),
  };
}

function parseLinksOutput(text: string): AuditReport['links'] {
  const broken = parseInt(text.match(/Total broken:\s+(\d+)/)?.[1] ?? '0', 10);
  const orphans = parseInt(text.match(/Total:\s+(\d+)/)?.[1] ?? '0', 10);
  const sharedDepsMatch = text.match(/Shared dependencies[^]*?Total:\s+(\d+)/);
  const sharedDeps = parseInt(sharedDepsMatch?.[1] ?? '0', 10);
  return { broken, orphans, sharedDeps, raw: text };
}

function parseQualityOutput(text: string): AuditReport['quality'] {
  const targets = (text.match(/═══ /g) ?? []).length;
  const r1Fails = (text.match(/R1 first-line fact: ⚠️/g) ?? []).length;
  const r3Fails = (text.match(/R3 outgoing links: ❌/g) ?? []).length;
  const r4Fails = (text.match(/R4 hot-path ⚠️ in body: ⚠️ {2}MISSING/g) ?? []).length;
  return { r1Fails, r3Fails, r4Fails, targets, raw: text };
}

function parseGuidesOutput(text: string): AuditReport['guides'] {
  const m = text.match(/(\d+) issue\(s\) total/);
  const totalIssues = m ? parseInt(m[1], 10) : 0;
  return { totalIssues, raw: text };
}
