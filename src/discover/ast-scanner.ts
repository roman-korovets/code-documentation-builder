// AST scanner — walks TypeScript / TSX sources, emits InventoryEntry[].
//
// Discovered nodes:
//   - FunctionDeclaration                          → named-export | default | local
//   - MethodDeclaration / GetAccessor / SetAccessor → class-method
//   - ConstructorDeclaration                       → class-method (name = `<Class>.constructor`)
//   - VariableDeclaration with Arrow / FunctionExpression initialiser → arrow-const
//   - Same patterns nested inside another function body → local
//
// Anonymous arrows / inline JSX callbacks are skipped (per architecture § 4.1).

import { readFileSync } from 'node:fs';
import ts from 'typescript';
import fastGlob from 'fast-glob';
import type { InventoryEntry } from './index.js';

export interface AstScanOptions {
  projectRoot: string;
  sourceRoots: string[];
  exclude?: string[];
}

const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/*.d.ts',
  '**/dist/**',
  '**/.code-doc-builder/**',
];

export async function scanSources(opts: AstScanOptions): Promise<InventoryEntry[]> {
  const patterns = opts.sourceRoots.map((r) => `${r.replace(/\\/g, '/').replace(/\/$/, '')}/**/*.{ts,tsx}`);
  const files = await fastGlob(patterns, {
    cwd: opts.projectRoot,
    absolute: true,
    ignore: opts.exclude ?? DEFAULT_EXCLUDE,
    dot: false,
  });

  const out: InventoryEntry[] = [];
  for (const filePath of files) {
    if (filePath.endsWith('.d.ts')) continue;
    const text = readFileSync(filePath, 'utf8');
    const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, scriptKind);
    const relPath = toRelative(filePath, opts.projectRoot);
    walk(sourceFile, sourceFile, relPath, out, { parentClass: null, parentFn: null });
  }
  return out;
}

interface Ctx {
  parentClass: string | null;
  parentFn: string | null;
}

function walk(node: ts.Node, sf: ts.SourceFile, file: string, out: InventoryEntry[], ctx: Ctx): void {
  // --- Class declaration: descend with parentClass set ---
  if (ts.isClassDeclaration(node) && node.name) {
    const className = node.name.text;
    ts.forEachChild(node, (c) => walk(c, sf, file, out, { ...ctx, parentClass: className }));
    return;
  }

  // --- FunctionDeclaration (top-level or nested) ---
  if (ts.isFunctionDeclaration(node) && node.name) {
    const name = node.name.text;
    const exported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
    const isDefault = hasModifier(node, ts.SyntaxKind.DefaultKeyword);
    const kind: InventoryEntry['kind'] = ctx.parentFn
      ? 'local'
      : isDefault
        ? 'default'
        : exported
          ? 'named-export'
          : 'local';
    push(out, node, sf, file, name, kind, ctx, exported || isDefault);
    ts.forEachChild(node, (c) => walk(c, sf, file, out, { ...ctx, parentFn: name }));
    return;
  }

  // --- Class methods / accessors / constructor ---
  if (ctx.parentClass && (ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node))) {
    const memberName = node.name && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) || ts.isPrivateIdentifier(node.name))
      ? node.name.getText(sf)
      : null;
    if (memberName) {
      const fullName = `${ctx.parentClass}.${memberName}`;
      push(out, node, sf, file, fullName, 'class-method', ctx, true);
      ts.forEachChild(node, (c) => walk(c, sf, file, out, { ...ctx, parentFn: memberName }));
    }
    return;
  }
  if (ctx.parentClass && ts.isConstructorDeclaration(node)) {
    const fullName = `${ctx.parentClass}.constructor`;
    push(out, node, sf, file, fullName, 'class-method', ctx, true);
    ts.forEachChild(node, (c) => walk(c, sf, file, out, { ...ctx, parentFn: 'constructor' }));
    return;
  }

  // --- VariableDeclaration with arrow / function-expression initialiser ---
  if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name) && node.initializer) {
    const init = node.initializer;
    if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
      const name = node.name.text;
      const stmt = node.parent.parent;
      const exported = ts.isVariableStatement(stmt) && hasModifier(stmt, ts.SyntaxKind.ExportKeyword);
      const kind: InventoryEntry['kind'] = ctx.parentFn ? 'local' : 'arrow-const';
      push(out, init, sf, file, name, kind, ctx, exported);
      ts.forEachChild(init, (c) => walk(c, sf, file, out, { ...ctx, parentFn: name }));
      return;
    }
  }

  // --- Class PropertyDeclaration with arrow / function-expression initialiser ---
  //   class Foo { handler = (e) => { ... } }
  if (
    ctx.parentClass &&
    ts.isPropertyDeclaration(node) &&
    node.name &&
    (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) || ts.isPrivateIdentifier(node.name)) &&
    node.initializer &&
    (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
  ) {
    const memberName = node.name.getText(sf);
    const fullName = `${ctx.parentClass}.${memberName}`;
    push(out, node.initializer, sf, file, fullName, 'class-method', ctx, true);
    ts.forEachChild(node.initializer, (c) => walk(c, sf, file, out, { ...ctx, parentFn: memberName }));
    return;
  }

  // --- Default: descend ---
  ts.forEachChild(node, (c) => walk(c, sf, file, out, ctx));
}

function push(
  out: InventoryEntry[],
  node: ts.SignatureDeclaration,
  sf: ts.SourceFile,
  file: string,
  name: string,
  kind: InventoryEntry['kind'],
  ctx: Ctx,
  exported: boolean,
): void {
  const start = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  const end = sf.getLineAndCharacterOfPosition(node.getEnd());
  const params = node.parameters.map((p) => p.getText(sf)).join(', ');
  const ret = node.type ? `: ${node.type.getText(sf)}` : '';
  const signature = `(${params})${ret}`;
  const parent = buildParent(ctx, kind);
  const entry: InventoryEntry = {
    name,
    file,
    lineRange: `${start.line + 1}-${end.line + 1}`,
    kind,
    signature,
  };
  if (parent) entry.parent = parent;
  if (exported) entry.exported = true;
  out.push(entry);
}

function buildParent(ctx: Ctx, kind: InventoryEntry['kind']): string | undefined {
  if (kind === 'class-method' && ctx.parentClass) return ctx.parentClass;
  if (kind === 'local') {
    if (ctx.parentClass && ctx.parentFn) return `${ctx.parentClass}.${ctx.parentFn}`;
    if (ctx.parentFn) return ctx.parentFn;
  }
  return undefined;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return mods?.some((m) => m.kind === kind) ?? false;
}

function toRelative(absPath: string, projectRoot: string): string {
  const normRoot = projectRoot.replace(/\\/g, '/').replace(/\/$/, '');
  const normPath = absPath.replace(/\\/g, '/');
  if (normPath.startsWith(normRoot + '/')) return normPath.slice(normRoot.length + 1);
  return normPath;
}
