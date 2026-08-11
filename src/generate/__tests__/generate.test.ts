import { describe, it, expect } from 'vitest';
import { generateFunctionDocs } from '../index.js';
import type { ClassifiedEntry } from '../../classify/index.js';
import type { CallGraph, CallGraphNode } from '../../graph/index.js';
import { entryKey } from '../../graph/index.js';

const e1: ClassifiedEntry = {
  name: 'Visual.update', file: 'src/visual.ts', lineRange: '50-200', kind: 'class-method',
  signature: '(options: VisualUpdateOptions) => void', parent: 'Visual',
  module: 'visual', type: 'render', features: [], hotPath: false,
};
const e2: ClassifiedEntry = {
  name: 'applyColors', file: 'src/utils/applyColors.ts', lineRange: '10-50', kind: 'named-export',
  signature: '(task: Task) => void', module: 'visual', type: 'util', features: ['conditional-formatting'], hotPath: true,
};

const buildGraph = (): CallGraph => {
  const g = new Map<string, CallGraphNode>();
  const k1 = entryKey(e1.file, e1.name);
  const k2 = entryKey(e2.file, e2.name);
  g.set(k1, { key: k1, calls: [k2], calledBy: ['[powerbi-host-ivisual-update]'] });
  g.set(k2, { key: k2, calls: [], calledBy: [k1] });
  return g;
};

describe('generateFunctionDocs', () => {
  it('returns one doc per entry with valid frontmatter + body', async () => {
    const { docs, slugByKey } = await generateFunctionDocs({
      inventory: [e1, e2],
      graph: buildGraph(),
      outputRoot: 'unused',
      write: false,
    });
    expect(docs.length).toBe(2);
    expect(slugByKey.get(entryKey(e1.file, e1.name))).toBe('visual-update');
    expect(slugByKey.get(entryKey(e2.file, e2.name))).toBe('apply-colors');
  });

  it('cross-links Visual.update → applyColors via slug map', async () => {
    const { docs } = await generateFunctionDocs({
      inventory: [e1, e2],
      graph: buildGraph(),
      outputRoot: 'unused',
      write: false,
    });
    const updateDoc = docs.find((d) => d.slug === 'visual-update')!;
    expect(updateDoc.body).toContain('[[apply-colors]]');
    expect(updateDoc.frontmatter).toContain('called-by: [[powerbi-host-ivisual-update]]');
  });

  it('hot-path entry includes ⚠️ warning (R4)', async () => {
    const { docs } = await generateFunctionDocs({
      inventory: [e1, e2],
      graph: buildGraph(),
      outputRoot: 'unused',
      write: false,
    });
    const hotDoc = docs.find((d) => d.slug === 'apply-colors')!;
    expect(hotDoc.body).toContain('⚠️ **HOT PATH**');
    expect(hotDoc.frontmatter).toContain('hot-path: true');
  });

  it('drops unresolvable callee keys (not in slug map)', async () => {
    const ghost = entryKey('src/missing.ts', 'ghost');
    const g = buildGraph();
    g.get(entryKey(e1.file, e1.name))!.calls.push(ghost);
    const { docs } = await generateFunctionDocs({
      inventory: [e1, e2],
      graph: g,
      outputRoot: 'unused',
      write: false,
    });
    const updateDoc = docs.find((d) => d.slug === 'visual-update')!;
    expect(updateDoc.body).not.toContain('ghost');
  });
});
