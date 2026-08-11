import { describe, expect, it } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanSources } from '../ast-scanner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = resolve(__dirname, 'fixtures');

describe('ast-scanner', () => {
  it('finds every function shape in the sample fixture', async () => {
    const entries = await scanSources({
      projectRoot: FIXTURE_ROOT,
      sourceRoots: ['.'],
    });
    const names = entries.map((e) => e.name).sort();
    expect(names).toEqual(
      [
        'Foo.constructor',
        'Foo.method',
        'Foo.y',
        'arrowFn',
        'defaultFn',
        'factory',
        'inner',
        'localArrow',
        'nested',
        'privateFn',
        'topLevelFn',
      ].sort(),
    );
  });

  it('classifies kinds correctly', async () => {
    const entries = await scanSources({ projectRoot: FIXTURE_ROOT, sourceRoots: ['.'] });
    const byName = new Map(entries.map((e) => [e.name, e]));

    expect(byName.get('topLevelFn')?.kind).toBe('named-export');
    expect(byName.get('arrowFn')?.kind).toBe('arrow-const');
    expect(byName.get('defaultFn')?.kind).toBe('default');
    expect(byName.get('localArrow')?.kind).toBe('arrow-const');
    expect(byName.get('privateFn')?.kind).toBe('local');
    expect(byName.get('Foo.constructor')?.kind).toBe('class-method');
    expect(byName.get('Foo.method')?.kind).toBe('class-method');
    expect(byName.get('Foo.y')?.kind).toBe('class-method');
    expect(byName.get('factory')?.kind).toBe('arrow-const');
    expect(byName.get('nested')?.kind).toBe('local');
    expect(byName.get('inner')?.kind).toBe('local');
  });

  it('marks exported declarations', async () => {
    const entries = await scanSources({ projectRoot: FIXTURE_ROOT, sourceRoots: ['.'] });
    const byName = new Map(entries.map((e) => [e.name, e]));

    expect(byName.get('topLevelFn')?.exported).toBe(true);
    expect(byName.get('arrowFn')?.exported).toBe(true);
    expect(byName.get('defaultFn')?.exported).toBe(true);
    expect(byName.get('factory')?.exported).toBe(true);
    expect(byName.get('privateFn')?.exported).toBeUndefined();
    expect(byName.get('localArrow')?.exported).toBeUndefined();
  });

  it('records parent context for class methods and nested helpers', async () => {
    const entries = await scanSources({ projectRoot: FIXTURE_ROOT, sourceRoots: ['.'] });
    const byName = new Map(entries.map((e) => [e.name, e]));

    expect(byName.get('Foo.constructor')?.parent).toBe('Foo');
    expect(byName.get('Foo.method')?.parent).toBe('Foo');
    expect(byName.get('nested')?.parent).toBe('Foo.method');
    expect(byName.get('inner')?.parent).toBe('factory');
  });

  it('captures signature with params and return type when present', async () => {
    const entries = await scanSources({ projectRoot: FIXTURE_ROOT, sourceRoots: ['.'] });
    const byName = new Map(entries.map((e) => [e.name, e]));

    expect(byName.get('topLevelFn')?.signature).toBe('(a: number): string');
    expect(byName.get('arrowFn')?.signature).toBe('(b: string)');
    expect(byName.get('Foo.method')?.signature).toBe('(): number');
    expect(byName.get('nested')?.signature).toBe('(k: number): number');
  });
});
