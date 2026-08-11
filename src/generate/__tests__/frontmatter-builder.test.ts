import { describe, it, expect } from 'vitest';
import { buildFrontmatter } from '../frontmatter-builder.js';
import type { ClassifiedEntry } from '../../classify/index.js';

const entry: ClassifiedEntry = {
  name: 'doThing',
  file: 'src/utils/thing.ts',
  lineRange: '10-30',
  kind: 'named-export',
  signature: '(x: number) => string',
  module: 'visual',
  type: 'util',
  features: ['conditional-formatting', 'sorting'],
  hotPath: false,
};

describe('buildFrontmatter', () => {
  it('emits all required fields in canonical order', () => {
    const out = buildFrontmatter({ entry, calledBy: [] });
    const lines = out.split('\n');
    expect(lines[0]).toBe('---');
    expect(lines[1]).toBe('source-file: src/utils/thing.ts');
    expect(lines[2]).toBe('module: visual');
    expect(lines[3]).toBe('type: util');
    expect(lines[4]).toBe('features: [conditional-formatting, sorting]');
    expect(lines[5]).toBe('called-by: []');
    expect(lines[6]).toBe('hot-path: false');
    expect(lines[7]).toBe('---');
  });

  it('renders calledBy slugs and sentinels as YAML list', () => {
    const out = buildFrontmatter({
      entry,
      calledBy: ['caller-a', 'caller-b', '[powerbi-host-ivisual-update]'],
    });
    expect(out).toContain('called-by: [caller-a, caller-b, [powerbi-host-ivisual-update]]');
  });

  it('renders empty features as []', () => {
    const out = buildFrontmatter({ entry: { ...entry, features: [] }, calledBy: [] });
    expect(out).toContain('features: []');
  });

  it('renders hot-path: true literally', () => {
    const out = buildFrontmatter({ entry: { ...entry, hotPath: true }, calledBy: [] });
    expect(out).toContain('hot-path: true');
  });
});
