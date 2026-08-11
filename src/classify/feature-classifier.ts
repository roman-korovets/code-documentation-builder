// Feature classifier — assigns one or more feature slugs to an inventory entry.
//
// Two modes:
//   - Provided taxonomy: explicit slug + hint patterns (regex or substring).
//   - Inferred taxonomy: TODO (LLM clustering — deferred to Phase 4 wiring).
//
// A function can be assigned to multiple features (e.g. a hot-path callback that
// participates in conditional-formatting + milestones + data-legend).

import type { InventoryEntry } from '../discover/index.js';

export interface FeatureTaxonomyEntry {
  slug: string;
  displayName?: string;
  /** Substring matches against file path (case-sensitive). */
  pathPatterns?: string[];
  /** Regex source strings, tested case-insensitively against `file + name + parent`. */
  hintPatterns?: string[];
  /** When true, this feature is exclusive: matching skips later checks. Useful for narrow categories. */
  exclusive?: boolean;
}

export interface FeatureClassifyOptions {
  taxonomy: FeatureTaxonomyEntry[];
}

export function classifyFeatures(entry: InventoryEntry, opts: FeatureClassifyOptions): string[] {
  const file = entry.file.replace(/\\/g, '/');
  const haystack = `${file} ${entry.name} ${entry.parent ?? ''}`.toLowerCase();
  const out: string[] = [];

  for (const feature of opts.taxonomy) {
    let matched = false;

    if (feature.pathPatterns) {
      for (const p of feature.pathPatterns) {
        if (file.includes(p)) {
          matched = true;
          break;
        }
      }
    }

    if (!matched && feature.hintPatterns) {
      for (const p of feature.hintPatterns) {
        try {
          if (new RegExp(p, 'i').test(haystack)) {
            matched = true;
            break;
          }
        } catch {
          // Invalid regex — fall back to substring.
          if (haystack.includes(p.toLowerCase())) {
            matched = true;
            break;
          }
        }
      }
    }

    if (matched) {
      out.push(feature.slug);
      if (feature.exclusive) break;
    }
  }

  return out;
}
