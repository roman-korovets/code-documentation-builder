import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { aggregateModules } from '../module-aggregator.js';
import type { ClassifiedEntry } from '../../classify/index.js';
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

describe('aggregateModules', () => {
  it('emits one doc per module slug in inventory', async () => {
    const e1 = entry({ module: 'utils', file: 'src/utils/a.ts' });
    const e2 = entry({ module: 'visual', file: 'src/visual.ts', name: 'Visual.update', kind: 'class-method', parent: 'Visual' });
    const { docs } = await aggregateModules({
      inventory: [e1, e2],
      slugByKey: slugMap(e1, e2),
      projectRoot: 'unused',
      outputRoot: 'unused',
      write: false,
    });
    const slugs = docs.map((d) => d.slug).sort();
    expect(slugs).toEqual(['utils', 'visual']);
  });

  it('infers source-root from common file prefix', async () => {
    const e1 = entry({ module: 'cf', file: 'src/modules/conditional-formatting/index.tsx' });
    const e2 = entry({ module: 'cf', file: 'src/modules/conditional-formatting/service.ts' });
    const { docs } = await aggregateModules({
      inventory: [e1, e2],
      slugByKey: slugMap(e1, e2),
      projectRoot: 'unused',
      outputRoot: 'unused',
      write: false,
    });
    expect(docs[0].sourceRoot).toBe('src/modules/conditional-formatting/');
  });

  it('buckets functions by classified type', async () => {
    const e1 = entry({ module: 'm', file: 'src/m/a.tsx', name: 'Comp', type: 'component' });
    const e2 = entry({ module: 'm', file: 'src/m/b.ts', name: 'cb', type: 'callback' });
    const e3 = entry({ module: 'm', file: 'src/m/c.ts', name: 'util', type: 'util' });
    const { docs } = await aggregateModules({
      inventory: [e1, e2, e3],
      slugByKey: slugMap(e1, e2, e3),
      projectRoot: 'unused',
      outputRoot: 'unused',
      write: false,
    });
    expect(docs[0].text).toContain('### Components');
    expect(docs[0].text).toContain('### Callbacks');
    expect(docs[0].text).toContain('### Utilities');
  });

  it('emits Source structure block from real disk tree', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'module-agg-'));
    mkdirSync(join(projectRoot, 'src/modules/foo/components'), { recursive: true });
    writeFileSync(join(projectRoot, 'src/modules/foo/index.tsx'), 'x');
    writeFileSync(join(projectRoot, 'src/modules/foo/service.ts'), 'x');
    writeFileSync(join(projectRoot, 'src/modules/foo/components/inner.tsx'), 'x');
    const e1 = entry({ module: 'foo', file: 'src/modules/foo/index.tsx' });
    const e2 = entry({ module: 'foo', file: 'src/modules/foo/service.ts' });
    const { docs } = await aggregateModules({
      inventory: [e1, e2],
      slugByKey: slugMap(e1, e2),
      projectRoot,
      outputRoot: 'unused',
      write: false,
    });
    expect(docs[0].text).toContain('## Source structure');
    expect(docs[0].text).toContain('├── components/');
    expect(docs[0].text).toContain('inner.tsx');
    expect(docs[0].text).toContain('index.tsx');
    expect(docs[0].text).toContain('service.ts');
    rmSync(projectRoot, { recursive: true });
  });

  it('aggregates the union of all features served', async () => {
    const e1 = entry({ module: 'm', file: 'src/m/a.ts', features: ['foo'] });
    const e2 = entry({ module: 'm', file: 'src/m/b.ts', name: 'b', features: ['bar', 'foo'] });
    const { docs } = await aggregateModules({
      inventory: [e1, e2],
      slugByKey: slugMap(e1, e2),
      projectRoot: 'unused',
      outputRoot: 'unused',
      write: false,
    });
    expect(docs[0].features).toEqual(['bar', 'foo']);
    expect(docs[0].text).toContain('[[features/bar]]');
    expect(docs[0].text).toContain('[[features/foo]]');
  });

  it('flattens module slug with slashes (services/foo) for filename', async () => {
    const e1 = entry({ module: 'services/foo', file: 'src/services/foo/a.ts' });
    const { docs } = await aggregateModules({
      inventory: [e1],
      slugByKey: slugMap(e1),
      projectRoot: 'unused',
      outputRoot: 'unused',
      write: false,
    });
    expect(docs[0].path).toMatch(/services-foo\.md$/);
  });
});
