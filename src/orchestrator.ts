// Orchestrator — Phase 10.
// End-to-end build with drift awareness:
//   1. Load cached inventory (if any).
//   2. Discover + classify + graph the current source tree.
//   3. Compute drift deltas against the cached inventory.
//   4. If `--plan`, print and return.
//   5. Delete docs for `removed` + `renamed.old` entries (so next steps don't
//      leave orphans).
//   6. Run generate (write-if-changed; reports written / skipped counts).
//   7. Run link-resolver to rebuild called-by from the live graph.
//   8. Run aggregate (features + modules + hubs).
//   9. Run audit installer.
//   10. Persist new inventory.json to the cache directory.

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { InventoryEntry } from './discover/index.js';
import { discover } from './discover/index.js';
import { classify, type FeatureTaxonomyEntry } from './classify/index.js';
import { buildCallGraph } from './graph/index.js';
import { resolveSlugs, type SlugPrefixRule } from './generate/slug-resolver.js';
import { generateFunctionDocs } from './generate/index.js';
import { resolveLinks } from './generate/link-resolver.js';
import { aggregate } from './aggregate/index.js';
import { installAudits } from './audit/index.js';
import { enforceQuality, type EnforceReport } from './quality/enforce.js';
import { detectDrift, type DriftReport, type Delta } from './drift/index.js';

export interface BuildOptions {
  projectRoot: string;
  outputRoot: string;
  taxonomy?: FeatureTaxonomyEntry[];
  moduleMap?: Record<string, string>;
  hotPathPatterns?: RegExp[];
  slugPrefixRules?: SlugPrefixRule[];
  rootClassFile?: string;
  rootClassName?: string;
  /** Dry-run: compute drift + plan but don't write or delete anything. */
  plan?: boolean;
  /** Force re-emit even when content matches (mtime refresh; rarely needed). */
  regenerate?: boolean;
  /** Skip the audit installer step. */
  skipAudit?: boolean;
  /** Skip the quality enforcement loop. */
  skipQuality?: boolean;
  /** Skip the user-guides scaffolding step. */
  skipGuides?: boolean;
  /** Display name shown in the guides intro (defaults to "this project"). */
  projectName?: string;
}

export interface BuildResult {
  drift: DriftReport;
  generate: { written: number; skippedUnchanged: number };
  link: { rewritten: number; unchanged: number };
  aggregate: { features: number; modules: number; guidesCreated: number; guidesSkipped: number };
  quality?: EnforceReport;
  removed: string[];
  renamed: { from: string; to: string }[];
  outputRoot: string;
}

const CACHE_DIR = '.code-doc-builder';

export async function build(opts: BuildOptions): Promise<BuildResult> {
  const cacheDir = join(opts.projectRoot, CACHE_DIR);
  const inventoryCachePath = join(cacheDir, 'inventory.json');

  const oldInventory: InventoryEntry[] = existsSync(inventoryCachePath)
    ? JSON.parse(readFileSync(inventoryCachePath, 'utf8'))
    : [];

  const newInventory = await discover({ projectRoot: opts.projectRoot, cache: false });
  const classified = await classify({
    inventory: newInventory,
    projectRoot: opts.projectRoot,
    moduleMap: opts.moduleMap,
    featureTaxonomy: opts.taxonomy,
    hotPathPatterns: opts.hotPathPatterns,
  });
  const graph = await buildCallGraph({
    inventory: classified,
    projectRoot: opts.projectRoot,
    cache: false,
  });

  const drift = await detectDrift({ oldInventory, newInventory });

  if (opts.plan) {
    return {
      drift,
      generate: { written: 0, skippedUnchanged: 0 },
      link: { rewritten: 0, unchanged: 0 },
      aggregate: { features: 0, modules: 0, guidesCreated: 0, guidesSkipped: 0 },
      removed: [],
      renamed: [],
      outputRoot: opts.outputRoot,
    };
  }

  // Resolve slugs once — used for both old-side cleanup and the dispatcher.
  const newSlugs = resolveSlugs(classified, { prefixRules: opts.slugPrefixRules });

  // Pre-step: delete docs for removed + renamed.old entries so the new run
  // doesn't leave orphans on disk.
  const oldClassified = oldInventory.length > 0
    ? await classify({
        inventory: oldInventory,
        projectRoot: opts.projectRoot,
        moduleMap: opts.moduleMap,
        featureTaxonomy: opts.taxonomy,
        hotPathPatterns: opts.hotPathPatterns,
      })
    : [];
  const oldSlugs = oldClassified.length > 0
    ? resolveSlugs(oldClassified, { prefixRules: opts.slugPrefixRules })
    : { slugs: [], byKey: new Map<string, string>() };
  const oldSlugByEntry = new Map<string, string>();
  for (let i = 0; i < oldClassified.length; i++) {
    oldSlugByEntry.set(`${oldClassified[i].file}::${oldClassified[i].name}`, oldSlugs.slugs[i]);
  }

  const removed: string[] = [];
  const renamed: { from: string; to: string }[] = [];
  for (const d of drift.deltas) deleteOrRename(d, opts.outputRoot, oldSlugByEntry, newSlugs.byKey, removed, renamed);

  const gen = await generateFunctionDocs({
    inventory: classified,
    graph,
    outputRoot: opts.outputRoot,
    slugPrefixRules: opts.slugPrefixRules,
    write: true,
  });

  const link = await resolveLinks({
    inventory: classified,
    graph,
    slugByKey: newSlugs.byKey,
    docRoot: opts.outputRoot,
  });

  const agg = await aggregate({
    inventory: classified,
    graph,
    slugByKey: newSlugs.byKey,
    taxonomy: opts.taxonomy ?? [],
    projectRoot: opts.projectRoot,
    outputRoot: opts.outputRoot,
    rootClassFile: opts.rootClassFile,
    rootClassName: opts.rootClassName,
    projectName: opts.projectName,
    skipGuides: opts.skipGuides,
  });

  let quality: EnforceReport | undefined;
  if (!opts.skipQuality) {
    quality = await enforceQuality({
      inventory: classified,
      slugByKey: newSlugs.byKey,
      outputRoot: opts.outputRoot,
    });
  }

  if (!opts.skipAudit) {
    await installAudits({
      inventory: classified,
      graph,
      slugByKey: newSlugs.byKey,
      sharedHotspots: agg.features.sharedHotspots,
      outputRoot: opts.outputRoot,
    });
  }

  // Persist new inventory for the next run's drift baseline.
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(inventoryCachePath, JSON.stringify(newInventory, null, 2), 'utf8');

  return {
    drift,
    generate: { written: gen.written, skippedUnchanged: gen.skippedUnchanged },
    link: { rewritten: link.rewritten, unchanged: link.unchanged },
    aggregate: {
      features: agg.features.docs.length,
      modules: agg.modules.docs.length,
      guidesCreated: agg.guides?.created.length ?? 0,
      guidesSkipped: agg.guides?.skipped.length ?? 0,
    },
    quality,
    removed,
    renamed,
    outputRoot: opts.outputRoot,
  };
}

function deleteOrRename(
  d: Delta,
  outputRoot: string,
  oldSlugByEntry: Map<string, string>,
  newSlugByEntry: Map<string, string>,
  removed: string[],
  renamed: { from: string; to: string }[],
): void {
  if (d.kind === 'removed') {
    const slug = oldSlugByEntry.get(`${d.entry.file}::${d.entry.name}`);
    if (slug) {
      const p = join(outputRoot, `${slug}.md`);
      if (existsSync(p)) {
        unlinkSync(p);
        removed.push(`${slug}.md`);
      }
    }
    return;
  }
  if (d.kind === 'renamed' || d.kind === 'moved') {
    const oldSlug = oldSlugByEntry.get(`${d.oldEntry.file}::${d.oldEntry.name}`);
    const newSlug = newSlugByEntry.get(`${d.newEntry.file}::${d.newEntry.name}`);
    if (oldSlug && newSlug && oldSlug !== newSlug) {
      const oldPath = join(outputRoot, `${oldSlug}.md`);
      if (existsSync(oldPath)) {
        // Delete the stale file; generate will write the new one with refreshed
        // frontmatter and Origin/Signature blocks.
        unlinkSync(oldPath);
        renamed.push({ from: `${oldSlug}.md`, to: `${newSlug}.md` });
      }
    }
  }
}
