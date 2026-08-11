// Import extraction + relative-path resolution.
//
// Walks top-level ImportDeclaration nodes in a SourceFile, producing a map
// `localName → { file, originalName, kind }`. Used by the resolver to map a
// callee identifier in one file to an inventory entry in another.
//
// Path resolution covers `./` and `../` specifiers only — bare package imports
// (`powerbi-visuals-api`, `react`) are out of scope for v0.1 and treated as
// external (a callee through such an identifier becomes an external reference).

import ts from 'typescript';

export interface ImportRef {
  localName: string;
  originalName: string;
  file: string | null;
  kind: 'named' | 'default' | 'namespace';
}

export interface ImportTable {
  byLocal: Map<string, ImportRef>;
  namespaceFiles: Map<string, string>;
}

export function extractImports(sf: ts.SourceFile, currentFile: string, inventoryFiles: Set<string>): ImportTable {
  const byLocal = new Map<string, ImportRef>();
  const namespaceFiles = new Map<string, string>();

  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (stmt.importClause?.isTypeOnly) continue;
    const specifier = (stmt.moduleSpecifier as ts.StringLiteral).text;
    const resolvedFile = resolveImportPath(specifier, currentFile, inventoryFiles);

    const clause = stmt.importClause;
    if (!clause) continue;

    if (clause.name) {
      const local = clause.name.text;
      byLocal.set(local, { localName: local, originalName: 'default', file: resolvedFile, kind: 'default' });
    }

    if (clause.namedBindings) {
      if (ts.isNamespaceImport(clause.namedBindings)) {
        const local = clause.namedBindings.name.text;
        byLocal.set(local, { localName: local, originalName: '*', file: resolvedFile, kind: 'namespace' });
        if (resolvedFile) namespaceFiles.set(local, resolvedFile);
      } else if (ts.isNamedImports(clause.namedBindings)) {
        for (const el of clause.namedBindings.elements) {
          if (el.isTypeOnly) continue;
          const local = el.name.text;
          const original = el.propertyName?.text ?? local;
          byLocal.set(local, { localName: local, originalName: original, file: resolvedFile, kind: 'named' });
        }
      }
    }
  }

  return { byLocal, namespaceFiles };
}

export function resolveImportPath(specifier: string, currentFile: string, inventoryFiles: Set<string>): string | null {
  if (!specifier.startsWith('.')) return null;

  const currentDir = currentFile.includes('/') ? currentFile.slice(0, currentFile.lastIndexOf('/')) : '';
  const combined = currentDir ? `${currentDir}/${specifier}` : specifier;
  const parts = combined.split('/');
  const stack: string[] = [];
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '..') stack.pop();
    else stack.push(p);
  }
  const base = stack.join('/');

  const candidates = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`, base];
  for (const c of candidates) {
    if (inventoryFiles.has(c)) return c;
  }
  return null;
}
