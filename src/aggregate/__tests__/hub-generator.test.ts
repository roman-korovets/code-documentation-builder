import { describe, it, expect } from 'vitest';
import { generateHubs } from '../hub-generator.js';
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
  for (let i = 0; i < entries.length; i++) {
    m.set(entryKey(entries[i].file, entries[i].name), `slug-${i}`);
  }
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

const emptyAggResult = {
  features: { docs: [], indexPath: '', indexText: '', sharedHotspots: [] },
  modules: { docs: [] },
};

describe('generateHubs', () => {
  it('emits four hub files', async () => {
    const e1 = entry({ name: 'foo' });
    const { schema, index, checklist, manualWork } = await generateHubs({
      inventory: [e1],
      graph: buildGraph([e1]),
      slugByKey: slugMap(e1),
      features: emptyAggResult.features,
      modules: emptyAggResult.modules,
      outputRoot: 'unused',
      write: false,
    });
    expect(schema.text).toContain('# Frontmatter Schema Reference');
    expect(index.text).toContain('# Documentation Index');
    expect(checklist.text).toContain('# Documentation Checklist');
    expect(manualWork.text).toContain('# Manual Work');
  });

  it('_schema lists observed type and module enums', async () => {
    const e1 = entry({ type: 'callback', module: 'modA' });
    const e2 = entry({ name: 'g', type: 'util', module: 'modB' });
    const { schema } = await generateHubs({
      inventory: [e1, e2],
      graph: buildGraph([e1, e2]),
      slugByKey: slugMap(e1, e2),
      features: emptyAggResult.features,
      modules: emptyAggResult.modules,
      outputRoot: 'unused',
      write: false,
    });
    expect(schema.text).toContain('| `callback` |');
    expect(schema.text).toContain('| `util` |');
    expect(schema.text).toContain('- `modA`');
    expect(schema.text).toContain('- `modB`');
  });

  it('_index emits a row per feature and module', async () => {
    const e1 = entry({ name: 'a', features: ['featA'] });
    const features = {
      docs: [
        { slug: 'featA', displayName: 'Feat A', functionCount: 1, risk: 'low' as const, hotPathCount: 0, sharedWith: [], path: '', text: '' },
      ],
      indexPath: '', indexText: '', sharedHotspots: [],
    };
    const modules = {
      docs: [
        { slug: 'm', sourceRoot: 'src/m/', functionCount: 1, features: ['featA'], path: '', text: '' },
      ],
    };
    const { index } = await generateHubs({
      inventory: [e1],
      graph: buildGraph([e1]),
      slugByKey: slugMap(e1),
      features,
      modules,
      outputRoot: 'unused',
      write: false,
    });
    expect(index.text).toContain('[[features/featA]]');
    expect(index.text).toContain('[[modules/m]]');
    expect(index.text).toContain('## Features (1)');
    expect(index.text).toContain('## Modules (1)');
  });

  it('_index lists hot-path callbacks', async () => {
    const e1 = entry({ name: 'hot', hotPath: true });
    const { index } = await generateHubs({
      inventory: [e1],
      graph: buildGraph([e1]),
      slugByKey: slugMap(e1),
      features: emptyAggResult.features,
      modules: emptyAggResult.modules,
      outputRoot: 'unused',
      write: false,
    });
    expect(index.text).toContain('## Hot-path callbacks');
    expect(index.text).toContain('[[slug-0]]');
  });

  it('_index ranks top callees by incoming edges', async () => {
    const e1 = entry({ name: 'a' });
    const e2 = entry({ name: 'b' });
    const e3 = entry({ name: 'central' });
    const k1 = entryKey(e1.file, e1.name);
    const k2 = entryKey(e2.file, e2.name);
    const k3 = entryKey(e3.file, e3.name);
    const graph: CallGraph = new Map<string, CallGraphNode>([
      [k1, { key: k1, calls: [k3], calledBy: [] }],
      [k2, { key: k2, calls: [k3], calledBy: [] }],
      [k3, { key: k3, calls: [], calledBy: [k1, k2] }],
    ]);
    const { index } = await generateHubs({
      inventory: [e1, e2, e3],
      graph,
      slugByKey: slugMap(e1, e2, e3),
      features: emptyAggResult.features,
      modules: emptyAggResult.modules,
      outputRoot: 'unused',
      write: false,
    });
    expect(index.text).toContain('## Key lifecycle functions');
    expect(index.text).toContain('| [[slug-2]] | 2 |');
  });

  it('_CHECKLIST groups Visual class methods + locals separately', async () => {
    const m1 = entry({ file: 'src/visual.ts', name: 'Visual.update', kind: 'class-method', parent: 'Visual' });
    const m2 = entry({ file: 'src/visual.ts', name: 'Visual.render', kind: 'class-method', parent: 'Visual' });
    const local = entry({ file: 'src/visual.ts', name: 'parseSettings', kind: 'local', parent: 'Visual.update' });
    const other = entry({ file: 'src/utils/foo.ts', name: 'helper', kind: 'named-export', module: 'utils' });
    const inv = [m1, m2, local, other];
    const { checklist } = await generateHubs({
      inventory: inv,
      graph: buildGraph(inv),
      slugByKey: slugMap(...inv),
      features: emptyAggResult.features,
      modules: emptyAggResult.modules,
      outputRoot: 'unused',
      write: false,
    });
    expect(checklist.text).toContain('## C. Visual class methods (2)');
    expect(checklist.text).toContain('## D. Local helpers inside Visual methods (1)');
    expect(checklist.text).toContain('### `Visual.update`');
    expect(checklist.text).toContain('## G. Project inventory (1)');
    expect(checklist.text).toContain('parseSettings (local)');
  });

  it('manual-work-docs counts every TODO source', async () => {
    const e1 = entry({ name: 'a' });
    const features = {
      docs: [
        { slug: 'f', displayName: 'F', functionCount: 1, risk: 'low' as const, hotPathCount: 0, sharedWith: [], path: '', text: '' },
      ],
      indexPath: '', indexText: '', sharedHotspots: [],
    };
    const modules = { docs: [{ slug: 'm', sourceRoot: null, functionCount: 1, features: [], path: '', text: '' }] };
    const { manualWork } = await generateHubs({
      inventory: [e1],
      graph: buildGraph([e1]),
      slugByKey: slugMap(e1),
      features,
      modules,
      outputRoot: 'unused',
      write: false,
    });
    expect(manualWork.text).toContain('1 function doc');
    expect(manualWork.text).toContain('1 feature doc');
    expect(manualWork.text).toContain('1 module doc');
  });
});
