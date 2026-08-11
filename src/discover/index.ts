// Discovery — Phase 1.
// Walks a project source tree (or accepts a pre-built inventory) and produces
// a normalised list of functions with file, line-range, kind, and signature.
// Caches the result to <projectRoot>/.code-doc-builder/inventory.json.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { scanSources } from './ast-scanner.js';
import { loadInventory } from './inventory-loader.js';

export interface InventoryEntry {
  name: string;
  file: string;
  lineRange: string;
  kind: 'named-export' | 'default' | 'class-method' | 'local' | 'arrow-const';
  signature: string;
  parent?: string;
  exported?: boolean;
}

export interface DiscoverOptions {
  projectRoot: string;
  sourceRoots?: string[];
  exclude?: string[];
  mode?: 'ast' | 'provided';
  inventoryPath?: string;
  cache?: boolean;
}

export async function discover(opts: DiscoverOptions): Promise<InventoryEntry[]> {
  let entries: InventoryEntry[];
  if (opts.mode === 'provided') {
    if (!opts.inventoryPath) throw new Error('inventoryPath required when mode=provided');
    entries = await loadInventory(opts.inventoryPath);
  } else {
    entries = await scanSources({
      projectRoot: opts.projectRoot,
      sourceRoots: opts.sourceRoots ?? ['src'],
      exclude: opts.exclude,
    });
  }

  entries.sort((a, b) => a.file.localeCompare(b.file) || a.lineRange.localeCompare(b.lineRange));

  if (opts.cache !== false) {
    const cacheDir = join(opts.projectRoot, '.code-doc-builder');
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(join(cacheDir, 'inventory.json'), JSON.stringify(entries, null, 2), 'utf8');
  }

  return entries;
}
