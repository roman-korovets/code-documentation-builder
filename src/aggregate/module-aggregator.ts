// Module aggregator — Phase 6.2.
// Emits one modules/<slug>.md per module slug present in the classified
// inventory. Source-folder file tree is read from disk (real structure, not
// inventory). Key functions are bucketed by classified `type`.

import { mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { writeIfChanged } from './write-if-changed.js';
import { join, relative } from 'node:path';
import type { ClassifiedEntry, ClassifiedInventory, FunctionType } from '../classify/index.js';
import { entryKey } from '../graph/index.js';

export interface ModuleAggregateOptions {
  inventory: ClassifiedInventory;
  slugByKey: Map<string, string>;
  projectRoot: string;
  outputRoot: string;
  write?: boolean;
}

export interface ModuleDoc {
  slug: string;
  sourceRoot: string | null;
  functionCount: number;
  features: string[];
  path: string;
  text: string;
}

export interface ModuleAggregateResult {
  docs: ModuleDoc[];
}

export async function aggregateModules(opts: ModuleAggregateOptions): Promise<ModuleAggregateResult> {
  const { inventory, slugByKey, projectRoot, outputRoot, write } = opts;

  const byModule = new Map<string, ClassifiedEntry[]>();
  for (const e of inventory) {
    const arr = byModule.get(e.module) ?? [];
    arr.push(e);
    byModule.set(e.module, arr);
  }

  const modulesDir = join(outputRoot, 'modules');
  if (write !== false) mkdirSync(modulesDir, { recursive: true });

  const docs: ModuleDoc[] = [];
  for (const [moduleSlug, entries] of byModule) {
    const sourceRoot = inferModuleSourceRoot(moduleSlug, entries);
    const features = uniqueSorted(entries.flatMap((e) => e.features));
    const text = renderModuleDoc({
      moduleSlug,
      entries,
      slugByKey,
      sourceRoot,
      projectRoot,
      features,
    });
    const path = join(modulesDir, `${kebabSafe(moduleSlug)}.md`);
    if (write !== false) writeIfChanged(path, text);
    docs.push({
      slug: moduleSlug,
      sourceRoot,
      functionCount: entries.length,
      features,
      path,
      text,
    });
  }

  return { docs };
}

function renderModuleDoc(args: {
  moduleSlug: string;
  entries: ClassifiedEntry[];
  slugByKey: Map<string, string>;
  sourceRoot: string | null;
  projectRoot: string;
  features: string[];
}): string {
  const { moduleSlug, entries, slugByKey, sourceRoot, projectRoot, features } = args;
  const fileTree = sourceRoot ? buildFileTree(join(projectRoot, sourceRoot)) : null;
  const buckets = bucketByType(entries, slugByKey);

  const lines: string[] = [];
  lines.push('---');
  lines.push('type: module-overview');
  lines.push(`module: ${moduleSlug}`);
  if (sourceRoot) lines.push(`source: ${sourceRoot}`);
  lines.push(`function-count: ${entries.length}`);
  lines.push('---');
  lines.push(`# Module: ${moduleSlug}`);
  lines.push('');
  lines.push(`> ${entries.length} function${entries.length === 1 ? '' : 's'} in the \`${moduleSlug}\` module. <!-- TODO: replace with module narrative -->`);
  lines.push('');

  if (fileTree) {
    lines.push('## Source structure');
    lines.push('');
    lines.push('```');
    lines.push(fileTree);
    lines.push('```');
    lines.push('');
  }

  lines.push('## Key functions');
  lines.push('');
  for (const [bucket, slugs] of buckets) {
    if (slugs.length === 0) continue;
    lines.push(`### ${bucketLabel(bucket)} (${slugs.length})`);
    for (const s of slugs) lines.push(`- [[${s}]]`);
    lines.push('');
  }

  if (features.length > 0) {
    lines.push('## Features served');
    for (const f of features) lines.push(`- [[features/${f}]]`);
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

function inferModuleSourceRoot(moduleSlug: string, entries: ClassifiedEntry[]): string | null {
  // Compute the longest common directory prefix from the entries' file paths.
  const files = entries.map((e) => e.file.replace(/\\/g, '/'));
  if (files.length === 0) return null;
  const first = files[0].split('/');
  let prefixLen = first.length - 1; // drop filename
  for (const f of files) {
    const parts = f.split('/');
    let i = 0;
    while (i < prefixLen && i < parts.length - 1 && parts[i] === first[i]) i++;
    prefixLen = i;
  }
  if (prefixLen === 0) return null;
  const prefix = first.slice(0, prefixLen).join('/') + '/';
  // Don't claim 'src/' as the whole module's source root unless it's a virtual
  // 'visual' bucket of root files.
  if (prefix === 'src/' && moduleSlug !== 'visual') return null;
  return prefix;
}

function buildFileTree(absDir: string, maxDepth = 2): string | null {
  if (!existsSync(absDir)) return null;
  const lines: string[] = [];
  const walk = (dir: string, depth: number, indent: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir).sort();
    } catch {
      return;
    }
    const filtered = entries.filter((n) => !n.startsWith('.') && n !== 'node_modules' && n !== '__tests__');
    for (let i = 0; i < filtered.length; i++) {
      const name = filtered[i];
      const isLast = i === filtered.length - 1;
      const branch = isLast ? '└── ' : '├── ';
      const next = isLast ? '    ' : '│   ';
      const p = join(dir, name);
      let isDir = false;
      try { isDir = statSync(p).isDirectory(); } catch { /* ignore */ }
      lines.push(`${indent}${branch}${name}${isDir ? '/' : ''}`);
      if (isDir && depth < maxDepth) walk(p, depth + 1, indent + next);
    }
  };
  const rootName = relative(join(absDir, '..'), absDir).replace(/\\/g, '/');
  lines.push(`${rootName}/`);
  walk(absDir, 1, '');
  return lines.join('\n');
}

function bucketByType(
  entries: ClassifiedEntry[],
  slugByKey: Map<string, string>,
): Map<FunctionType, string[]> {
  const order: FunctionType[] = ['component', 'callback', 'hook', 'service', 'render', 'export', 'transform', 'util', 'host', 'builtin'];
  const out = new Map<FunctionType, string[]>(order.map((t) => [t, []]));
  for (const e of entries) {
    const slug = slugByKey.get(entryKey(e.file, e.name));
    if (!slug) continue;
    out.get(e.type)!.push(slug);
  }
  for (const [, arr] of out) arr.sort();
  return out;
}

function bucketLabel(t: FunctionType): string {
  return ({
    component: 'Components',
    callback: 'Callbacks',
    hook: 'Hooks',
    service: 'Services',
    render: 'Render pipeline',
    export: 'Export pipeline',
    transform: 'Transforms',
    util: 'Utilities',
    host: 'Host integration',
    builtin: 'Built-ins',
  } as Record<FunctionType, string>)[t];
}

function uniqueSorted(arr: string[]): string[] {
  return [...new Set(arr)].sort();
}

function kebabSafe(s: string): string {
  return s.replace(/\//g, '-');
}
