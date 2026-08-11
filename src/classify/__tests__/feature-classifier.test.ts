import { describe, expect, it } from 'vitest';
import { classifyFeatures, type FeatureTaxonomyEntry } from '../feature-classifier.js';
import type { InventoryEntry } from '../../discover/index.js';

const entry = (over: Partial<InventoryEntry>): InventoryEntry => ({
  name: 'fn',
  file: 'src/foo.ts',
  lineRange: '1-1',
  kind: 'named-export',
  signature: '()',
  ...over,
});

const taxonomy: FeatureTaxonomyEntry[] = [
  { slug: 'pdf-export', pathPatterns: ['/pdf-service/'], hintPatterns: ['\\bpdf[A-Z]'] },
  { slug: 'conditional-formatting', pathPatterns: ['/conditional-formatting/'], hintPatterns: ['\\bcf[A-Z]'] },
  { slug: 'milestones', pathPatterns: ['/markers/'], hintPatterns: ['milestone'] },
  { slug: 'sorting', hintPatterns: ['\\bsort'] },
];

describe('feature-classifier', () => {
  it('matches single feature by path', () => {
    const e = entry({ file: 'src/services/pdf-service/builder.ts', name: 'buildPdf' });
    expect(classifyFeatures(e, { taxonomy })).toEqual(['pdf-export']);
  });

  it('matches single feature by name pattern', () => {
    const e = entry({ file: 'src/foo.ts', name: 'cfCheckRule' });
    expect(classifyFeatures(e, { taxonomy })).toEqual(['conditional-formatting']);
  });

  it('matches multiple features when patterns overlap', () => {
    const e = entry({ file: 'src/modules/ganttChart/markers/milestone.ts', name: 'buildMilestone' });
    const result = classifyFeatures(e, { taxonomy });
    expect(result).toContain('milestones');
  });

  it('returns empty array when no patterns match', () => {
    const e = entry({ file: 'src/foo/bar.ts', name: 'unrelated' });
    expect(classifyFeatures(e, { taxonomy })).toEqual([]);
  });

  it('honours case-insensitive matching with word boundaries', () => {
    const e = entry({ file: 'src/x.ts', name: 'SortColumns' });
    expect(classifyFeatures(e, { taxonomy })).toEqual(['sorting']);
  });
});
