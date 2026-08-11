import { describe, it, expect } from 'vitest';
import { deriveSlug, kebabCase, resolveSlugs, DEFAULT_PREFIX_RULES } from '../slug-resolver.js';
import type { ClassifiedEntry } from '../../classify/index.js';

const entry = (over: Partial<ClassifiedEntry>): ClassifiedEntry => ({
  name: 'fn',
  file: 'src/foo.ts',
  lineRange: '10-20',
  kind: 'named-export',
  signature: '()',
  module: 'visual',
  type: 'util',
  features: [],
  hotPath: false,
  ...over,
});

describe('kebabCase', () => {
  it('converts camelCase to kebab', () => {
    expect(kebabCase('applyColors')).toBe('apply-colors');
    expect(kebabCase('applyConditionalFormattingToRow')).toBe('apply-conditional-formatting-to-row');
  });
  it('handles consecutive uppercase', () => {
    expect(kebabCase('CSSBuilder')).toBe('css-builder');
    expect(kebabCase('parseHTMLString')).toBe('parse-html-string');
  });
  it('handles underscores and spaces', () => {
    expect(kebabCase('foo_bar baz')).toBe('foo-bar-baz');
  });
});

describe('deriveSlug', () => {
  it('Visual class methods → visual-<name>', () => {
    const e = entry({ file: 'src/visual.ts', kind: 'class-method', name: 'Visual.saveProperties', parent: 'Visual' });
    expect(deriveSlug(e)).toBe('visual-save-properties');
  });

  it('locals inside Visual.update → visual-update-<name>', () => {
    const e = entry({ file: 'src/visual.ts', kind: 'local', name: 'parseSettings', parent: 'Visual.update' });
    expect(deriveSlug(e)).toBe('visual-update-parse-settings');
  });

  it('default: file basename + name (camelCase → kebab)', () => {
    const e = entry({ file: 'src/utils/applyColors.ts', name: 'applyConditionalFormattingToRow' });
    expect(deriveSlug(e)).toBe('apply-colors-apply-conditional-formatting-to-row');
  });

  it('component named after file → just file slug', () => {
    const e = entry({ file: 'src/App.tsx', name: 'App' });
    expect(deriveSlug(e)).toBe('app');
  });

  it('callbacks folder gets gantt-callback prefix', () => {
    const e = entry({ file: 'src/modules/ganttChart/callbacks/actionBegin.ts', name: 'actionBegin' });
    expect(deriveSlug(e, { prefixRules: DEFAULT_PREFIX_RULES })).toBe('gantt-callback-action-begin');
  });

  it('local helper in non-Visual function → file-parent-name', () => {
    const e = entry({ file: 'src/foo/bar.ts', name: 'helper', kind: 'local', parent: 'outer' });
    expect(deriveSlug(e)).toBe('bar-outer-helper');
  });
});

describe('resolveSlugs', () => {
  it('returns a slug for every entry', () => {
    const inv: ClassifiedEntry[] = [
      entry({ file: 'src/a.ts', name: 'foo' }),
      entry({ file: 'src/b.ts', name: 'bar' }),
    ];
    const { slugs, byKey } = resolveSlugs(inv);
    expect(slugs).toEqual(['a-foo', 'b-bar']);
    expect(byKey.size).toBe(2);
  });

  it('disambiguates collisions by line-start', () => {
    const inv: ClassifiedEntry[] = [
      entry({ file: 'src/a.ts', name: 'foo', lineRange: '5-10' }),
      entry({ file: 'src/b.ts', name: 'foo', lineRange: '20-30' }),
    ];
    const { slugs } = resolveSlugs(inv, {
      prefixRules: [
        { filePattern: /a\.ts$/, prefix: 'shared' },
        { filePattern: /b\.ts$/, prefix: 'shared' },
      ],
    });
    expect(slugs[0]).toBe('shared-foo');
    expect(slugs[1]).toBe('shared-foo-20');
  });

  it('keeps both slugs unique when two inventory entries share file+name', () => {
    // E.g. two `close` locals in the same hooks file but inside different parent fns.
    const inv: ClassifiedEntry[] = [
      entry({ file: 'src/hooks.ts', name: 'close', kind: 'local', parent: 'useExcelExport', lineRange: '10-15' }),
      entry({ file: 'src/hooks.ts', name: 'close', kind: 'local', parent: 'usePdfExport', lineRange: '50-55' }),
    ];
    const { slugs } = resolveSlugs(inv);
    expect(slugs[0]).toBe('hooks-use-excel-export-close');
    expect(slugs[1]).toBe('hooks-use-pdf-export-close');
  });
});
