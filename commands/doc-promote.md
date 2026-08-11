---
description: Promote a cluster of related functions into a new feature overview doc. Pass the proposed feature slug. Used when classifier-driven feature assignment is too narrow.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# /doc-promote

Create a new feature in the taxonomy and assign existing function docs to it. Used when an emergent grouping (e.g. "tooltip pipeline", "selection-manager wrappers") deserves its own overview.

## Arguments

- `<slug>` — kebab-case feature slug. Validated: must be unique against `features/_features-index.md`.
- `--name "<Display Name>"` — required, user-facing name.
- `--patterns <regex>[,<regex>...]` — name / path regexes to feed into the classifier as a new `featureTaxonomy` entry.
- `--dry-run` — list which docs would be reassigned, don't write.

## Workflow

1. **Validate slug.** Read `features/_features-index.md`; if `<slug>` already appears, stop and surface the existing doc.
2. **Append to taxonomy.** Add a new `FeatureTaxonomyEntry` to the project's `code-doc-builder.config.json`:
   ```json
   {
     "slug": "<slug>",
     "displayName": "<name>",
     "hintPatterns": ["<regex-1>", "<regex-2>"]
   }
   ```
3. **Re-classify.** Run `npm run classify -- <projectRoot> --config <path>`. Count the docs newly assigned to `<slug>`. If zero, the patterns don't match — list a few candidate names from the inventory and ask the user to refine.
4. **Re-aggregate.** Run `npm run aggregate -- <projectRoot> --output <dir>`. This emits `features/<slug>.md`, refreshes `_features-index.md`, and updates every per-function doc that gained `<slug>` in its `features:` frontmatter.
5. **Run audits.** `npm run audit -- <projectRoot> --output <dir>` to confirm the new wikilinks resolve cleanly and the feature passes `audit-links.mjs` Check A (function-count consistency).

## Edge cases

- **Overlapping coverage.** The new feature may share functions with an existing feature. That is the point — shared-dep hotspots show up in `audit-links.mjs` Check D after re-aggregate.
- **No matches.** If `--patterns` matches zero inventory entries, the new feature doc would have `function-count: 0`. Refuse and ask for a better pattern.
- **Demotion.** This command does not delete features. To remove one, edit the config taxonomy and re-aggregate; the orphaned `features/<slug>.md` file is left as a tombstone — delete it explicitly.

## What you do NOT do

- You do NOT promote a single function. A feature with one member is documentation noise — keep the function in its module overview.
- You do NOT rewrite the per-function `features:` frontmatter directly. Always go through classify → aggregate.
