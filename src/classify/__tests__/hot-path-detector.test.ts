import { describe, expect, it } from 'vitest';
import { detectHotPath } from '../hot-path-detector.js';
import type { InventoryEntry } from '../../discover/index.js';

const entry = (over: Partial<InventoryEntry>): InventoryEntry => ({
  name: 'fn',
  file: 'src/foo.ts',
  lineRange: '1-1',
  kind: 'named-export',
  signature: '()',
  ...over,
});

describe('hot-path-detector', () => {
  it('flags the canonical Syncfusion callbacks', () => {
    expect(detectHotPath(entry({ name: 'queryCellInfoEvent' }))).toBe(true);
    expect(detectHotPath(entry({ name: 'queryTaskbarInfo' }))).toBe(true);
    expect(detectHotPath(entry({ name: 'rowDataBoundHandler' }))).toBe(true);
    expect(detectHotPath(entry({ name: 'headerCellInfoEvent' }))).toBe(true);
  });

  it('flags PDF hot callbacks', () => {
    expect(detectHotPath(entry({ name: 'pdfQueryTaskbarInfoEvent' }))).toBe(true);
    expect(detectHotPath(entry({ name: 'pdfQueryCellInfoEvent' }))).toBe(true);
  });

  it('flags CF apply helpers', () => {
    expect(detectHotPath(entry({ name: 'applyConditionalFormattingToRow' }))).toBe(true);
    expect(detectHotPath(entry({ name: 'applyCfClassesToTaskbar' }))).toBe(true);
    expect(detectHotPath(entry({ name: 'syncTaskLabelSpans' }))).toBe(true);
  });

  it('does not flag unrelated names', () => {
    expect(detectHotPath(entry({ name: 'buildRenderSnapshot' }))).toBe(false);
    expect(detectHotPath(entry({ name: 'parseSettings' }))).toBe(false);
    expect(detectHotPath(entry({ name: 'visualUpdate' }))).toBe(false);
  });

  it('accepts custom patterns', () => {
    const custom = [/^doExpensiveWork/];
    expect(detectHotPath(entry({ name: 'doExpensiveWorkPerRow' }), custom)).toBe(true);
    expect(detectHotPath(entry({ name: 'queryCellInfo' }), custom)).toBe(false);
  });

  it('handles `Class.method` form by matching the local member name', () => {
    expect(detectHotPath(entry({ name: 'Visual.queryCellInfo' }))).toBe(true);
    expect(detectHotPath(entry({ name: 'Visual.update' }))).toBe(false);
  });
});
