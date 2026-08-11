import { describe, expect, it } from 'vitest';
import { DEFAULT_EXTERNAL_CALLER_RULES, pickSentinel } from '../sentinels.js';
import type { ClassifiedEntry } from '../../classify/index.js';

const entry = (over: Partial<ClassifiedEntry>): ClassifiedEntry => ({
  name: 'fn',
  file: 'src/foo.ts',
  lineRange: '1-1',
  kind: 'named-export',
  signature: '()',
  module: 'unknown',
  type: 'transform',
  features: [],
  hotPath: false,
  ...over,
});

describe('pickSentinel', () => {
  it('flags Visual.update as Power BI host entry', () => {
    const e = entry({ file: 'src/visual.ts', name: 'Visual.update', kind: 'class-method', parent: 'Visual' });
    expect(pickSentinel(e, DEFAULT_EXTERNAL_CALLER_RULES)).toBe('[powerbi-host-ivisual-update]');
  });

  it('flags any function in /callbacks/ as Syncfusion-internal', () => {
    const e = entry({ file: 'src/modules/ganttChart/callbacks/rowDataBound.ts', name: 'rowDataBoundHandler' });
    expect(pickSentinel(e, DEFAULT_EXTERNAL_CALLER_RULES)).toBe('[syncfusion-gantt-internal]');
  });

  it('flags hot CF helpers stamped by Syncfusion render', () => {
    const e = entry({ file: 'src/modules/ganttChart/callbacks/taskbarInfo.ts', name: 'applyCfClassesToTaskbar' });
    expect(pickSentinel(e, DEFAULT_EXTERNAL_CALLER_RULES)).toBe('[syncfusion-gantt-internal]');
  });

  it('flags root React component as react-render', () => {
    const e = entry({ file: 'src/App.tsx', name: 'App', kind: 'arrow-const' });
    expect(pickSentinel(e, DEFAULT_EXTERNAL_CALLER_RULES)).toBe('[react-render]');
  });

  it('returns null when no rule matches', () => {
    const e = entry({ file: 'src/utils/x.ts', name: 'plainHelper' });
    expect(pickSentinel(e, DEFAULT_EXTERNAL_CALLER_RULES)).toBeNull();
  });

  it('honours hotPathOnly constraint', () => {
    const rule = { namePattern: /^foo$/, hotPathOnly: true, sentinel: '[hot]' };
    expect(pickSentinel(entry({ name: 'foo', hotPath: false }), [rule])).toBeNull();
    expect(pickSentinel(entry({ name: 'foo', hotPath: true }), [rule])).toBe('[hot]');
  });
});
