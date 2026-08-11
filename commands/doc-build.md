---
description: Run the full documentation build pipeline — discover → classify → graph → generate function docs → resolve cross-links → aggregate features + modules + hubs → install audit scripts. Pass `--regenerate` to force body rewrites on unchanged source.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# /doc-build

Build the Karpathy-style documentation vault from scratch for the current project. The pipeline is deterministic and idempotent: a second invocation on an unchanged tree produces zero diffs.

## Arguments

- `--regenerate` — re-emit every function body even when source hasn't changed (useful after a template update).
- `--config <path>` — path to a project-specific config file. Defaults to `code-doc-builder.config.json` at project root.
- `--output <dir>` — vault output directory. Defaults to `<projectRoot>/documentation/`.
- `--dry-run` — compute everything but don't write files.

## Pipeline

Run in order; each stage must succeed before the next:

1. **Discover** — `npm run discover -- <projectRoot>` walks the TS/TSX sources, emits `<projectRoot>/.code-doc-builder/inventory.json`.
2. **Classify** — `npm run classify -- <projectRoot> [--config <path>]` assigns module / type / features / hot-path to every entry. Writes `classified.json` to the same cache directory.
3. **Graph** — `npm run graph -- <projectRoot>` resolves call edges and writes `call-graph.json`. Reports coverage stats (target ≥ 80 %, current 95 % on the reference project).
4. **Generate per-function docs** — `npm run generate -- <projectRoot> --output <dir>` emits one `.md` per inventory entry. Each file ships with valid frontmatter and an R1/R3/R4-clean skeleton (Behaviour block is a `<!-- TODO -->` marker for downstream LLM enrichment).
5. **Resolve cross-links** — `npm run link -- <projectRoot> --docs <dir>` is idempotent. Use this after manual edits to rebuild `called-by:` and wrap any bare `<slug>.md` references.
6. **Aggregate** — `npm run aggregate -- <projectRoot> --output <dir>` produces `features/<slug>.md`, `modules/<slug>.md`, plus the four hubs (`_schema.md`, `_index.md`, `_CHECKLIST.md`, `manual-work-docs.md`).
7. **Install audit scripts** — `npm run audit -- <projectRoot> --output <dir>` copies `audit-links.mjs` verbatim and rewrites `audit-quality.mjs` with a computed TARGETS list (hot-path + shared-dep hotspots + top-N most-linked). The command also executes both audits and exits non-zero on failure.

## Reporting

After each stage print a single summary line — counts, timing, and the cache path. After the whole pipeline:

- Total docs generated
- Feature docs / module docs counts
- Hub files present
- Audit verdict (broken wikilinks count, R1/R3/R4 fail counts)

If the audit verdict is non-clean, surface the offending slugs and stop. Do not proceed to commit.

## What you do NOT do

- You do NOT touch any `.md` file by hand. Every edit goes through the pipeline.
- You do NOT update the `<!-- TODO -->` markers — that is the [doc-update](doc-update.md) job.
- You do NOT push commits. Surface the diff and let the user decide.
