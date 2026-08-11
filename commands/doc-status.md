---
description: Report current documentation state — counts, coverage, audit verdict, outstanding manual enrichment items. Read-only, fast.
allowed-tools: Read, Bash, Glob
---

# /doc-status

Print a concise snapshot of the vault. Read-only.

## Arguments

- `--output <dir>` — vault directory. Defaults to `<projectRoot>/documentation/`.

## What to report

Run six numbered sections, one short paragraph or table each:

### 1. Vault counts

Glob `<output>/*.md`, `<output>/features/*.md`, `<output>/modules/*.md`. Report:

- Total function docs (excluding `features/`, `modules/`, and underscore-prefixed hubs)
- Feature docs
- Module docs
- Hub files present (`_schema.md`, `_index.md`, `_CHECKLIST.md`, `manual-work-docs.md`)

### 2. Hot-path coverage

Count docs with `hot-path: true` in frontmatter. Verify each has a `⚠️ **HOT PATH**` block in the body (R4).

### 3. Last build timestamp

`stat -c %y` (or PowerShell `(Get-Item ...).LastWriteTime`) on `<output>/_index.md`. Surface the timestamp.

### 4. Audit verdict

If `<output>/audit-links.mjs` and `<output>/audit-quality.mjs` exist, run both and parse:

- Broken wikilinks count
- R1 / R3 / R4 fail counts
- TARGETS audited count

If either script is missing, surface "audit scripts not installed — run [/doc-build](doc-build.md) or `npm run audit -- … --no-run`".

### 5. Outstanding manual items

Parse `<output>/manual-work-docs.md`. List the unchecked `[ ]` Phase markers and their TODO counts.

Also grep across function docs for `<!-- TODO -->` markers and count them. This is the LLM enrichment backlog.

### 6. Drift signals

- Inventory size vs disk file count. If `inventory.json` has N entries but `<output>/*.md` has more or fewer, the vault is out of sync with the source — run [/doc-build](doc-build.md).
- `_CHECKLIST.md` `[ ]` lines (auto-generated as `[x]` — any unchecked is a manual edit that needs reconciliation).

## Output shape

```
📊 Vault status — <output>

  Function docs   : 721
  Feature docs    : 20
  Module docs     : 26
  Hubs            : ✅ all four present
  Hot-path docs   : 10 / 10 R4 ✅
  Last build      : 2026-05-21 17:04
  Audits          : 0 broken / 0 R1 / 0 R3 / 0 R4 (13 targets)
  Manual backlog  : 4 phases · 768 TODO markers
  Drift           : none
```

## What you do NOT do

- You do NOT trigger a rebuild. Suggest [/doc-build](doc-build.md) if drift is detected.
- You do NOT modify any file.
