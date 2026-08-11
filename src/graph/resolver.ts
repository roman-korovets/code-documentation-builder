// Callee resolver — turns a CallExpression in a function body into either an
// inventory key (`<file>::<name>`), an external sentinel string (e.g.
// `[powerbi-host-event-service]`), or `null` (unresolved).

import ts from 'typescript';
import type { ClassifiedEntry } from '../classify/index.js';
import type { ImportTable } from './imports.js';

export type CalleeRef =
  | { kind: 'identifier'; name: string }
  | { kind: 'this-method'; name: string }
  | { kind: 'namespace'; namespace: string; name: string }
  | { kind: 'chained-namespace'; chain: string[] };

export interface ResolveContext {
  callerFile: string;
  callerClass: string | null;
  imports: ImportTable;
  byName: Map<string, ClassifiedEntry[]>;
  byFileAndName: Map<string, ClassifiedEntry>;
}

export interface CalleeSentinelRule {
  identifier: RegExp;
  sentinel: string;
}

export function extractCallee(call: ts.CallExpression): CalleeRef | null {
  return extractExpressionRef(call.expression);
}

// Generic expression → CalleeRef. Used for both CallExpression callees and
// bare identifier references (callbacks passed as props, JSX tag names, etc).
export function extractExpressionRef(e: ts.Expression): CalleeRef | null {
  if (ts.isIdentifier(e)) return { kind: 'identifier', name: e.text };
  if (ts.isPropertyAccessExpression(e)) {
    if (e.expression.kind === ts.SyntaxKind.ThisKeyword && ts.isIdentifier(e.name)) {
      return { kind: 'this-method', name: e.name.text };
    }
    if (ts.isIdentifier(e.expression) && ts.isIdentifier(e.name)) {
      return { kind: 'namespace', namespace: e.expression.text, name: e.name.text };
    }
    const chain: string[] = [];
    let cur: ts.Expression = e;
    while (ts.isPropertyAccessExpression(cur) && ts.isIdentifier(cur.name)) {
      chain.unshift(cur.name.text);
      cur = cur.expression;
    }
    if (ts.isIdentifier(cur)) {
      chain.unshift(cur.text);
      return { kind: 'chained-namespace', chain };
    }
  }
  return null;
}

// True when `id` is used as a value reference (callable / readable / passed as
// a callback / JSX tag), not as a declaration name, member name, type, or
// JSX attribute name.
export function isReferenceUse(id: ts.Identifier): boolean {
  const p = id.parent;
  if (!p) return true;

  if (
    (ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isBindingElement(p)) &&
    (p as { name?: ts.Node }).name === id
  ) return false;
  if (ts.isFunctionDeclaration(p) && p.name === id) return false;
  if (ts.isClassDeclaration(p) && p.name === id) return false;
  if (ts.isInterfaceDeclaration(p) && p.name === id) return false;
  if (ts.isTypeAliasDeclaration(p) && p.name === id) return false;
  if (ts.isEnumDeclaration(p) && p.name === id) return false;
  if ((ts.isMethodDeclaration(p) || ts.isPropertyDeclaration(p) || ts.isGetAccessorDeclaration(p) || ts.isSetAccessorDeclaration(p)) && p.name === id) return false;
  if (ts.isPropertyAccessExpression(p) && p.name === id) return false;
  if (ts.isImportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p) || ts.isExportSpecifier(p)) return false;
  if (ts.isPropertyAssignment(p) && p.name === id) return false;
  if (ts.isJsxAttribute(p) && p.name === id) return false;
  if (ts.isTypeReferenceNode(p)) return false;
  if (ts.isQualifiedName(p)) return false;
  if (ts.isLabeledStatement(p) && p.label === id) return false;
  if (ts.isBreakStatement(p) || ts.isContinueStatement(p)) return false;

  return true;
}

export function resolveCallee(
  callee: CalleeRef,
  ctx: ResolveContext,
  sentinelRules: CalleeSentinelRule[] = [],
): string | null {
  if (callee.kind === 'identifier') {
    const imported = ctx.imports.byLocal.get(callee.name);
    if (imported && imported.file) {
      const key = `${imported.file}::${imported.originalName === 'default' ? lookupDefault(imported.file, ctx.byFileAndName) : imported.originalName}`;
      if (ctx.byFileAndName.has(key)) return key;
      // Try by name within imported file.
      const fallback = `${imported.file}::${callee.name}`;
      if (ctx.byFileAndName.has(fallback)) return fallback;
    }
    // Same-file lookup
    const sameFileKey = `${ctx.callerFile}::${callee.name}`;
    if (ctx.byFileAndName.has(sameFileKey)) return sameFileKey;
    // Unique global match
    const globals = ctx.byName.get(callee.name);
    if (globals && globals.length === 1) return `${globals[0].file}::${globals[0].name}`;
    return matchSentinel(callee.name, sentinelRules);
  }

  if (callee.kind === 'this-method') {
    if (!ctx.callerClass) return null;
    const key = `${ctx.callerFile}::${ctx.callerClass}.${callee.name}`;
    if (ctx.byFileAndName.has(key)) return key;
    return null;
  }

  if (callee.kind === 'namespace') {
    const nsFile = ctx.imports.namespaceFiles.get(callee.namespace);
    if (nsFile) {
      const key = `${nsFile}::${callee.name}`;
      if (ctx.byFileAndName.has(key)) return key;
    }
    // Maybe namespace is a class name (static method or referenced enum). Try byName.
    const candidates = ctx.byName.get(`${callee.namespace}.${callee.name}`);
    if (candidates && candidates.length === 1) return `${candidates[0].file}::${candidates[0].name}`;
    return matchSentinel(`${callee.namespace}.${callee.name}`, sentinelRules);
  }

  if (callee.kind === 'chained-namespace') {
    const full = callee.chain.join('.');
    return matchSentinel(full, sentinelRules);
  }

  return null;
}

function lookupDefault(file: string, byFileAndName: Map<string, ClassifiedEntry>): string {
  for (const [key, entry] of byFileAndName) {
    if (key.startsWith(`${file}::`) && entry.kind === 'default') return entry.name;
  }
  return 'default';
}

function matchSentinel(token: string, rules: CalleeSentinelRule[]): string | null {
  for (const r of rules) {
    if (r.identifier.test(token)) return r.sentinel;
  }
  return null;
}
