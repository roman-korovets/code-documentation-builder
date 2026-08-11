# Sample fixture — 6 functions, 3 files

A minimal project that demonstrates the plugin's output without the overhead of a real codebase. Six named exports across three TypeScript files, with one explicit cross-module call chain:

```
run (index.ts) ─┬→ chunk (utils.ts)
                ├→ isBlank (utils.ts)
                ├→ setEntry (store.ts) ──┐
                ├→ getEntry (store.ts) ──┴→ (Map mutations)
                └→ flushStore (store.ts)
```

## Source

| File | Functions | Module slug |
|---|---|---|
| `src/index.ts` | `run` | `app` |
| `src/store.ts` | `setEntry`, `getEntry`, `flushStore` | `store` |
| `src/utils.ts` | `isBlank`, `chunk` | `utils` |

## Config

[code-doc-builder.config.json](code-doc-builder.config.json) declares:
- A `moduleMap` that pins each source file to a logical module.
- Two features (`persistence`, `input-validation`) with path and hint patterns.
- No hot-path patterns — this fixture has no render-loop callbacks.

## Reproduce

From the plugin repo root:

```bash
rm -rf examples/sample-fixture/documentation examples/sample-fixture/.code-doc-builder
npm run build:vault -- examples/sample-fixture \
  --config examples/sample-fixture/code-doc-builder.config.json \
  --output examples/sample-fixture/documentation
```

Expected output:

```
📦 Drift summary
   added     : 6
   unchanged : 0

📝 Generation
   Written          : 6
   Skipped unchanged: 0

📚 Aggregates
   Features         : 2  (persistence, input-validation)
   Modules          : 3  (app, store, utils)

🧪 Quality
   Audited          : 12  (6 function + 2 feature + 3 module + 1 stray; hubs are not audited)
   Initial pass     : 12
   Auto-fixed       : 0
   Needs review     : 0
```

## Output shape

After building, the [documentation/](documentation/) directory contains:

```
documentation/
├── _CHECKLIST.md              # All 6 entries with [x] links.
├── _index.md                  # Start-here, top-incoming, features + modules tables.
├── _schema.md                 # Frontmatter spec.
├── manual-work-docs.md        # Enrichment backlog (6 function · 2 feature · 3 module TODOs).
├── audit-links.mjs            # Pre-populated; no parameters.
├── audit-quality.mjs          # TARGETS populated (no hot-path here, so just top-linked).
├── index-run.md               # `run` — the orchestrator.
├── store-set-entry.md         # `setEntry`, etc.
├── store-get-entry.md
├── store-flush-store.md
├── utils-is-blank.md
├── utils-chunk.md
├── features/
│   ├── _features-index.md
│   ├── persistence.md
│   └── input-validation.md
└── modules/
    ├── app.md
    ├── store.md
    └── utils.md
```

## What to look at first

1. [documentation/_index.md](documentation/_index.md) — the human + LLM entry point. Shows the architecture stub, start-here-by-intent, and module table.
2. [documentation/index-run.md](documentation/index-run.md) — a function doc with a full Calls section.
3. [documentation/store-set-entry.md](documentation/store-set-entry.md) — a function doc with non-trivial `called-by` (used by `run`) and a single-feature assignment.
4. [documentation/features/persistence.md](documentation/features/persistence.md) — feature aggregate; lists its three function members and a shared-deps table.
5. [documentation/modules/store.md](documentation/modules/store.md) — module aggregate with the on-disk file tree.

## Verifying determinism

```bash
cp -r examples/sample-fixture/documentation /tmp/sample-snapshot
npm run build:vault -- examples/sample-fixture \
  --config examples/sample-fixture/code-doc-builder.config.json \
  --output examples/sample-fixture/documentation
diff -r /tmp/sample-snapshot examples/sample-fixture/documentation
# → exit 0; zero file diffs.
```

Phase 10 byte-determinism in action.
