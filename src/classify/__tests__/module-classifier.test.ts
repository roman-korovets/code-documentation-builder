import { describe, expect, it } from 'vitest';
import { classifyModule } from '../module-classifier.js';

describe('module-classifier', () => {
  it('auto-derives module from src/modules/<X>/', () => {
    expect(classifyModule('src/modules/ganttChart/index.ts')).toBe('ganttChart');
    expect(classifyModule('src/modules/conditional-formatting/service.ts')).toBe('conditional-formatting');
    expect(classifyModule('src/modules/data-legend/LegendItem.tsx')).toBe('data-legend');
  });

  it('auto-derives services as services/<X>', () => {
    expect(classifyModule('src/services/calculation-values/utils.ts')).toBe('services/calculation-values');
    expect(classifyModule('src/services/excel-service/build.ts')).toBe('services/excel-service');
  });

  it('maps utils / components / settings folders', () => {
    expect(classifyModule('src/utils/parseJson.ts')).toBe('utils');
    expect(classifyModule('src/components/edit-section/index.tsx')).toBe('components');
    expect(classifyModule('src/settings/BaselinesSettings.ts')).toBe('settings');
  });

  it('maps root visual files to "visual"', () => {
    expect(classifyModule('src/visual.ts')).toBe('visual');
    expect(classifyModule('src/App.tsx')).toBe('visual');
    expect(classifyModule('src/SimpleApp.tsx')).toBe('visual');
  });

  it('honours an explicit moduleMap (longest prefix wins)', () => {
    const map = { 'src/services/data-cache-service/': 'services/data-cache' };
    expect(classifyModule('src/services/data-cache-service/index.ts', { moduleMap: map })).toBe('services/data-cache');
    expect(classifyModule('src/services/excel-service/x.ts', { moduleMap: map })).toBe('services/excel-service');
  });

  it('returns "unknown" for unrecognised paths', () => {
    expect(classifyModule('lib/external/foo.ts')).toBe('unknown');
  });
});
