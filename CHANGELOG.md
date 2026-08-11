# Changelog

## v0.1.0 — 2026-05-21

First public release. Builds a Karpathy-style LLM-wiki under `documentation/` for any TypeScript / TSX project. Byte-deterministic re-runs; auto-fixing Karpathy R1 / R2 / R3 / R4 quality enforcement; drift detection across builds.

### Pipeline

- **Discover** — AST scan via the TypeScript Compiler API. Detects FunctionDeclaration, MethodDeclaration, GetAccessor, SetAccessor, ConstructorDeclaration, VariableDeclaration + arrow / function-expression initialiser, PropertyDeclaration + arrow / function-expression initialiser (class fields). Locals inside class methods get `kind: local` with parent reference.
- **Classify** — eleven-step type ladder (callback / transform / render / export / component / hook / service / util / host / builtin); module map (explicit prefix table + auto-derivation); feature taxonomy (path patterns + hint regexes, multi-feature assignment); hot-path patterns (regex against name).
- **Graph** — call edges by import resolution → same-file lookup → unique global → sentinel fallback. Identifier references + JsxOpeningElement tag names + CallExpression callees all flow into edges. Anonymous arrows are transparent so render props don't hide references from the enclosing named function.
- **Generate** — deterministic per-function .md with frontmatter + Origin / Signature / Behaviour TODO / Called by / Calls. R1 / R3 / R4 guaranteed by construction. Write-if-changed; same input → same output bytes.
- **Link** — idempotent re-pass: rebuilds `called-by:` from the live graph, wraps bare `<slug>.md` (R2), appends § Related fallback (R3).
- **Aggregate** — `features/<slug>.md` + `_features-index.md` (risk levels from hot-path + size + sharing), `modules/<slug>.md` (real-disk file tree, type buckets), four hubs (`_schema.md`, `_index.md`, `_CHECKLIST.md`, `manual-work-docs.md`).
- **Audit installer** — copies `audit-links.mjs` verbatim; rewrites `audit-quality.mjs` `TARGETS` with hot-path docs + shared-dep hotspots + top-N most-linked.
- **Quality enforcement** — in-process R1 / R2 / R3 / R4 auditor; deterministic auto-fixers; stamps `quality: needs-review` + appends to `manual-work-docs.md` when auto-fix can't resolve.
- **Drift detection** — keyed by `file::name::parent`; classifies six delta kinds (added / removed / renamed / moved / updated / unchanged). Removes / renames the old slug files before regeneration so orphans don't accumulate.
- **Orchestrator** — `build()` chains everything; `--plan` dry-run; persists `inventory.json` cache for next-run drift baseline.

### Claude Code surfaces

- 5 slash commands: `/doc-build`, `/doc-update`, `/doc-audit`, `/doc-promote`, `/doc-status`.
- 7 subagents: `inventory-scanner`, `function-doc-writer`, `feature-aggregator`, `module-aggregator`, `link-resolver`, `quality-auditor`, `hot-path-flagger`.
- 1 skill: `doc-keep-in-sync` (fires on `src/**/*.{ts,tsx}` edits).
- 3 hooks: `pre-commit`, `post-commit`, `install.sh`.

### Smoke-test telemetry (see [SMOKE-TEST.md](SMOKE-TEST.md))

| Tier | Project | Functions | Cold build | Re-build | Quality (initial pass) | Determinism |
|---|---|---:|---:|---:|---|---|
| 1 | sample-fixture | 6 | 1.8 s | 1.6 s | 12 / 12 | `diff -r` exit 0 |
| 2 | plugin self-host | 105 | 2.5 s | 2.1 s | 107 / 107 | `diff -r` exit 0 |
| 3 | PowerBI Gantt | 721 | 3.5 s | 3.0 s | 767 / 767 | `diff -r` exit 0 |

### Tests

- 175 vitest tests across 24 files, 100 % pass.
- `tsc --noEmit` clean.
- One end-to-end test mounts the orchestrator on a temp-dir fixture and SHA-256 hashes every output across two consecutive builds.

### Known limitations

- Behaviour narratives ship as `<!-- TODO -->` markers. LLM enrichment is a planned downstream pass (Phase 14 acceptance criteria item).
- Dynamic dispatch (`obj[key]()`) is not resolved by the call-graph builder.
- `tsconfig.json` `baseUrl` / `paths` are not honoured (only relative imports).
- Re-exports through barrel `index.ts` files are only resolvable when the barrel is itself in the inventory.

### Out of scope for v0.1

- Languages other than TypeScript / TSX.
- Registry publication path (deferred until the Claude Code plugin registry lands).
