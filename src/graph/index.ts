// Call graph — Phase 3.
// Single forward pass per file: re-parse, walk function bodies, collect
// CallExpression nodes, resolve callees to inventory keys or sentinels. Then
// reverse-fill `calledBy` and apply external-caller sentinels.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import type { ClassifiedEntry, ClassifiedInventory } from '../classify/index.js';
import { extractImports } from './imports.js';
import { extractCallee, extractExpressionRef, isReferenceUse, resolveCallee, type CalleeRef, type CalleeSentinelRule } from './resolver.js';
import { DEFAULT_EXTERNAL_CALLER_RULES, pickSentinel, type ExternalCallerRule } from './sentinels.js';

export interface CallGraphNode {
  key: string;
  calls: string[];
  calledBy: string[];
}

export type CallGraph = Map<string, CallGraphNode>;

export interface GraphOptions {
  inventory: ClassifiedInventory;
  projectRoot: string;
  externalCallerRules?: ExternalCallerRule[];
  calleeSentinelRules?: CalleeSentinelRule[];
  cache?: boolean;
}

export function entryKey(file: string, name: string): string {
  return `${file}::${name}`;
}

export async function buildCallGraph(opts: GraphOptions): Promise<CallGraph> {
  const inventory = opts.inventory;
  const inventoryFiles = new Set(inventory.map((e) => e.file));
  const byFileAndName = new Map<string, ClassifiedEntry>();
  const byName = new Map<string, ClassifiedEntry[]>();
  const byFile = new Map<string, ClassifiedEntry[]>();
  for (const e of inventory) {
    byFileAndName.set(entryKey(e.file, e.name), e);
    const arrName = byName.get(e.name) ?? [];
    arrName.push(e);
    byName.set(e.name, arrName);
    const arrFile = byFile.get(e.file) ?? [];
    arrFile.push(e);
    byFile.set(e.file, arrFile);
  }

  const graph: CallGraph = new Map();
  for (const e of inventory) {
    graph.set(entryKey(e.file, e.name), { key: entryKey(e.file, e.name), calls: [], calledBy: [] });
  }

  for (const [file, entries] of byFile) {
    const fullPath = join(opts.projectRoot, file);
    let text: string;
    try {
      text = readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const imports = extractImports(sf, file, inventoryFiles);

    const entryNodes = locateEntryNodes(sf, file, entries);
    for (const [entry, node] of entryNodes) {
      const callerKey = entryKey(entry.file, entry.name);
      const callerClass = entry.kind === 'class-method' && entry.parent ? entry.parent : null;
      const seen = new Set<string>();
      const tryResolve = (ref: CalleeRef | null) => {
        if (!ref) return;
        const resolved = resolveCallee(
          ref,
          { callerFile: file, callerClass, imports, byName, byFileAndName },
          opts.calleeSentinelRules,
        );
        if (resolved && !seen.has(resolved)) {
          seen.add(resolved);
          graph.get(callerKey)!.calls.push(resolved);
        }
      };
      collectBodyRefs(node, {
        onCall: (call) => tryResolve(extractCallee(call)),
        onIdentifier: (id) => tryResolve(extractExpressionRef(id)),
        onJsxTag: (tag) => tryResolve(extractExpressionRef(tag)),
      });
    }
  }

  // Reverse-fill calledBy.
  for (const [callerKey, node] of graph) {
    for (const calleeKey of node.calls) {
      if (calleeKey.startsWith('[')) continue;
      const calleeNode = graph.get(calleeKey);
      if (calleeNode && !calleeNode.calledBy.includes(callerKey)) {
        calleeNode.calledBy.push(callerKey);
      }
    }
  }

  // Apply external-caller sentinels to entries that still have no callers.
  const externalRules = opts.externalCallerRules ?? DEFAULT_EXTERNAL_CALLER_RULES;
  for (const e of inventory) {
    const node = graph.get(entryKey(e.file, e.name))!;
    if (node.calledBy.length > 0) continue;
    const sentinel = pickSentinel(e, externalRules);
    if (sentinel) node.calledBy.push(sentinel);
  }

  if (opts.cache !== false) {
    const cacheDir = join(opts.projectRoot, '.code-doc-builder');
    mkdirSync(cacheDir, { recursive: true });
    const serialisable = Array.from(graph.values());
    writeFileSync(join(cacheDir, 'call-graph.json'), JSON.stringify(serialisable, null, 2), 'utf8');
  }

  return graph;
}

// Locate the AST node that corresponds to each inventory entry, by matching
// start-line + (for class members) name.
function locateEntryNodes(
  sf: ts.SourceFile,
  _file: string,
  entries: ClassifiedEntry[],
): Array<[ClassifiedEntry, ts.Node]> {
  const out: Array<[ClassifiedEntry, ts.Node]> = [];
  const byStartLine = new Map<number, ClassifiedEntry[]>();
  for (const e of entries) {
    const startLine = parseInt(e.lineRange.split('-')[0], 10);
    const arr = byStartLine.get(startLine) ?? [];
    arr.push(e);
    byStartLine.set(startLine, arr);
  }

  const visit = (node: ts.Node, parentClass: string | null) => {
    if (ts.isClassDeclaration(node) && node.name) {
      ts.forEachChild(node, (c) => visit(c, node.name!.text));
      return;
    }
    const fnNode = matchFunctionLike(node);
    if (fnNode) {
      const startLine = sf.getLineAndCharacterOfPosition(fnNode.getStart(sf)).line + 1;
      const candidates = byStartLine.get(startLine);
      if (candidates) {
        const member = matchMemberName(node, sf);
        for (const c of candidates) {
          const local = c.name.includes('.') ? c.name.split('.').pop()! : c.name;
          if (member === local || member === null) {
            out.push([c, fnNode]);
            // We do NOT return — we still want to descend to find nested entries.
            break;
          }
        }
      }
    }
    ts.forEachChild(node, (c) => visit(c, parentClass));
  };
  visit(sf, null);
  return out;
}

function matchFunctionLike(node: ts.Node): ts.Node | null {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  ) {
    return node;
  }
  if (ts.isVariableDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
    return node.initializer;
  }
  if (ts.isPropertyDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
    return node.initializer;
  }
  return null;
}

function matchMemberName(node: ts.Node, sf: ts.SourceFile): string | null {
  if (ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node) || ts.isPropertyDeclaration(node)) {
    return node.name?.getText(sf) ?? null;
  }
  if (ts.isConstructorDeclaration(node)) return 'constructor';
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) return node.name.text;
  return null;
}

// Walk a function body and emit reference nodes. Stops at nested function-like
// declarations — those are separate inventory entries with their own ref set.
//
// Emits:
//   onCall:       every CallExpression (so callees are resolved as "actually called")
//   onIdentifier: Identifiers used as value references (callbacks passed as props,
//                 functions referenced in object literals, etc.)
//   onJsxTag:     JsxOpeningElement / JsxSelfClosingElement tag names
//                 (so `<Foo />` becomes a reference to Foo)
function collectBodyRefs(
  node: ts.Node,
  handlers: {
    onCall: (call: ts.CallExpression) => void;
    onIdentifier: (id: ts.Identifier) => void;
    onJsxTag: (tag: ts.Identifier) => void;
  },
): void {
  const visit = (n: ts.Node) => {
    if (n !== node && isNestedScope(n)) return;
    if (ts.isCallExpression(n)) handlers.onCall(n);
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const tag = n.tagName;
      if (ts.isIdentifier(tag)) handlers.onJsxTag(tag);
    }
    if (ts.isIdentifier(n) && isReferenceUse(n)) handlers.onIdentifier(n);
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(node, visit);
}

function isNestedScope(n: ts.Node): boolean {
  if (
    ts.isFunctionDeclaration(n) ||
    ts.isMethodDeclaration(n) ||
    ts.isGetAccessorDeclaration(n) ||
    ts.isSetAccessorDeclaration(n) ||
    ts.isConstructorDeclaration(n)
  ) return true;

  // Arrow / function expressions are nested ONLY when they are assigned to a
  // named declaration — then they have their own inventory entry. Anonymous
  // arrows used as render props, `.map(...)` callbacks, or `useState`
  // initialisers are transparent: their references belong to the enclosing
  // named function.
  if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
    const p = n.parent;
    if (p && ts.isVariableDeclaration(p) && p.initializer === n && ts.isIdentifier(p.name)) return true;
    if (p && ts.isPropertyDeclaration(p) && p.initializer === n && p.name && ts.isIdentifier(p.name)) return true;
    return false;
  }

  return false;
}

export type { ExternalCallerRule, CalleeSentinelRule };
