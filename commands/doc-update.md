---
description: Refresh a single function's documentation file when its source changed. Pass the function name, slug, or source file path. Cascades updates to neighbours so called-by edges stay consistent.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# /doc-update

Update the documentation for one function (or one file's worth of functions) without rebuilding the whole vault.

## Arguments

- `<target>` — function name (`Visual.update`), slug (`visual-update`), or source path (`src/visual.ts`).
- `--enrich` — invoke the `function-doc-writer` subagent to fill in the Behaviour / Side effects / one-line summary blocks (LLM enrichment pass). Without this flag the refresh is deterministic only.
- `--no-cascade` — skip the neighbours' called-by rebuild. Use only when you know the call graph is unchanged.

## Workflow

1. **Resolve target.** Map the argument to an `entryKey` (file::name):
   - If it's a path, list every entry in that file.
   - If it's a slug, reverse-look it up via the slug map.
   - If it's a function name, search the inventory; if ambiguous, list candidates and stop.
2. **Re-run discover + classify on the single file.** Use the incremental cache. If the file no longer parses, surface the syntax error.
3. **Refresh the doc file.** Re-emit frontmatter (the `called-by` slot will be rebuilt by step 5), refresh the Origin and Signature blocks, leave Behaviour intact unless `--enrich` is set.
4. **Update neighbours.** For every doc that previously listed the target in `called-by:` or `calls:`, re-run the link-resolver (`npm run link`) so the call-graph reverse edges stay coherent. Skip if `--no-cascade`.
5. **Run targeted audits.** Spot-check the touched docs against `audit-quality.mjs` (R1 / R3 / R4) and `audit-links.mjs` (broken wikilinks). Report failures.

## Edge cases

- **Function renamed.** The slug changes. Old file becomes orphaned — delete it explicitly and run [link-resolver](../agents/link-resolver.md) to scrub stale `[[old-slug]]` references.
- **Function deleted from source.** Remove the doc file and run the link-resolver. Append a `[~]` entry to `_CHECKLIST.md` (Phase 10 idempotency convention).
- **Function moved between files.** Only `source-file:` in frontmatter changes; slug derivation may also change (file-base prefix differs). Treat as rename if the slug differs.

## What you do NOT do

- You do NOT touch other docs unless the cascade step requires it.
- You do NOT rewrite the architecture summary in `_index.md` (that's [doc-build](doc-build.md)).
- You do NOT promote orphan functions into feature docs — that is [doc-promote](doc-promote.md).
