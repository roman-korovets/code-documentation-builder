---
description: Run both audit scripts (audit-links.mjs and audit-quality.mjs) against the existing vault. Reports broken wikilinks and Karpathy R1 / R3 / R4 failures. No writes.
allowed-tools: Read, Bash, Glob
---

# /doc-audit

Verify the documentation vault is internally consistent. Read-only.

## Arguments

- `--output <dir>` — vault directory. Defaults to `<projectRoot>/documentation/`.
- `--reinstall` — re-rewrite `TARGETS` in `audit-quality.mjs` from the current inventory before running. Use after adding new hot-path patterns or features.

## What this runs

```bash
node <output>/audit-links.mjs
node <output>/audit-quality.mjs
```

The plugin's audit installer (`npm run audit -- <projectRoot> --output <dir> --no-run`) populates `TARGETS` with: every `hot-path: true` doc, every shared-dep hotspot (functions in ≥ 3 features), and the top-N most-linked docs.

## Reading the output

### `audit-links.mjs`

| Section | What it means |
|---|---|
| A. Feature → function count consistency | Each `features/<slug>.md` declares `function-count:`. If it disagrees with the actual count of docs assigned to that feature, the feature doc is stale — re-run aggregate. |
| B. Empty `features: []` | Docs that no feature claims. Many are valid (utility helpers, builtin wrappers). Sample lists the first 15. |
| C. Broken wikilinks | **Hard gate.** Should be 0. Sample shows up to 15 distinct broken targets. |
| D. Shared dependencies | Functions in ≥ 3 features. These are the highest-risk change targets. |

### `audit-quality.mjs`

Per-target line emitted as:

```
═══ <slug>.md 🔥 ═══
  R1 first-line fact: ✅  "actual first line ..."
  R2 truly-plain .md refs: ✅
  R3 outgoing links: ✅ N
  R4 hot-path ⚠️ in body: ✅
```

🔥 = hot-path. R4 only applies to hot-path docs. Any `⚠️` or `❌` is a fail.

## Reporting

After both scripts run, print a single block:

```
✅ audit-links: 0 broken wikilinks
✅ audit-quality: 0 R1 / 0 R3 / 0 R4 fails on N targets
```

If anything failed, list the offending docs grouped by rule and stop. Do not propose fixes — the user picks the strategy.

## What you do NOT do

- You do NOT modify any `.md` file from this command. Fixes go through [doc-update](doc-update.md) or [doc-build](doc-build.md).
- You do NOT extend the `TARGETS` list by hand. Use `--reinstall` to refresh from inventory.
