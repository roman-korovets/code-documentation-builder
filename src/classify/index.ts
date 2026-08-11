// Classification — Phase 2.
// Assigns module slug, type, features, and hot-path flag to each inventory
// entry. Module is path-based; type is heuristic; features are pattern-driven
// against a provided taxonomy; hot-path is pattern-match on the function name.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { InventoryEntry } from '../discover/index.js';
import { classifyModule } from './module-classifier.js';
import { classifyType } from './type-classifier.js';
import { classifyFeatures, type FeatureTaxonomyEntry } from './feature-classifier.js';
import { detectHotPath } from './hot-path-detector.js';

export type FunctionType =
  | 'callback'
  | 'transform'
  | 'render'
  | 'export'
  | 'component'
  | 'hook'
  | 'service'
  | 'util'
  | 'host'
  | 'builtin';

export interface ClassifiedEntry extends InventoryEntry {
  module: string;
  type: FunctionType;
  features: string[];
  hotPath: boolean;
}

export type ClassifiedInventory = ClassifiedEntry[];

export interface ClassifyOptions {
  inventory: InventoryEntry[];
  projectRoot: string;
  moduleMap?: Record<string, string>;
  featureTaxonomy?: FeatureTaxonomyEntry[];
  hotPathPatterns?: RegExp[];
}

export async function classify(opts: ClassifyOptions): Promise<ClassifiedInventory> {
  const fileCache = new Map<string, string>();
  const readSource = (rel: string): string => {
    let text = fileCache.get(rel);
    if (text === undefined) {
      try {
        text = readFileSync(join(opts.projectRoot, rel), 'utf8');
      } catch {
        text = '';
      }
      fileCache.set(rel, text);
    }
    return text;
  };

  return opts.inventory.map((entry) => {
    const sourceText = readSource(entry.file);
    const module = classifyModule(entry.file, { moduleMap: opts.moduleMap });
    const type = classifyType(entry, { sourceText });
    const features = opts.featureTaxonomy
      ? classifyFeatures(entry, { taxonomy: opts.featureTaxonomy })
      : [];
    const hotPath = detectHotPath(entry, opts.hotPathPatterns);
    return { ...entry, module, type, features, hotPath };
  });
}

export type { FeatureTaxonomyEntry };
