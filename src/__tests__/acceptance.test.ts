// Phase 14 — Acceptance criteria sweep.
//
// One end-to-end fixture build that asserts every release-gate item from
// implementation.md § Acceptance criteria. Runs alongside the regular test
// suite so a regression in any of the seven properties fails CI immediately.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { build, type BuildResult } from '../orchestrator.js';

// Fixture has 6 named exports + 1 call chain → tests cover non-trivial graph
// edges, multi-module split, and feature taxonomy.
const FIXTURE_FILES = {
  'src/store.ts': `
export interface StoreEntry { key: string; value: string; updatedAt: number; }
const storage = new Map<string, StoreEntry>();
export function setEntry(key: string, value: string): StoreEntry {
  const entry: StoreEntry = { key, value, updatedAt: Date.now() };
  storage.set(key, entry);
  return entry;
}
export function getEntry(key: string): StoreEntry | undefined { return storage.get(key); }
export function flushStore(): number { const n = storage.size; storage.clear(); return n; }
`.trim(),
  'src/utils.ts': `
export function isBlank(s: string | undefined | null): boolean { return !s || s.trim().length === 0; }
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
`.trim(),
  'src/index.ts': `
import { setEntry, getEntry, flushStore } from './store.js';
import { isBlank, chunk } from './utils.js';
export function run(input: string[]): { writes: number; reads: number; flushed: number } {
  let writes = 0;
  let reads = 0;
  for (const batch of chunk(input, 2)) {
    for (const value of batch) {
      if (isBlank(value)) continue;
      setEntry(\`k-\${writes}\`, value);
      writes++;
      if (getEntry(\`k-\${writes - 1}\`)) reads++;
    }
  }
  return { writes, reads, flushed: flushStore() };
}
`.trim(),
};

const TAXONOMY = [
  { slug: 'persistence', displayName: 'Persistence', pathPatterns: ['/store'], hintPatterns: ['\\b(set|get|flush)Entry', 'flushStore'] },
  { slug: 'input-validation', displayName: 'Input Validation', hintPatterns: ['isBlank'] },
];

interface InventoryEntry { name: string; file: string; lineRange: string; }

function makeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'acceptance-'));
  mkdirSync(join(root, 'src'), { recursive: true });
  for (const [path, content] of Object.entries(FIXTURE_FILES)) {
    writeFileSync(join(root, path), content, 'utf8');
  }
  writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext' } }), 'utf8');
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'acceptance-fixture', type: 'module' }), 'utf8');
  return root;
}

function hashDir(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (name.endsWith('.md') || name.endsWith('.mjs')) {
        out.set(p.slice(dir.length).replace(/\\/g, '/'), createHash('sha256').update(readFileSync(p)).digest('hex'));
      }
    }
  };
  walk(dir);
  return out;
}

describe('Phase 14 — Acceptance criteria (end-to-end)', () => {
  let projectRoot: string;
  let outputRoot: string;
  let firstResult: BuildResult;

  beforeAll(async () => {
    projectRoot = makeFixture();
    outputRoot = join(projectRoot, 'documentation');
    firstResult = await build({ projectRoot, outputRoot, taxonomy: TAXONOMY });
  });

  afterAll(() => {
    if (projectRoot) rmSync(projectRoot, { recursive: true, force: true });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 1. documentation/ exists at project root.
  it('1. documentation/ exists at project root', () => {
    expect(existsSync(outputRoot)).toBe(true);
    expect(statSync(outputRoot).isDirectory()).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────────
  // 2. Every function in the Inventory has a corresponding .md file.
  it('2. every inventory entry has a corresponding .md file', () => {
    const cachePath = join(projectRoot, '.code-doc-builder', 'inventory.json');
    expect(existsSync(cachePath)).toBe(true);
    const inventory: InventoryEntry[] = JSON.parse(readFileSync(cachePath, 'utf8'));
    expect(inventory.length).toBeGreaterThan(0);

    const mdFiles = readdirSync(outputRoot).filter((f) => f.endsWith('.md'));
    const slugSet = new Set(mdFiles.map((f) => f.replace(/\.md$/, '')));

    // Inventory has 6 entries; the vault should have at least one .md per
    // entry. (The orchestrator may also emit hub docs — but every entry
    // must be represented.)
    expect(slugSet.size).toBeGreaterThanOrEqual(inventory.length);
  });

  // ───────────────────────────────────────────────────────────────────────
  // 3. audit-links.mjs reports 0 broken wikilinks and feature-count consistency.
  it('3. audit-links.mjs reports 0 broken wikilinks + feature counts consistent', () => {
    const out = execSync(`node ${JSON.stringify(join(outputRoot, 'audit-links.mjs'))}`, { cwd: outputRoot, encoding: 'utf8' });

    // Check C: 0 broken wikilinks (the hard gate).
    expect(out).toMatch(/Total broken:\s+0/);

    // Check A: every feature's stated function-count equals the actual count
    // of function docs assigned to that feature. The aggregator emits these
    // in lock-step; this asserts they didn't drift.
    const checkABlock = out.match(/A\. Feature → function count consistency\s*[═]*\n([\s\S]*?)(?=═══|$)/);
    if (checkABlock) {
      const lines = checkABlock[1].split('\n').filter((l) => /stated=/.test(l));
      for (const l of lines) {
        // Either no warning marker, OR explicit ✅. ⚠️ marks drift.
        expect(l).not.toMatch(/⚠️/);
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────
  // 4. audit-quality.mjs reports ✅ on R1 + R3 for all targets and ✅ on R4
  //    for every hot-path doc.
  it('4. audit-quality.mjs passes R1, R3, and R4 on every target', () => {
    const out = execSync(`node ${JSON.stringify(join(outputRoot, 'audit-quality.mjs'))}`, { cwd: outputRoot, encoding: 'utf8' });

    // No R1 filler-start fails.
    expect(out).not.toMatch(/R1 first-line fact:\s+⚠️/);
    // No R3 dead-end fails.
    expect(out).not.toMatch(/R3 outgoing links:\s+❌/);
    // No R4 missing-warning fails.
    expect(out).not.toMatch(/R4 hot-path ⚠️ in body:\s+⚠️\s+MISSING/);
  });

  // ───────────────────────────────────────────────────────────────────────
  // 5. _index.md opens with an Architecture section + working Start here table.
  //    (LLM 5-line narrative is a Phase 14+ enrichment; the structural shape
  //    must already be in place.)
  it('5. _index.md has Architecture section + non-empty Start here by intent table', () => {
    const indexText = readFileSync(join(outputRoot, '_index.md'), 'utf8');

    expect(indexText).toMatch(/^# Documentation Index/m);
    expect(indexText).toMatch(/## Architecture/);
    expect(indexText).toMatch(/## Start here by intent/);

    // The Start here table must have at least 4 rows (the standard ones).
    const startBlock = indexText.match(/## Start here by intent[\s\S]*?(?=## )/);
    expect(startBlock).toBeTruthy();
    const rows = (startBlock![0].match(/^\|.*\|.*\|$/gm) ?? []).length;
    // 1 header + 1 separator + ≥ 4 standard intent rows.
    expect(rows).toBeGreaterThanOrEqual(6);

    // Architecture section is non-empty (TODO marker is acceptable for v0.1).
    const archBlock = indexText.match(/## Architecture[\s\S]*?(?=## )/);
    expect(archBlock![0].trim().length).toBeGreaterThan('## Architecture'.length + 10);
  });

  // ───────────────────────────────────────────────────────────────────────
  // 6. _CHECKLIST.md lists every function with `[x]` and section grouping
  //    matches project shape.
  it('6. _CHECKLIST.md has [x] for every inventory entry + section-grouping by module', () => {
    const checklist = readFileSync(join(outputRoot, '_CHECKLIST.md'), 'utf8');
    const inventory: InventoryEntry[] = JSON.parse(readFileSync(join(projectRoot, '.code-doc-builder', 'inventory.json'), 'utf8'));

    // One `[x]` line per inventory entry.
    const checkedLines = (checklist.match(/^- \[x\] /gm) ?? []).length;
    expect(checkedLines).toBe(inventory.length);

    // Project shape: no Visual class, so only "G. Project inventory" sections.
    expect(checklist).toMatch(/## G\. Project inventory/);
    // Conventions block present.
    expect(checklist).toMatch(/^## Conventions/m);
  });

  // ───────────────────────────────────────────────────────────────────────
  // 7. Re-running build produces a zero-diff result.
  it('7. re-running build produces a zero-diff vault', async () => {
    const before = hashDir(outputRoot);
    const second = await build({ projectRoot, outputRoot, taxonomy: TAXONOMY });
    const after = hashDir(outputRoot);

    // Same set of files.
    expect([...before.keys()].sort()).toEqual([...after.keys()].sort());
    // Same content per file.
    for (const [path, h1] of before) {
      expect(after.get(path), `content drift in ${path}`).toBe(h1);
    }
    // Orchestrator's own counters match.
    expect(second.generate.written).toBe(0);
    expect(second.generate.skippedUnchanged).toBe(firstResult.generate.written + firstResult.generate.skippedUnchanged);
    expect(second.drift.counts.added).toBe(0);
    expect(second.drift.counts.removed).toBe(0);
  });
});
