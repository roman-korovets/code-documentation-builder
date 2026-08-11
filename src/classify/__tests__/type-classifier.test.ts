import { describe, expect, it } from 'vitest';
import { classifyType } from '../type-classifier.js';
import type { InventoryEntry } from '../../discover/index.js';

const entry = (over: Partial<InventoryEntry>): InventoryEntry => ({
  name: 'fn',
  file: 'src/foo.ts',
  lineRange: '1-1',
  kind: 'named-export',
  signature: '()',
  ...over,
});

describe('type-classifier', () => {
  it('classifies Syncfusion callbacks', () => {
    expect(classifyType(entry({ file: 'src/modules/ganttChart/callbacks/queryCellInfo.ts', name: 'queryCellInfoEvent' }))).toBe('callback');
    expect(classifyType(entry({ file: 'src/modules/ganttChart/callbacks/pdfQueryTaskbarInfo.ts', name: 'pdfQueryTaskbarInfo' }))).toBe('callback');
  });

  it('classifies React hooks', () => {
    expect(classifyType(entry({ file: 'src/modules/ganttChart/hooks/hooks.ts', name: 'useDataSourceSync' }))).toBe('hook');
    expect(classifyType(entry({ file: 'src/modules/snackbar/hooks/useSnackbar.ts', name: 'useSnackbar' }))).toBe('hook');
  });

  it('classifies excel / pdf export pipelines', () => {
    expect(classifyType(entry({ file: 'src/services/excel-service/build.ts' }))).toBe('export');
    expect(classifyType(entry({ file: 'src/services/pdf-service/header.ts' }))).toBe('export');
  });

  it('classifies render pipeline', () => {
    expect(classifyType(entry({ file: 'src/services/render-service/build-snapshot.ts' }))).toBe('render');
    expect(classifyType(entry({ file: 'src/services/modify-stylesheet/index.ts' }))).toBe('render');
    expect(classifyType(entry({ file: 'src/visual.ts', name: 'Visual.update', kind: 'class-method' }))).toBe('render');
  });

  it('classifies React components by .tsx + PascalCase + top-level', () => {
    expect(classifyType(entry({ file: 'src/App.tsx', name: 'App' }))).toBe('component');
    expect(classifyType(entry({ file: 'src/modules/data-legend/LegendItem.tsx', name: 'LegendItem', kind: 'arrow-const' }))).toBe('component');
  });

  it('classifies service class methods', () => {
    expect(classifyType(entry({ file: 'src/services/data-cache-service/index.ts', name: 'DataCache.invalidate', kind: 'class-method' }))).toBe('service');
  });

  it('classifies utilities', () => {
    expect(classifyType(entry({ file: 'src/utils/parseJson.ts', name: 'parseJson' }))).toBe('util');
    expect(classifyType(entry({ file: 'src/modules/ganttChart/utils/general-utils.ts', name: 'isValidDate' }))).toBe('util');
  });

  it('falls back to transform', () => {
    expect(classifyType(entry({ file: 'src/services/calculation-values/calculateAllTasksValues.ts', name: 'calculateAllTasksValues' }))).toBe('transform');
    expect(classifyType(entry({ file: 'src/services/data-mapping/mapRowsToChartData.ts', name: 'mapRowsToChartData' }))).toBe('transform');
  });
});
