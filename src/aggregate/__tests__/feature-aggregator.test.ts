import { describe, it, expect } from 'vitest';
import { aggregateFeatures } from '../feature-aggregator.js';
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

describe('aggregateFeatures', () => {
  it('emits one doc per feature slug present in inventory', async () => {
    const e1 = entry({ name: 'a', features: ['foo'] });
    const e2 = entry({ name: 'b', features: ['foo', 'bar'] });
    const { docs } = await aggregateFeatures({
      inventory: [e1, e2],
      slugByKey: slugMap(e1, e2),
      taxonomy: [
        { slug: 'foo', displayName: 'Foo' },
        { slug: 'bar', displayName: 'Bar' },
      ],
      outputRoot: 'unused',
      write: false,
    });
    const slugs = docs.map((d) => d.slug).sort();
    expect(slugs).toEqual(['bar', 'foo']);
  });

  it('marks risk=high when any function is hot-path', async () => {
    const e1 = entry({ name: 'a', features: ['foo'], hotPath: true });
    const { docs } = await aggregateFeatures({
      inventory: [e1],
      slugByKey: slugMap(e1),
      taxonomy: [{ slug: 'foo', displayName: 'Foo' }],
      outputRoot: 'unused',
      write: false,
    });
    expect(docs[0].risk).toBe('high');
    expect(docs[0].text).toContain('⚠️ **HOT PATH**'.slice(0, 2)); // ⚠️ emoji present
    expect(docs[0].text).toContain('## ⚠️ Performance warning');
  });

  it('marks risk=medium when functionCount >= 15', async () => {
    const inv: ClassifiedEntry[] = [];
    for (let i = 0; i < 16; i++) inv.push(entry({ name: `fn${i}`, features: ['big'] }));
    const { docs } = await aggregateFeatures({
      inventory: inv,
      slugByKey: slugMap(...inv),
      taxonomy: [{ slug: 'big', displayName: 'Big Feature' }],
      outputRoot: 'unused',
      write: false,
    });
    expect(docs[0].risk).toBe('medium');
  });

  it('marks risk=low for small isolated features', async () => {
    const e1 = entry({ name: 'a', features: ['tiny'] });
    const e2 = entry({ name: 'b', features: ['tiny'] });
    const { docs } = await aggregateFeatures({
      inventory: [e1, e2],
      slugByKey: slugMap(e1, e2),
      taxonomy: [{ slug: 'tiny', displayName: 'Tiny' }],
      outputRoot: 'unused',
      write: false,
    });
    expect(docs[0].risk).toBe('low');
  });

  it('emits Shared dependencies section for overlapping features', async () => {
    const e1 = entry({ name: 'a', features: ['foo', 'bar'] });
    const { docs } = await aggregateFeatures({
      inventory: [e1],
      slugByKey: slugMap(e1),
      taxonomy: [
        { slug: 'foo', displayName: 'Foo' },
        { slug: 'bar', displayName: 'Bar' },
      ],
      outputRoot: 'unused',
      write: false,
    });
    const foo = docs.find((d) => d.slug === 'foo')!;
    expect(foo.text).toContain('## Shared dependencies');
    expect(foo.text).toContain('bar');
    expect(foo.sharedWith).toEqual(['bar']);
  });

  it('lists shared hotspots (functions in ≥3 features) in the index', async () => {
    const e1 = entry({ name: 'hot', features: ['a', 'b', 'c'] });
    const { sharedHotspots, indexText } = await aggregateFeatures({
      inventory: [e1],
      slugByKey: slugMap(e1),
      taxonomy: [
        { slug: 'a' }, { slug: 'b' }, { slug: 'c' },
      ],
      outputRoot: 'unused',
      write: false,
    });
    expect(sharedHotspots).toHaveLength(1);
    expect(sharedHotspots[0].slug).toBe('slug-0');
    expect(indexText).toContain('Shared-dependency hot spots');
    expect(indexText).toContain('[[slug-0]]');
  });

  it('preserves taxonomy order in the index table', async () => {
    const e1 = entry({ name: 'a', features: ['z-feature'] });
    const e2 = entry({ name: 'b', features: ['a-feature'] });
    const { indexText } = await aggregateFeatures({
      inventory: [e1, e2],
      slugByKey: slugMap(e1, e2),
      taxonomy: [
        { slug: 'z-feature', displayName: 'Z' },
        { slug: 'a-feature', displayName: 'A' },
      ],
      outputRoot: 'unused',
      write: false,
    });
    const idxZ = indexText.indexOf('z-feature');
    const idxA = indexText.indexOf('a-feature');
    expect(idxZ).toBeGreaterThan(-1);
    expect(idxA).toBeGreaterThan(idxZ); // z comes first because it's earlier in taxonomy
  });
});
