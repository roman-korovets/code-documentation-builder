import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { extractImports, resolveImportPath } from '../imports.js';

const parse = (src: string, file = 'src/a.ts'): ts.SourceFile =>
  ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

describe('resolveImportPath', () => {
  const inv = new Set(['src/b.ts', 'src/utils/c.tsx', 'src/d/index.ts']);

  it('resolves same-dir relative import', () => {
    expect(resolveImportPath('./b', 'src/a.ts', inv)).toBe('src/b.ts');
  });

  it('resolves .tsx files', () => {
    expect(resolveImportPath('./utils/c', 'src/a.ts', inv)).toBe('src/utils/c.tsx');
  });

  it('resolves directory/index.ts', () => {
    expect(resolveImportPath('./d', 'src/a.ts', inv)).toBe('src/d/index.ts');
  });

  it('returns null for npm packages', () => {
    expect(resolveImportPath('react', 'src/a.ts', inv)).toBeNull();
  });

  it('returns null when no candidate exists', () => {
    expect(resolveImportPath('./missing', 'src/a.ts', inv)).toBeNull();
  });

  it('handles parent-dir traversal', () => {
    expect(resolveImportPath('../b', 'src/x/a.ts', inv)).toBe('src/b.ts');
  });
});

describe('extractImports', () => {
  const inv = new Set(['src/b.ts', 'src/utils/c.ts']);

  it('captures named imports', () => {
    const sf = parse(`import { foo, bar as baz } from './b';`);
    const t = extractImports(sf, 'src/a.ts', inv);
    expect(t.byLocal.get('foo')?.originalName).toBe('foo');
    expect(t.byLocal.get('baz')?.originalName).toBe('bar');
    expect(t.byLocal.get('foo')?.file).toBe('src/b.ts');
  });

  it('captures default imports', () => {
    const sf = parse(`import myDefault from './b';`);
    const t = extractImports(sf, 'src/a.ts', inv);
    expect(t.byLocal.get('myDefault')?.kind).toBe('default');
    expect(t.byLocal.get('myDefault')?.file).toBe('src/b.ts');
  });

  it('captures namespace imports', () => {
    const sf = parse(`import * as ns from './utils/c';`);
    const t = extractImports(sf, 'src/a.ts', inv);
    expect(t.byLocal.get('ns')?.kind).toBe('namespace');
    expect(t.namespaceFiles.get('ns')).toBe('src/utils/c.ts');
  });

  it('skips type-only imports', () => {
    const sf = parse(`import type { Foo } from './b';`);
    const t = extractImports(sf, 'src/a.ts', inv);
    expect(t.byLocal.has('Foo')).toBe(false);
  });

  it('skips type-only named bindings', () => {
    const sf = parse(`import { type Foo, bar } from './b';`);
    const t = extractImports(sf, 'src/a.ts', inv);
    expect(t.byLocal.has('Foo')).toBe(false);
    expect(t.byLocal.has('bar')).toBe(true);
  });
});
