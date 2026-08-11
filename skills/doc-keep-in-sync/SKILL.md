---
name: doc-keep-in-sync
description: Use when the user edits any `src/` source file that has a corresponding doc in `documentation/`. Refreshes the doc's Origin/Signature blocks and called-by reverse edges so the vault stays in sync with code changes inside the same commit.
---

# doc-keep-in-sync

This skill enforces the host project's CLAUDE.md rule 7 — every code change in `src/` must ship with the matching doc update in the same commit.

## When this fires

Triggered on edits to files under `src/`. The exact glob list lives in [triggers.json](triggers.json):

- `src/**/*.ts`
- `src/**/*.tsx`

## When NOT to use this skill

- Pure stylistic refactors (rename a local variable, add a comment) that don't change the function's signature, behaviour, or call graph. The doc body would not meaningfully change.
- Test edits (`__tests__/**`). Tests don't have function docs.
- Generated files (anything under `.code-doc-builder/` or `dist/`).
- The user explicitly says "no doc update" or "doc is stale, leave it" — respect their judgement.

## Phase 1 — Identify what changed

For each edited TS / TSX file:

1. Read the diff (Bash: `git diff --unified=0 <file>` or compare against `HEAD`).
2. Classify each hunk:
   - **Signature change** (params, return type, generics): doc Origin / Signature must refresh.
   - **Behaviour change** (added / removed branch, mutated assignment, new call): doc Behaviour and Calls sections drift; flag for `function-doc-writer` enrichment.
   - **New function added**: needs a new doc file (route to [doc-build](../../commands/doc-build.md) — incremental mode).
   - **Function deleted**: doc must be removed and backlinks scrubbed.
   - **Renamed function**: slug changes; old doc orphaned (route to [doc-update](../../commands/doc-update.md) with the rename heuristic).

## Phase 2 — Determine the slug

The slug derivation rules live in `src/generate/slug-resolver.ts`. The short version:

- Class methods on `src/visual.ts` → `visual-<method-kebab>`
- Locals inside `Visual.<method>` → `visual-<method-kebab>-<helper-kebab>`
- Locals inside any other function → `<file-base>-<parent-kebab>-<helper-kebab>`
- Files matching `prefixRules` (e.g. `/callbacks/`, `/hooks/`) → `<prefix>-<name-kebab>`
- Otherwise → `<file-base-kebab>-<name-kebab>`

If you can't compute the slug confidently, run `npm run discover -- <projectRoot>` and look up the entry in the resulting JSON.

## Phase 3 — Refresh the doc

Always go through the pipeline. Never edit `documentation/*.md` by hand from this skill:

1. Run `npm run generate -- <projectRoot> --output documentation` to refresh the Origin / Signature / Called by / Calls blocks for the changed entry. The deterministic skeleton preserves any LLM-written Behaviour section as long as the file already exists.
2. Run `npm run link -- <projectRoot> --docs documentation` to rebuild `called-by:` reverse edges on neighbours.
3. If the diff included a signature or behaviour change, optionally invoke the [function-doc-writer](../../agents/function-doc-writer.md) subagent to refresh the Behaviour narrative.

## Phase 4 — Spot-check the audit

Before reporting back, run `node documentation/audit-links.mjs` Check C. If it reports broken wikilinks, the rename heuristic missed something — surface the broken targets and stop.

## What you return

A two-paragraph summary:

```
Updated N doc(s) for M source edits in <file>:
  - visual-update.md (Signature refreshed)
  - visual-update-parse-settings.md (Calls section updated)

audit-links Check C: 0 broken. Diff is ready for commit.
```

If the user's edit added a new function with no doc, recommend `/doc-build` and stop.
