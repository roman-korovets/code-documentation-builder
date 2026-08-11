import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installAudits, computeTargets, injectTargets, runAudits } from '../index.js';
import type { ClassifiedEntry } from '../../classify/index.js';
import type { CallGraph, CallGraphNode } from '../../graph/index.js';
import { entryKey } from '../../graph/index.js';

const entry = (over: Partial<ClassifiedEntry>): ClassifiedEntry => ({
  name: 'fn', file: 'src/x.ts', lineRange: '1-5', kind: 'named-export',
  signature: '()', module: 'm', type: 'util', features: [], hotPath: false,
  ...over,
});

const slugMap = (...entries: ClassifiedEntry[]): Map<string, string> => {
  const m = new Map<string, string>();
  for (let i = 0; i < entries.length; i++) m.set(entryKey(entries[i].file, entries[i].name), `slug-${i}`);
  return m;
};

const buildGraph = (entries: ClassifiedEntry[]): CallGraph => {
  const g = new Map<string, CallGraphNode>();
  for (const e of entries) {
    const k = entryKey(e.file, e.name);
    g.set(k, { key: k, calls: [], calledBy: [] });
  }
  return g;
};

describe('computeTargets', () => {
  it('includes every hot-path doc', () => {
    const e1 = entry({ name: 'a', hotPath: true });
    const e2 = entry({ name: 'b', hotPath: false });
    const targets = computeTargets({
      inventory: [e1, e2],
      graph: buildGraph([e1, e2]),
      slugByKey: slugMap(e1, e2),
      sharedHotspots: [],
      topLinkedCount: 0,
    });
    expect(targets).toContain('slug-0.md');
    expect(targets).not.toContain('slug-1.md');
  });

  it('includes shared-dep hotspots', () => {
    const e1 = entry({ name: 'a' });
    const e2 = entry({ name: 'b' });
    const targets = computeTargets({
      inventory: [e1, e2],
      graph: buildGraph([e1, e2]),
      slugByKey: slugMap(e1, e2),
      sharedHotspots: [{ slug: 'slug-1', features: ['x', 'y', 'z'] }],
      topLinkedCount: 0,
    });
    expect(targets).toContain('slug-1.md');
  });

  it('includes top-N most-linked docs by incoming edges', () => {
    const e1 = entry({ name: 'a' });
    const e2 = entry({ name: 'central' });
    const k1 = entryKey(e1.file, e1.name);
    const k2 = entryKey(e2.file, e2.name);
    const graph: CallGraph = new Map<string, CallGraphNode>([
      [k1, { key: k1, calls: [k2], calledBy: [] }],
      [k2, { key: k2, calls: [], calledBy: [k1] }],
    ]);
    const targets = computeTargets({
      inventory: [e1, e2],
      graph,
      slugByKey: slugMap(e1, e2),
      sharedHotspots: [],
      topLinkedCount: 1,
    });
    expect(targets).toContain('slug-1.md');
  });

  it('dedupes overlap across the three categories', () => {
    const hot = entry({ name: 'h', hotPath: true });
    const k = entryKey(hot.file, hot.name);
    const graph: CallGraph = new Map<string, CallGraphNode>([
      [k, { key: k, calls: [], calledBy: ['caller1', 'caller2'] }],
    ]);
    const targets = computeTargets({
      inventory: [hot],
      graph,
      slugByKey: slugMap(hot),
      sharedHotspots: [{ slug: 'slug-0', features: ['a', 'b', 'c'] }],
      topLinkedCount: 5,
    });
    const occurrences = targets.filter((t) => t === 'slug-0.md').length;
    expect(occurrences).toBe(1);
  });

  it('skips sentinel call edges when ranking', () => {
    const e1 = entry({ name: 'a' });
    const k1 = entryKey(e1.file, e1.name);
    const graph: CallGraph = new Map<string, CallGraphNode>([
      [k1, { key: k1, calls: ['[external-sentinel]'], calledBy: [] }],
    ]);
    const targets = computeTargets({
      inventory: [e1],
      graph,
      slugByKey: slugMap(e1),
      sharedHotspots: [],
      topLinkedCount: 3,
    });
    expect(targets).toHaveLength(0);
  });
});

describe('injectTargets', () => {
  it('replaces empty TARGETS literal', () => {
    const template = `// header\nconst TARGETS = [\n  // 'a.md',\n];\nrest();\n`;
    const out = injectTargets(template, ['foo.md', 'bar.md']);
    expect(out).toContain(`const TARGETS = [\n  'foo.md',\n  'bar.md',\n];`);
    expect(out).toContain('rest();');
  });

  it('emits empty array when targets is empty', () => {
    const template = `const TARGETS = [];\n`;
    const out = injectTargets(template, []);
    expect(out).toBe('const TARGETS = [];\n');
  });
});

describe('installAudits + runAudits', () => {
  it('writes both files and TARGETS reflects the computed slugs', async () => {
    const root = mkdtempSync(join(tmpdir(), 'audit-install-'));
    const e1 = entry({ name: 'a', hotPath: true });
    const result = await installAudits({
      inventory: [e1],
      graph: buildGraph([e1]),
      slugByKey: slugMap(e1),
      sharedHotspots: [],
      outputRoot: root,
    });
    expect(result.targets).toContain('slug-0.md');
    const qualityText = readFileSync(result.qualityPath, 'utf8');
    expect(qualityText).toContain(`'slug-0.md'`);
    rmSync(root, { recursive: true });
  });

  it('full round-trip: install + execute + parse on a tiny vault', async () => {
    const root = mkdtempSync(join(tmpdir(), 'audit-run-'));
    // Build a minimal valid vault: 2 docs, both linked.
    writeFileSync(join(root, 'foo.md'), [
      '---', 'source-file: src/foo.ts', 'module: m', 'type: util',
      'features: []', 'called-by: []', 'hot-path: true', '---',
      '# foo',
      '⚠️ **HOT PATH**',
      '',
      '## Origin',
      '- **File:** `src/foo.ts:1-5`',
      '',
      '[[bar]]',
    ].join('\n'));
    writeFileSync(join(root, 'bar.md'), [
      '---', 'source-file: src/bar.ts', 'module: m', 'type: util',
      'features: []', 'called-by: []', 'hot-path: false', '---',
      '# bar',
      '',
      '## Origin',
      '- **File:** `src/bar.ts:1-5`',
      '',
      '[[foo]]',
    ].join('\n'));

    const e1 = { ...entry({ name: 'foo', file: 'src/foo.ts', hotPath: true }) };
    const e2 = { ...entry({ name: 'bar', file: 'src/bar.ts' }) };
    const k1 = entryKey(e1.file, e1.name);
    const k2 = entryKey(e2.file, e2.name);
    const slugByKey = new Map<string, string>([[k1, 'foo'], [k2, 'bar']]);

    await installAudits({
      inventory: [e1, e2],
      graph: buildGraph([e1, e2]),
      slugByKey,
      sharedHotspots: [],
      outputRoot: root,
    });

    const report = await runAudits({ outputRoot: root });
    expect(report.links.broken).toBe(0);
    expect(report.quality.r1Fails).toBe(0);
    expect(report.quality.r3Fails).toBe(0);
    expect(report.quality.r4Fails).toBe(0);
    expect(report.quality.targets).toBeGreaterThan(0);

    rmSync(root, { recursive: true });
  });
});
