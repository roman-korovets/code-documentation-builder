import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discover } from '../../discover/index.js';
import { classify } from '../../classify/index.js';
import { buildCallGraph, entryKey } from '../index.js';

const setupFixture = (): string => {
  const root = mkdtempSync(join(tmpdir(), 'graph-'));
  mkdirSync(join(root, 'src/utils'), { recursive: true });
  mkdirSync(join(root, 'src/modules/ganttChart/callbacks'), { recursive: true });

  writeFileSync(join(root, 'src/utils/helpers.ts'), `
export const computeSum = (a: number, b: number): number => a + b;
export const computeProduct = (a: number, b: number): number => a * b;
`);

  writeFileSync(join(root, 'src/visual.ts'), `
import { computeSum } from './utils/helpers';

export class Visual {
  update(): number {
    const x = computeSum(1, 2);
    return this.helper(x);
  }

  helper(n: number): number {
    return n * 2;
  }
}
`);

  writeFileSync(join(root, 'src/modules/ganttChart/callbacks/queryCellInfo.ts'), `
import { computeProduct } from '../../../utils/helpers';

export function queryCellInfoEvent(args: { value: number }): number {
  return computeProduct(args.value, 3);
}
`);

  return root;
};

describe('buildCallGraph', () => {
  it('builds forward + backward edges across files', async () => {
    const root = setupFixture();
    const inventory = await discover({ projectRoot: root, cache: false });
    const classified = await classify({ inventory, projectRoot: root });
    const graph = await buildCallGraph({ inventory: classified, projectRoot: root, cache: false });

    const updateKey = entryKey('src/visual.ts', 'Visual.update');
    const helperKey = entryKey('src/visual.ts', 'Visual.helper');
    const sumKey = entryKey('src/utils/helpers.ts', 'computeSum');

    expect(graph.get(updateKey)?.calls).toContain(sumKey);
    expect(graph.get(updateKey)?.calls).toContain(helperKey);
    expect(graph.get(sumKey)?.calledBy).toContain(updateKey);
    expect(graph.get(helperKey)?.calledBy).toContain(updateKey);
  });

  it('applies external sentinels for entry points without internal callers', async () => {
    const root = setupFixture();
    const inventory = await discover({ projectRoot: root, cache: false });
    const classified = await classify({ inventory, projectRoot: root });
    const graph = await buildCallGraph({ inventory: classified, projectRoot: root, cache: false });

    const callbackKey = entryKey('src/modules/ganttChart/callbacks/queryCellInfo.ts', 'queryCellInfoEvent');
    expect(graph.get(callbackKey)?.calledBy).toContain('[syncfusion-gantt-internal]');

    const updateKey = entryKey('src/visual.ts', 'Visual.update');
    expect(graph.get(updateKey)?.calledBy).toContain('[powerbi-host-ivisual-update]');
  });

  it('does not orphan helpers — computeProduct is called from a callback', async () => {
    const root = setupFixture();
    const inventory = await discover({ projectRoot: root, cache: false });
    const classified = await classify({ inventory, projectRoot: root });
    const graph = await buildCallGraph({ inventory: classified, projectRoot: root, cache: false });

    const prodKey = entryKey('src/utils/helpers.ts', 'computeProduct');
    expect(graph.get(prodKey)?.calledBy.length).toBeGreaterThan(0);
  });

  it('records distinct callers without duplicates', async () => {
    const root = setupFixture();
    const inventory = await discover({ projectRoot: root, cache: false });
    const classified = await classify({ inventory, projectRoot: root });
    const graph = await buildCallGraph({ inventory: classified, projectRoot: root, cache: false });

    for (const node of graph.values()) {
      const unique = new Set(node.calls);
      expect(unique.size).toBe(node.calls.length);
    }
  });
});
