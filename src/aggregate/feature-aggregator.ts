// Feature aggregator — Phase 6.1.
// Emits one features/<slug>.md per feature slug present in the classified
// inventory, plus features/_features-index.md with the full taxonomy table
// and shared-dependency hot spots.

import { mkdirSync } from 'node:fs';
import { writeIfChanged } from './write-if-changed.js';
import { join } from 'node:path';
import type { ClassifiedEntry, ClassifiedInventory } from '../classify/index.js';
import type { FeatureTaxonomyEntry } from '../classify/feature-classifier.js';
import { entryKey } from '../graph/index.js';

export interface FeatureAggregateOptions {
  inventory: ClassifiedInventory;
  slugByKey: Map<string, string>;
  taxonomy: FeatureTaxonomyEntry[];
  outputRoot: string;
  write?: boolean;
}

export interface FeatureDoc {
  slug: string;
  displayName: string;
  functionCount: number;
  risk: 'low' | 'medium' | 'high';
  hotPathCount: number;
  sharedWith: string[];
  path: string;
  text: string;
}

export interface FeatureAggregateResult {
  docs: FeatureDoc[];
  indexPath: string;
  indexText: string;
  sharedHotspots: { slug: string; features: string[] }[];
}

export async function aggregateFeatures(opts: FeatureAggregateOptions): Promise<FeatureAggregateResult> {
  const { inventory, slugByKey, taxonomy, outputRoot, write } = opts;
  const taxonomyBySlug = new Map(taxonomy.map((f) => [f.slug, f]));

  const byFeature = new Map<string, ClassifiedEntry[]>();
  const featureCountPerEntry = new Map<string, number>();
  for (const e of inventory) {
    featureCountPerEntry.set(entryKey(e.file, e.name), e.features.length);
    for (const f of e.features) {
      const arr = byFeature.get(f) ?? [];
      arr.push(e);
      byFeature.set(f, arr);
    }
  }

  // Shared dependencies — functions assigned to 2+ features.
  const featureOverlap = new Map<string, Set<string>>(); // feature → set of co-features
  for (const e of inventory) {
    if (e.features.length < 2) continue;
    for (const f of e.features) {
      const set = featureOverlap.get(f) ?? new Set<string>();
      for (const g of e.features) if (g !== f) set.add(g);
      featureOverlap.set(f, set);
    }
  }

  const featuresDir = join(outputRoot, 'features');
  if (write !== false) mkdirSync(featuresDir, { recursive: true });

  const docs: FeatureDoc[] = [];
  for (const [slug, entries] of byFeature) {
    const meta = taxonomyBySlug.get(slug);
    const displayName = meta?.displayName ?? slug;
    const hotPathCount = entries.filter((e) => e.hotPath).length;
    const sharedWith = [...(featureOverlap.get(slug) ?? new Set())].sort();
    const risk: FeatureDoc['risk'] = hotPathCount > 0
      ? 'high'
      : entries.length >= 15 || sharedWith.length >= 3
        ? 'medium'
        : 'low';

    const text = renderFeatureDoc({
      slug,
      displayName,
      entries,
      slugByKey,
      hotPathCount,
      sharedWith,
      risk,
    });
    const path = join(featuresDir, `${slug}.md`);
    if (write !== false) writeIfChanged(path, text);
    docs.push({
      slug, displayName, functionCount: entries.length, risk, hotPathCount, sharedWith, path, text,
    });
  }

  // Shared-dependency hot spots — functions in ≥ 3 features.
  const sharedHotspots: { slug: string; features: string[] }[] = [];
  for (const e of inventory) {
    if (e.features.length >= 3) {
      const slug = slugByKey.get(entryKey(e.file, e.name));
      if (slug) sharedHotspots.push({ slug, features: [...e.features] });
    }
  }
  sharedHotspots.sort((a, b) => b.features.length - a.features.length);

  const indexText = renderFeaturesIndex(docs, sharedHotspots, taxonomy);
  const indexPath = join(featuresDir, '_features-index.md');
  if (write !== false) writeIfChanged(indexPath, indexText);

  return { docs, indexPath, indexText, sharedHotspots };
}

function renderFeatureDoc(args: {
  slug: string;
  displayName: string;
  entries: ClassifiedEntry[];
  slugByKey: Map<string, string>;
  hotPathCount: number;
  sharedWith: string[];
  risk: FeatureDoc['risk'];
}): string {
  const { slug, displayName, entries, slugByKey, hotPathCount, sharedWith, risk } = args;
  const slugs = entries
    .map((e) => slugByKey.get(entryKey(e.file, e.name)))
    .filter((s): s is string => !!s)
    .sort();
  const hotSlugs = entries
    .filter((e) => e.hotPath)
    .map((e) => slugByKey.get(entryKey(e.file, e.name)))
    .filter((s): s is string => !!s);

  const lines: string[] = [];
  lines.push('---');
  lines.push('type: feature-overview');
  lines.push(`slug: ${slug}`);
  lines.push(`risk: ${risk}`);
  lines.push(`function-count: ${entries.length}`);
  lines.push(`shared-with: [${sharedWith.join(', ')}]`);
  lines.push('---');
  lines.push(`# ${displayName}`);
  lines.push('');
  lines.push(`> ${displayName} aggregates ${entries.length} function${entries.length === 1 ? '' : 's'} across the codebase. <!-- TODO: replace with feature narrative -->`);
  lines.push('');

  if (hotPathCount > 0) {
    lines.push('## Entry points');
    for (const s of hotSlugs) lines.push(`- [[${s}]] — hot path`);
    lines.push('');
  }

  lines.push(`## All functions (${slugs.length})`);
  for (const s of slugs) lines.push(`- [[${s}]]`);
  lines.push('');

  // Shared dependencies — functions in this feature that also appear in others.
  const sharedRows: string[] = [];
  for (const e of entries) {
    if (e.features.length < 2) continue;
    const s = slugByKey.get(entryKey(e.file, e.name));
    if (!s) continue;
    const others = e.features.filter((f) => f !== slug);
    sharedRows.push(`| [[${s}]] | ${others.join(', ')} |`);
  }
  if (sharedRows.length > 0) {
    lines.push('## Shared dependencies');
    lines.push('');
    lines.push('| Function | Also used by |');
    lines.push('|---|---|');
    for (const r of sharedRows) lines.push(r);
    lines.push('');
  }

  if (hotPathCount > 0) {
    lines.push('## ⚠️ Performance warning');
    lines.push('');
    lines.push(`${hotPathCount} function${hotPathCount === 1 ? '' : 's'} in this feature run in hot-path callbacks. Allocations or synchronous computation added inside them directly degrade scroll and render performance.`);
    lines.push('');
  }

  if (sharedWith.length > 0) {
    lines.push('## Related features');
    for (const f of sharedWith) lines.push(`- [[features/${f}]]`);
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

function renderFeaturesIndex(
  docs: FeatureDoc[],
  sharedHotspots: { slug: string; features: string[] }[],
  taxonomy: FeatureTaxonomyEntry[],
): string {
  // Preserve taxonomy order for the table; fall back to alpha for unknown feats.
  const taxonomyOrder = new Map(taxonomy.map((t, i) => [t.slug, i]));
  const sorted = [...docs].sort((a, b) => {
    const ai = taxonomyOrder.get(a.slug) ?? 9999;
    const bi = taxonomyOrder.get(b.slug) ?? 9999;
    if (ai !== bi) return ai - bi;
    return a.slug.localeCompare(b.slug);
  });

  const lines: string[] = [];
  lines.push('# Features Index');
  lines.push('');
  lines.push('Master taxonomy of user-facing features. Each slug is used in the `features:` frontmatter field of function docs and as the filename of the corresponding feature doc. See [[_index]] for the project overview.');
  lines.push('');
  lines.push('---');
  lines.push('');
  if (sorted.length === 0) {
    lines.push('_No features declared yet. Add a `featureTaxonomy` block to `code-doc-builder.config.json` to start grouping functions by user-facing behaviour._');
    lines.push('');
  } else {
    lines.push('## Feature list');
    lines.push('');
    lines.push('| Slug | User-facing name | Feature doc | Risk |');
    lines.push('|---|---|---|---|');
    for (const d of sorted) {
      lines.push(`| \`${d.slug}\` | ${d.displayName} | [[features/${d.slug}]] | ${d.risk} (${d.functionCount} fn${d.functionCount === 1 ? '' : 's'}${d.hotPathCount > 0 ? `, ${d.hotPathCount} hot-path` : ''}) |`);
    }
    lines.push('');
  }

  if (sharedHotspots.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Shared-dependency hot spots');
    lines.push('');
    lines.push(`Functions assigned to 3+ features are the highest-risk change targets:`);
    lines.push('');
    const seen = new Set<string>();
    for (const h of sharedHotspots) {
      if (seen.has(h.slug)) continue;
      seen.add(h.slug);
      lines.push(`- [[${h.slug}]] — ${h.features.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}
