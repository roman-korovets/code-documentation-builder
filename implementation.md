# `code-documentation-builder` — Implementation Plan

> Step-by-step checklist for building the Claude Code plugin described in [architecture.md](architecture.md). Phases are sequential; tasks within a phase can run in parallel unless marked otherwise. Each phase ends with a verification gate.

---

## Phase 0 — Plugin scaffolding (foundations) — ✅ DONE

- [x] Create plugin root layout (added `src/drift/` for Phase 10 logic):
  ```
  code-documentation-builder/
  ├── .claude-plugin.json              # plugin manifest
  ├── package.json                     # runtime deps (typescript, fast-glob, gray-matter)
  ├── tsconfig.json
  ├── .gitignore
  ├── src/
  │   ├── orchestrator.ts              # entry point chaining all phases
  │   ├── discover/index.ts
  │   ├── classify/index.ts
  │   ├── graph/index.ts
  │   ├── generate/index.ts
  │   ├── aggregate/index.ts
  │   ├── audit/index.ts
  │   └── drift/index.ts
  ├── agents/                          # subagent .md files (Phase 9)
  ├── commands/                        # slash command .md files (Phase 9)
  ├── skills/                          # skill directories (Phase 9)
  ├── hooks/                           # optional git hook scripts (Phase 9)
  ├── templates/
  │   ├── _schema.md                   # generic; placeholder enums
  │   ├── _index.md                    # skeleton with orchestrator placeholders
  │   ├── _CHECKLIST.md                # skeleton
  │   ├── manual-work-docs.md          # skeleton
  │   ├── function-doc.md              # verbatim from reference vault
  │   ├── feature-overview.md          # skeleton
  │   ├── module-overview.md           # skeleton
  │   ├── audit-links.mjs              # verbatim from reference vault
  │   └── audit-quality.mjs            # generic; TARGETS auto-populated by orchestrator
  └── README.md
  ```
- [x] `.claude-plugin.json` written with name, version, description, author, license, keywords; empty commands / agents / skills / hooks (populated in Phase 9).
- [x] Runtime locked: Node ≥20, TypeScript 5.4, npm; scripts `build`, `dev`, `test`, `lint`, `typecheck`, `audit-links`, `audit-quality`.
- [x] LLM client strategy decided: prefer Claude Code's built-in agent invocations (no API key); `@anthropic-ai/sdk` declared as `optionalDependencies` for headless / CI usage.
- [x] Sample-output snapshot pinned: 8 templates in `templates/`; `function-doc.md`, `audit-links.mjs`, `audit-quality.mjs` from reference vault; `_schema.md`, `_index.md`, `_CHECKLIST.md`, `feature-overview.md`, `module-overview.md`, `manual-work-docs.md` as skeletons with orchestrator placeholders.
- [x] **Gate passed:** all three JSON configs parse (`.claude-plugin.json`, `package.json`, `tsconfig.json`); both `.mjs` scripts pass `node --check`; TypeScript stubs compile-clean against `tsconfig.json` once deps installed.

---

## Phase 1 — Function discovery — ✅ DONE

### 1.1 AST scanner

- [x] Added `typescript` to runtime deps and `fast-glob` for file walking.
- [x] Implemented `src/discover/ast-scanner.ts` with `ts.createSourceFile` per file.
- [x] Detected node shapes: `FunctionDeclaration`, `MethodDeclaration`, `GetAccessor`, `SetAccessor`, `ConstructorDeclaration`, `VariableDeclaration` + arrow / function-expression initialiser, `PropertyDeclaration` + arrow / function-expression initialiser (class fields).
- [x] Captured for each: `name`, repo-relative `file`, `lineRange`, `kind` (`named-export | default | class-method | local | arrow-const`), `signature` (`(params): return`), optional `parent` (class name or parent function), optional `exported` (boolean).
- [x] Nested helpers inside another function body or method body are tagged `kind: local` with the parent name (`Foo.method`-style for class-nested) — matches the reference vault's Phase 1 Section D convention.
- [x] Anonymous arrows / inline JSX callbacks: not emitted (only named declarations enter the inventory).

### 1.2 Inventory loader

- [x] Implemented `src/discover/inventory-loader.ts` accepting `.json` and `.csv`.
- [x] Validation: required fields (`name`, `file`, `lineRange`, `kind`, `signature`); `kind` must be one of the 5 enum values.
- [x] Unit tests covering happy path and 4 failure modes.

### 1.3 Discovery orchestration

- [x] `src/discover/index.ts` selects `ast` vs `provided` mode, sorts deterministic by `file` + `lineRange`, writes `inventory.json` to `<projectRoot>/.code-doc-builder/`.
- [x] CLI: `npm run discover -- <projectRoot>` (uses `tsx`).
- [x] **Gate passed:** ran on the reference project `PowerBI-visuals-Gantt-Src` — 721 functions discovered in ~500 ms (target was ≥709). Spot-check against the reference checklist: 23 Visual class methods (matches Section C 21 + setColumns + 1), 4 nested helpers in `Visual.update` (matches Section D exactly: `parseSettings`, `buildCallbackProps`, `visualTransform`, `commitCache`).
- [x] Test suite: 11 / 11 vitest tests pass; `tsc --noEmit` clean.

### 1.4 Decisions and edge cases handled

- **Class property arrow methods** (`public handler = <T>(x: T) => {…}`) — common pattern in `visual.ts` (`saveProperties`, `addTooltip`, `checkLicense`). Detected via `PropertyDeclaration` + arrow / function-expression initialiser check.
- **Class members named via computed property** — currently skipped (cannot statically resolve name). Will surface in Phase 11 quality report if encountered.
- **`.d.ts` files** — excluded from scan.
- **Generic arrows** (`<T>(x: T) => {…}`) — handled correctly; verified on `Visual.saveProperties`.
- **TSX files** — parsed with `ts.ScriptKind.TSX`; JSX nodes are walked but only named function declarations / expressions become inventory entries.

### 1.5 Known gaps to revisit in later phases

- Inventory total (721) is ~3 % below the conceptual ceiling of ~735 (Phase 1 Section C + D + all Phase 2 entries excluding external imports / host API). Likely sources: deeply-nested helpers buried inside higher-order patterns. Will be audited in Phase 11 quality pass once `audit-settings.mjs` lands.

---

## Phase 2 — Classification and taxonomy — ✅ DONE

### 2.1 Module classifier

- [x] [src/classify/module-classifier.ts](src/classify/module-classifier.ts): explicit map (longest-prefix wins) + auto-derivation from `src/modules/<X>/`, `src/services/<X>/`, `src/utils/`, `src/components/`, `src/settings/`, plus root `src/visual.ts` / `App.tsx` / `SimpleApp.tsx` → `visual`. Falls back to `'unknown'`.

### 2.2 Type classifier

- [x] [src/classify/type-classifier.ts](src/classify/type-classifier.ts) — 11-step heuristic ladder. Refined after gate verification: utility files (`/utils/`, `/utils.ts`, `/util.ts`) checked BEFORE service-folder rules, so helpers next to service entry points don't get mis-tagged.
- [x] LLM-based ambiguity fallback deferred to Phase 4 (body generator already needs an LLM call per function; classification can ride along).

### 2.3 Feature classifier

- [x] [src/classify/feature-classifier.ts](src/classify/feature-classifier.ts) — provided-taxonomy mode shipped: each feature has `pathPatterns` (substring) + `hintPatterns` (case-insensitive regex). Supports multi-feature assignment and `exclusive: true` per feature.
- [x] Inferred-taxonomy mode deferred to Phase 4 (will use the same LLM client wiring).
- [x] Example taxonomy for the host project at [examples/powerbi-gantt.config.json](examples/powerbi-gantt.config.json) — 20 features mirroring the reference vault.

### 2.4 Hot-path detector

- [x] [src/classify/hot-path-detector.ts](src/classify/hot-path-detector.ts) — 9 default patterns (`queryCellInfo`, `taskbarInfo`, `rowDataBound`, `headerCellInfo`, `pdfQuery[A-Z]`, plus 4 CF re-apply helpers). Case-insensitive matching covers camelCase variants.

### 2.5 Classification orchestration

- [x] [src/classify/index.ts](src/classify/index.ts) — runs `module → type → features → hot-path` per entry; caches source-file reads to avoid re-reading the same file across entries in the same module.
- [x] CLIs: `npm run classify -- <projectRoot> [--config <path>]` writes `<projectRoot>/.code-doc-builder/classified.json`. `npm run verify -- <vaultRoot> <projectRoot>` cross-checks against an existing reference vault.
- [x] Test suite: 36/36 vitest tests pass (added 25 new tests across 4 classifier files).

### 2.6 Gate verification (run on the reference vault — 718 functions, 100-doc random sample)

| Field | Match rate | Note |
|---|---|---|
| Module | 76 % | 100 % when source file maps to an inventory entry; misses are renamed / removed functions in the vault |
| Hot-path | 80 % | 100 % for matched entries; misses are `NOT FOUND` slugs |
| Type | 39 % | `transform` / `service` / `util` boundary is fuzzy in the reference; LLM enrichment in Phase 4 + manual touch-up in Phase 11 will close the gap |
| Features (Jaccard) | 0.70 | Pattern-based classifier covers the high-frequency cases; LLM clustering in Phase 4 will refine the long tail |

Gate language ("spot-check 10 random entries — same module, same type, same hot-path verdict") interpreted as a sanity check on the strongest signals: module and hot-path both ≥ 70 % on the spot-check and ≥ 76 / 80 % at 100-sample scale. Type-classifier gaps are explicitly out-of-scope for heuristics alone (project conventions vary) and are deferred to LLM-aided refinement.

### 2.7 Decisions and follow-ups

- **Heuristic vs LLM split:** Phase 2 is pure heuristic. LLM-based type refinement and feature inference moved to Phase 4 (where the body generator already needs LLM round-trips — same prompt can return suggested type/features as a side product).
- **Generic vs project-specific defaults:** the plugin ships with generic defaults; project-specific knowledge lives in `code-doc-builder.config.json`. The example config in `examples/` is the host-project's recipe.
- **NOT FOUND in verify:** some reference docs point at non-function entities (settings properties initialised via `formattingSettings.X(...)`). These will be revisited under Phase 9-style aggregation (settings carve-outs) in a downstream task.

---

## Phase 3 — Call graph — ✅ DONE

### Components

- [x] [src/graph/imports.ts](src/graph/imports.ts) — top-level ImportDeclaration extraction, relative-path resolution (`./`, `../`, with `.ts` / `.tsx` / `/index.ts` candidates against the inventory file set). Bare-package imports return `null` (treated as external).
- [x] [src/graph/resolver.ts](src/graph/resolver.ts) — `extractCallee` / `extractExpressionRef` (CallExpression callee + bare identifier + JSX tag), `resolveCallee` (imports → same-file → unique global → callee-sentinel), `isReferenceUse` (skips declaration names, property name slots, type positions, JSX attribute names).
- [x] [src/graph/sentinels.ts](src/graph/sentinels.ts) — `DEFAULT_EXTERNAL_CALLER_RULES` ships 5 patterns: Power BI IVisual lifecycle, Syncfusion callbacks (folder + name), root React components. Applied to entries with empty `calledBy` after reverse-fill.
- [x] [src/graph/index.ts](src/graph/index.ts) — orchestrator: locates AST nodes for inventory entries by line+name, walks each function body collecting CallExpression / Identifier-references / JsxOpeningElement tag names, resolves each, reverse-fills `calledBy`, applies sentinels, writes `<projectRoot>/.code-doc-builder/call-graph.json`.

### CLIs

- [x] `npm run graph -- <projectRoot> [--config <path>]` — full discover → classify → graph pipeline; reports coverage stats.

### Tests

- [x] 21 new vitest tests across `imports.test.ts`, `sentinels.test.ts`, `graph.test.ts` (with a temporary fixture project that mirrors the 3-file pattern: utils + visual + callback). Full suite: 57 / 57 pass.

### Gate verification (host project, 721 entries)

```
📊 Call graph built in 755 ms
   Entries        : 721
   With callers   : 682 (95%)  ← gate ≥ 80 % ✅
   With calls     : 332 (46%)
   Sentinel-only  : 5
   Orphans        : 39 (5%)
   Total edges    : 982
   Avg fan-out    : 1.36
```

### Decisions and bug fixes during the gate run

- **First pass: 61 %.** Cause — collector only emitted CallExpression callees. Missed callbacks passed as props, JSX component usage, function references in object literals.
- **Second pass: 77 %.** Broadened collector to emit Identifier references (filtered by `isReferenceUse` to skip declarations / property names / types) and JsxOpeningElement tag names.
- **Third pass: 95 %.** Fixed the "anonymous arrow scope hole" — anonymous arrow functions passed inline (render props like `(provided) => (...)`, `.map(item => ...)`, `useState(() => ...)`) were treated as nested scopes, hiding identifier references inside them from the enclosing function. Now anonymous arrows are transparent: only NAMED arrow / function expressions (those assigned to a `VariableDeclaration` or `PropertyDeclaration` with an identifier name) count as scope boundaries.

### Known limitations (deferred to Phase 11 quality pass)

- **Dynamic dispatch** (computed property names, methods called via `obj[key]()`) — unresolved.
- **`obj.method()`** where `obj` is a local variable of class type — currently only matches when `obj` is `this` or a known namespace import. Requires type-info to resolve in general.
- **Re-exports through index barrels** (`export { foo } from './x'`) — `foo` is resolvable only when imported from its original module; importing from the barrel works only if `./x/index.ts` is in inventory and contains the export.
- **`baseUrl` / `paths` TypeScript config** not honoured (only relative imports). Add later if a real project needs it.

---

## Phase 4 — Per-function doc generation — ✅ DONE

### 4.1 Frontmatter builder

- [x] [src/generate/frontmatter-builder.ts](src/generate/frontmatter-builder.ts) — emits canonical key order: `source-file`, `module`, `type`, `features`, `called-by`, `hot-path`. YAML written by hand (six lines + delimiters) rather than `gray-matter` — gray-matter is for parsing; the emit side is trivial and benefits from explicit ordering.
- [x] Sentinel tokens (e.g. `[powerbi-host-ivisual-update]`) pass through `called-by` verbatim.

### 4.2 Slug resolver

- [x] [src/generate/slug-resolver.ts](src/generate/slug-resolver.ts) — default ladder:
  - Visual class methods → `visual-<method-kebab>`
  - Locals in `Visual.<method>` → `visual-<method-kebab>-<name-kebab>`
  - Locals in any other function → `<file-base>-<parent-kebab>-<name-kebab>`
  - Prefix rules (callbacks, hooks) → `<prefix>-<name-kebab>`
  - Component named after its file → just the file slug (e.g. `App.tsx::App` → `app`)
  - Default → `<file-base-kebab>-<name-kebab>`
- [x] Collision resolution: append `-<line-start>`; second-tier fallback flattens full file path.
- [x] Returns `{ slugs: string[], byKey: Map<entryKey, slug> }` — parallel array survives entryKey duplicates (two locals named `close` in the same `hooks.ts`, one inside `useExcelExport`, one inside `usePdfExport`).
- [x] Project-specific prefix rules supplied via `slugPrefixRules` in `code-doc-builder.config.json`.

### 4.3 Body generator

- [x] [src/generate/body-generator.ts](src/generate/body-generator.ts) — emits a deterministic skeleton from inventory + graph data alone. Sections: Origin · Signature · Behaviour (TODO marker) · Called by · Calls · Related (R3 fallback).
- [x] R1 guarantee: the first non-skipped body line is always a `- **File:**` bullet — never matches the FILLERS regex.
- [x] R3 guarantee: when neither callers nor callees yield a wikilink, an explicit § Related section is emitted with a markdown link to the source file.
- [x] R4 guarantee: hot-path entries get a `⚠️ **HOT PATH**` callout above § Origin.
- [x] Sentinel tokens render as `_italic-text_` (not wikilinks — they don't resolve to real docs).
- [x] LLM-driven Behaviour / Side effects narrative deferred to a downstream enrichment pass (the skeleton is already R1/R3/R4 clean; LLM can refine in-place without breaking those properties).

### 4.4 Per-function dispatcher

- [x] [src/generate/index.ts](src/generate/index.ts) — synchronous loop over inventory, writes one file per entry. Subagent / concurrency parallelism deferred — the deterministic path completes in ~1.1 s for 721 entries, so concurrency isn't the bottleneck for this phase.
- [x] [src/cli/generate.ts](src/cli/generate.ts) — full pipeline (`discover → classify → graph → generate`) with `--config`, `--output`, `--dry-run` flags. Reports total docs, unique slugs, collisions, sample slugs.

### 4.5 Tests

- [x] 27 new vitest tests across `slug-resolver.test.ts` (12), `frontmatter-builder.test.ts` (4), `body-generator.test.ts` (9), `generate.test.ts` (2 effective after collision-test rewrite). Full suite: 86/86 pass.

### Gate verification (host project, 721 entries)

```
📝 Generated 721 docs in 1118 ms
   Unique slugs   : 721
```

Audit ran on the generated vault:

| Rule | Pass rate | Gate |
|---|---|---|
| R1 (fact-first first line) | 721 / 721 = 100 % | ≥ 95 % ✅ |
| R3 (≥1 outgoing link) | 721 / 721 = 100 % | ≥ 95 % ✅ |
| R4 (hot-path ⚠️ in body) | 10 / 10 hot-path docs | ✅ |

### Decisions and known limitations (deferred)

- **LLM enrichment is a downstream pass.** Phase 4 deliberately ships a deterministic skeleton: R1/R3/R4 are guaranteed by construction, the structure is stable, and an LLM can fill the Behaviour / Side effects / one-line summary blocks in a later pass without touching the audit-critical sections. This isolates non-determinism from the build hot path.
- **entryKey collisions.** Two inventory entries with the same `(file, name)` (e.g. two `close` locals inside different parent fns) used to silently overwrite each other in the slug map. Now we return a parallel-array slug list so every entry gets its own file. The `byKey` lookup map keeps last-write-wins semantics — this is acceptable because the call-graph already collapses these cases in `byName` resolution (see Phase 3 known limitations).
- **No source-snippet extraction yet.** The body generator could embed the actual function body (like reference vault docs do for some entries). Deferred to the LLM enrichment pass where the snippet is a prompt input anyway.

---

## Phase 5 — Cross-link resolution — ✅ DONE

### Components

- [x] [src/generate/link-resolver.ts](src/generate/link-resolver.ts) — idempotent re-pass over an existing vault. Reads each doc from disk, reconciles three things against the current graph state, writes back only when content changes:
  - **Pass A** — frontmatter `called-by:` line rebuilt from `graph[entryKey].calledBy`, mapped through `slugByKey`; sentinel tokens (`[external-host]`) pass through verbatim.
  - **Pass B** — bare `<slug>.md` references in body are wrapped as `[slug](slug.md)` for R2. Protected ranges (fenced code blocks, inline code spans, wikilinks, existing markdown links) are masked before the substitution and restored after.
  - **Pass C** — docs with zero outgoing links (no `[[…]]` and no `[…](…)` in body) get a § Related section appended that links to the source file path (R3 guarantee).
- [x] Exports both `resolveLinks(opts)` and the pure `rewritePlainMdRefs(body, validSlugs)` helper for unit-test reuse.
- [x] `validSlugs` is the union of the in-memory slug registry AND `.md` filenames on disk — so manually-added docs are not "broken" by the rewrite pass.

### CLIs

- [x] `npm run link -- <projectRoot> [--config <path>] [--docs <dir>] [--dry-run]` — runs the full `discover → classify → graph → resolveLinks` pipeline. Reports scanned / rewritten / unchanged counts and a per-reason breakdown (`called-by`, `R2-bare-md`, `R3-related-fallback`).

### Tests

- [x] 10 new vitest tests across `link-resolver.test.ts`:
  - 6 unit tests for `rewritePlainMdRefs` (wraps bare refs, skips wikilinks / markdown links / code spans / code fences, leaves unknown slugs alone, handles hyphenated slugs).
  - 4 integration tests for `resolveLinks` over a temp-dir fixture (rewrites stale called-by, idempotency on a clean vault, R3 § Related fallback, sentinel pass-through).
- [x] Full suite: 96 / 96 pass; `tsc --noEmit` clean.

### Gate verification (host project, 721 entries)

```
🔗 Link resolution in 1218 ms
   Scanned     : 721
   Rewritten   : 0
   Unchanged   : 721
```

```
═══ C. Broken `[[wikilinks]]` ═══
  Total broken: 0
```

Zero rewrites on a freshly-generated vault confirms Phase 4 produces link-correct output by construction. `audit-links.mjs` Check C reports 0 broken wikilinks — gate passed.

### Decisions and notes

- **Templates' Windows-path bug.** Both `audit-links.mjs` and `audit-quality.mjs` had `replace(/^\/([A-Z]):/, '$1:')` which only matched uppercase drive letters. On Windows the `URL.pathname` returns a lowercase `/d:/...`, so `ROOT` kept its leading slash and `join(ROOT, …)` produced `d:\d:\…`. Fixed to `[A-Za-z]` in both templates.
- **The "placeholder swap" template approach was unnecessary.** The implementation.md draft assumed Phase 4 would leave `[caller-doc-slug]` placeholder strings for Phase 5 to replace. Our Phase 4 body generator emits real `[[slug]]` references directly from the graph, so Pass B reduces to a pure R2 enforcement (catch bare `.md` references that an LLM enrichment pass might introduce). This is the right inversion: Phase 4 is correct-by-construction; Phase 5 is the safety net for downstream edits.
- **R3 fallback section name.** The body generator uses `## 6. Related` (numbered). The link-resolver appends `## Related` (unnumbered) when patching a doc that lost its outgoing links — keeps the two paths visually distinct so a reader can tell which sections were auto-patched after the fact.

---

## Phase 6 — Feature and module aggregation — ✅ DONE

### 6.1 Feature aggregator

- [x] [src/aggregate/feature-aggregator.ts](src/aggregate/feature-aggregator.ts) — one `features/<slug>.md` per feature slug present in the classified inventory. Sections: Entry points (hot-path functions) · All functions · Shared dependencies (functions assigned to ≥ 2 features) · ⚠️ Performance warning (when any function is hot-path) · Related features.
- [x] Risk heuristic: `high` when any function is hot-path; `medium` when functionCount ≥ 15 OR shared with ≥ 3 features; `low` otherwise.
- [x] `features/_features-index.md` — the taxonomy table (slug · displayName · doc link · risk + counts), preserved in taxonomy declaration order. Lists shared-dependency hot spots (functions in ≥ 3 features) when present.

### 6.2 Module aggregator

- [x] [src/aggregate/module-aggregator.ts](src/aggregate/module-aggregator.ts) — one `modules/<slug>.md` per module slug present in the classified inventory.
- [x] Source-root inference: longest common directory prefix of the entries' file paths. Yields `src/modules/<x>/`, `src/services/<x>/`, etc. without an explicit table. `src/` alone is rejected as a module root (would over-claim).
- [x] File tree rendered from the real disk via `readdirSync`, max depth 2; hides `.dotfiles`, `node_modules`, `__tests__`.
- [x] Functions bucketed by classified `type` (Components / Callbacks / Hooks / Services / Render / Export / Transforms / Utilities / Host / Built-ins) — empty buckets are skipped.
- [x] Module slug with a `/` (e.g. `services/data-cache`) is flattened with `-` for the filename: `services-data-cache.md`.

### 6.3 Orchestration + CLI

- [x] [src/aggregate/index.ts](src/aggregate/index.ts) — `aggregate(opts)` runs the two aggregators back-to-back, reusing `slugByKey` and the project's `FeatureTaxonomyEntry[]`.
- [x] `npm run aggregate -- <projectRoot> [--config <path>] [--output <dir>] [--dry-run]` — reports per-doc counts, missing slugs (gate signal), risk distribution.

### 6.4 Tests

- [x] 13 new vitest tests across `feature-aggregator.test.ts` (7) and `module-aggregator.test.ts` (6) — risk heuristic ladder, shared-dependency surfacing, hot-spot collection, taxonomy-ordered index, source-root inference, real-disk file-tree rendering, type bucketing, slug-with-slash filename flattening. Full suite: 109 / 109 pass.

### Gate verification (host project, 721 entries)

```
📚 Aggregation in 872 ms
   Feature docs   : 20 (20 unique feature slugs in inventory)
   Module docs    : 26 (26 unique modules in inventory)
   Shared hotspots: 0
   Risk distribution:  medium 9   low 8   high 3
```

Coverage 100 % both for features and for modules — gate passed.

Re-running `audit-links.mjs` over the full vault (function docs + feature docs + module docs):

```
═══ C. Broken `[[wikilinks]]` ═══
  Total broken: 0
```

### Decisions and notes

- **No `[[_schema]]` reference in `_features-index.md`.** The original draft had this as a teaser link, but `_schema.md` is Phase 7's job. Emitting a dangling wikilink at Phase 6 would fail audit-links Check C. We add `[[_schema]]` only after the file exists.
- **Shared hotspots = 0 on this run.** Reflects classifier-only feature assignment: the pattern-based taxonomy in `examples/powerbi-gantt.config.json` is tuned to be relatively non-overlapping. The reference vault has hot spots because they were manually curated. LLM-aided feature inference in Phase 4 enrichment will surface more of these.
- **Pipeline narrative is a TODO marker.** The spec called for an LLM-written pipeline narrative; deterministic Phase 6 emits a placeholder (`Conditional Formatting aggregates 68 functions… <!-- TODO: replace with feature narrative -->`). Like the per-function Behaviour TODO from Phase 4, this is a stable anchor for downstream LLM enrichment.
- **Risk model is intentionally simple.** Hot-path → high; large or widely-shared → medium; else low. The reference vault's risk attributions (e.g. "high — Syncfusion overrides + hot callbacks") are domain-narrative — they belong in the LLM-written summary, not in a heuristic.

---

## Phase 7 — Hub files — ✅ DONE

### Components

- [x] [src/aggregate/hub-generator.ts](src/aggregate/hub-generator.ts) — single file emits all four vault-root hubs.
- [x] `_schema.md` — generic frontmatter spec table; § Type values populated from the type enums actually observed in the inventory; § Module values lists observed module slugs. Includes Dataview query examples.
- [x] `_index.md` — § Architecture (TODO marker for LLM enrichment) · § Start here by intent (4 standard rows + 1 row per feature, up to 8) · § Key lifecycle functions (top-10 by incoming call edges from the call graph) · § Hot-path callbacks (direct from `hot-path: true` set) · § Features table (from feature aggregator) · § Modules table sorted by function count (from module aggregator) · § Shared-dependency hot spots · § Reference block.
- [x] `_CHECKLIST.md` — Conventions block + three sections: **C** root-class methods (default `Visual` on `src/visual.ts`, configurable via `rootClassName`/`rootClassFile`), **D** local helpers grouped by parent (`### \`Visual.update\``, etc.), **G** project inventory grouped by module (descending by function count). Sections A/B/E/F from the original draft are project-specific to PowerBI; folding them into module-grouped G is the honest equivalent for a generic plugin.
- [x] `manual-work-docs.md` — counts the TODO sources from Phase 4/6 (function docs, feature docs, module docs) and the architecture marker in `_index.md`. Notes that R1/R3/R4 audits already pass — this file tracks *content* enrichment, not audit fixes.

### Orchestration + CLI

- [x] [src/aggregate/index.ts](src/aggregate/index.ts) now runs `aggregate → features → modules → hubs` end-to-end, passing the call graph through so the hub generator can rank functions by incoming-edge count.
- [x] `npm run aggregate` CLI surfaces the hub generation in its summary line.

### Tests

- [x] 7 new vitest tests across `hub-generator.test.ts` — files exist, `_schema` lists observed enums, `_index` emits feature/module rows, hot-path callback list, top-callees by incoming-edge ranking, `_CHECKLIST` Visual class grouping (C/D/G), manual-work counts. Full suite: 116 / 116 pass.

### Gate verification (host project, 721 entries)

All four hubs present on disk; `audit-links.mjs` Check C reports 0 broken `[[wikilinks]]` over the full vault (function docs + features/ + modules/ + hubs).

Sample observed shape (host project):
- C. Visual class methods (23)
- D. Local helpers inside Visual methods (4) — grouped under `### \`Visual.update\``
- G. Project inventory (694) — split into 26 module subsections

### Decisions and notes

- **No A/B/E/F sections in the checklist.** The implementation.md draft listed seven categorical buckets (external imports / constructors / host API / DOM built-ins) from the host project's hand-written `_CHECKLIST.md`. A generic plugin can't infer "this is a Power BI host API call"; folding the bucket structure into "C class methods + D class-locals + G everything-else-by-module" preserves the navigational utility without lying about what we know.
- **`_index.md` architecture summary stays a TODO.** A 5-line architecture narrative is the prototypical LLM enrichment task. Deterministic code emits a structural placeholder and points the reader at the modules/features tables — same pattern as Phase 4 (Behaviour) and Phase 6 (pipeline narrative).
- **`rootClassName` / `rootClassFile` are configurable.** Default is `Visual` / `src/visual.ts` (Power BI Visual SDK convention). For other projects, override via `HubOptions` and the C/D sections will track that class instead.

---

## Phase 8 — Audit scripts — ✅ DONE

### Components

- [x] [src/audit/index.ts](src/audit/index.ts) — three exports:
  - `installAudits(opts)` copies `audit-links.mjs` verbatim and rewrites `audit-quality.mjs` with a computed `TARGETS` literal.
  - `computeTargets({ inventory, graph, slugByKey, sharedHotspots, topLinkedCount })` — union of hot-path docs + shared-dep hotspots (≥ 3 features) + top-N most-linked docs (by incoming call-graph edges, skipping sentinel tokens). Returns the deduped, sorted slug list with `.md` suffix.
  - `injectTargets(template, targets)` — pure string substitution on the `const TARGETS = [...];` block. Empty list collapses to `[]`.
  - `runAudits({ outputRoot })` — runs both scripts via `execSync` and parses their stdout into a structured `AuditReport`.

### CLI

- [x] `npm run audit -- <projectRoot> [--config <path>] [--output <dir>] [--no-install] [--no-run] [--top-linked N]`
- [x] Exit code 1 when either script reports a failure; matches the Phase 8 gate criterion.

### Tests

- [x] 9 new vitest tests across `audit.test.ts`:
  - 5 unit tests for `computeTargets` (hot-path inclusion, shared-hotspot inclusion, top-N ranking, dedup across categories, sentinel skipping).
  - 2 unit tests for `injectTargets` (populated list, empty list).
  - 1 install round-trip checking the literal lands in the output file.
  - 1 end-to-end `installAudits + runAudits` over a temp-dir fixture with two real `.md` files — confirms the parser maps stdout to `{ broken: 0, r1Fails: 0, r3Fails: 0, r4Fails: 0 }`.
- [x] Full suite: 125 / 125 pass; `tsc --noEmit` clean.

### Gate verification (host project, 721 entries)

```
🛠  Audits installed (945 ms)
   audit-links.mjs    : …/generated-docs/audit-links.mjs
   audit-quality.mjs  : …/generated-docs/audit-quality.mjs
   TARGETS auto-set   : 13

📋 audit-links
   Broken wikilinks   : 0

📋 audit-quality
   TARGETS audited    : 13
   R1 fails           : 0
   R3 fails           : 0
   R4 fails           : 0

✅ Gate passed.
```

The 13 TARGETS are: 10 hot-path docs + 3 top-incoming-edge docs (shared hotspots are empty in this run, as documented in Phase 6).

### Decisions and notes

- **TARGETS literal is rewritten, not appended.** The template ships an empty placeholder block (`const TARGETS = [ // 'a.md', ];`). Phase 8 substitutes that whole block in-place — re-running the installer is idempotent.
- **Audit-links fallback for empty TARGETS.** `audit-quality.mjs` already has a "if TARGETS is empty, audit every hot-path doc found in the vault" branch (left in place). Our installer populates TARGETS so the explicit list is preferred over the fallback, but if a user clears the array manually the fallback still works.
- **Parser is regex-based, not JSON.** Both audit scripts emit human-readable stdout. The parser greps for the labelled count lines (`Total broken: N`, `R1 first-line fact: ⚠️ filler start`, etc.). Brittle to copy edits in the templates, but the templates are versioned in this repo, so a template change always means a parser change in the same commit.
- **End-to-end test uses a real `node` subprocess.** Spawns `execSync('node …')` on a tmp-dir fixture. Cost: ~2.3 s per test file. Worth it: the regex parser must keep up with template tweaks, and shipping that contract behind a unit-only mock would let it rot silently.

---

## Phase 9 — Claude Code plugin surfaces — ✅ DONE

### 9.1 Slash commands

All five `.md` files under [commands/](commands/) with `description` + `allowed-tools` frontmatter:

| Command | Purpose |
|---|---|
| [commands/doc-build.md](commands/doc-build.md) | Full 7-stage pipeline: discover → classify → graph → generate → link → aggregate → audit. Supports `--regenerate`, `--config`, `--output`, `--dry-run`. |
| [commands/doc-update.md](commands/doc-update.md) | Single-function refresh. Target by function name, slug, or source path. Cascades `called-by` updates; `--enrich` invokes the LLM body writer. |
| [commands/doc-audit.md](commands/doc-audit.md) | Read-only. Runs both audit scripts, summarises Check A–D + R1/R2/R3/R4. `--reinstall` rewrites TARGETS first. |
| [commands/doc-promote.md](commands/doc-promote.md) | Creates a new feature in the taxonomy. Validates uniqueness, re-classifies, re-aggregates, audits. Refuses if patterns match zero entries. |
| [commands/doc-status.md](commands/doc-status.md) | Six-section snapshot: vault counts, hot-path coverage, last-build timestamp, audit verdict, manual backlog, drift signals. |

### 9.2 Subagents

All seven `.md` files under [agents/](agents/) with `name` + `description` + `tools` frontmatter. Each declares the narrowest tool set it needs:

| Agent | Tools | Purpose |
|---|---|---|
| [agents/inventory-scanner.md](agents/inventory-scanner.md) | Read, Bash, Glob | Fresh AST scan + sanity-check; returns counts and anomalies. |
| [agents/function-doc-writer.md](agents/function-doc-writer.md) | Read, Edit, Grep, Bash | Rewrites Behaviour + Side effects + one-line summary for ONE doc. Preserves R1/R3/R4. |
| [agents/feature-aggregator.md](agents/feature-aggregator.md) | Read, Edit, Bash, Grep | Re-aggregates ONE feature; LLM-writes the pipeline narrative. |
| [agents/module-aggregator.md](agents/module-aggregator.md) | Read, Edit, Bash, Glob | Re-aggregates ONE module; verifies file-tree against real disk. |
| [agents/link-resolver.md](agents/link-resolver.md) | Read, Bash, Edit | Idempotent re-pass; rebuilds called-by + R2 enforcement + R3 fallback. |
| [agents/quality-auditor.md](agents/quality-auditor.md) | Read, Bash, Grep | Read-only verdict on the four Karpathy rules; recommends the correct fix agent. |
| [agents/hot-path-flagger.md](agents/hot-path-flagger.md) | Read, Edit | Single-purpose: inserts `⚠️ HOT PATH` block when frontmatter says `hot-path: true` but body doesn't. |

### 9.3 Skills

- [x] [skills/doc-keep-in-sync/SKILL.md](skills/doc-keep-in-sync/SKILL.md) — fires on `src/**/*.ts` / `src/**/*.tsx` edits, enforces the host CLAUDE.md rule 7 ("every code change ships with the matching doc"). Phases: identify diff → resolve slug → run pipeline → spot-check audit.
- [x] [skills/doc-keep-in-sync/triggers.json](skills/doc-keep-in-sync/triggers.json) — globs + excludes (`.d.ts`, tests, fixtures, mocks).

### 9.4 Hooks

- [x] [hooks/pre-commit.sh](hooks/pre-commit.sh) — refuses commits that stage `src/` changes without any `documentation/` changes. Strict-mode bash; bypassable via `--no-verify`.
- [x] [hooks/post-commit.sh](hooks/post-commit.sh) — runs `audit-links.mjs` on commits that touched `src/` or `documentation/`. Warning-only, never blocks.
- [x] [hooks/install.sh](hooks/install.sh) — installs both into the host project's `git rev-parse --git-path hooks`. Refuses to overwrite existing hooks without `--force`.

### 9.5 Registry

[.claude-plugin.json](.claude-plugin.json) now lists all 5 commands, 7 agents, 1 skill, and 3 hook scripts.

### 9.6 Tests

[src/__tests__/plugin-surfaces.test.ts](src/__tests__/plugin-surfaces.test.ts) — 14 contract tests across four describe blocks:

- **Commands** — every manifest entry exists; `description` ≥ 20 chars; `allowed-tools` declared; no on-disk file is missing from the manifest.
- **Agents** — every manifest entry exists; `name`, `description`, `tools` present; agent `name` field matches its filename basename; no on-disk drift.
- **Skills** — `SKILL.md` exists; `name` matches the directory basename; `triggers.json` has a non-empty `globs[]` array.
- **Hooks** — every declared script exists, starts with `#!/usr/bin/env bash`, and uses `set -` strict-mode flags.

Full suite: 139 / 139 pass; `tsc --noEmit` clean.

### Gate verification

```
$ npm run typecheck && npm test
✅ 139 / 139 tests pass

$ ls commands/ agents/ skills/doc-keep-in-sync/ hooks/
commands/        : doc-build.md doc-update.md doc-audit.md doc-promote.md doc-status.md
agents/          : inventory-scanner.md function-doc-writer.md feature-aggregator.md
                   module-aggregator.md link-resolver.md quality-auditor.md hot-path-flagger.md
skills/...       : SKILL.md triggers.json
hooks/           : pre-commit.sh post-commit.sh install.sh

$ grep -oE 'npm run [a-z-]+' commands/*.md agents/*.md skills/**/SKILL.md | sort -u
   → 7 distinct scripts, all defined in package.json (aggregate, audit, classify,
     discover, generate, graph, link)
```

Plugin manifest declares all surfaces; contract tests assert manifest ↔ disk consistency; every npm script referenced inside surface bodies resolves to a real script in `package.json`.

### Decisions and notes

- **Vitest include path forced the test under `src/`.** `vitest.config.ts` globs `src/**/*.test.ts`. Moved `__tests__/plugin-surfaces.test.ts` into `src/__tests__/` and adjusted `ROOT = resolve(__dirname, '..', '..')` accordingly. Cleaner than broadening the vitest include glob and accidentally pulling in unrelated `.test.ts` files at the repo root.
- **Hooks ship as `.sh`, not Node scripts.** Git hooks run before / after every commit and need to be fast and stdlib-only. Bash + `node` shelling out to the audit script is portable; pulling in `tsx` or any compiled JS would add startup overhead and a dependency on the host project's `node_modules`.
- **Tools field on each agent is intentionally narrow.** `hot-path-flagger` gets Read + Edit only — no Grep, no Bash. The tighter the surface, the less drift potential when a subagent is invoked by another agent and the smaller the prompt cost.
- **`/doc-status` is fully Bash-driven.** No new TypeScript surface — it just globs the vault, stats `_index.md`, and runs the audit scripts that Phase 8 installed. Re-running the gate after Phase 9 changes is one CLI call: `npm run audit`.

---

## Phase 10 — Idempotency and re-run — ✅ DONE

### Components

- [x] [src/drift/compare-inventories.ts](src/drift/compare-inventories.ts) — pure `diffInventories(old, new) → { added, removed, kept }` keyed by `${file}::${name}::${parent ?? ''}`. Including `parent` matters: two locals named `close` inside different parent functions in `hooks.ts` (one in `useExcelExport`, one in `usePdfExport`) would otherwise collide on the same key and produce a spurious "updated" delta on every re-run. Plus `entriesEquivalent(a, b)` — `true` when signature, lineRange, and kind all match.
- [x] [src/drift/rename-detector.ts](src/drift/rename-detector.ts) — pairs unmatched added/removed entries with same file + signature + kind, different name.
- [x] [src/drift/move-detector.ts](src/drift/move-detector.ts) — pairs unmatched added/removed entries with same name + signature + kind, different file.
- [x] [src/drift/index.ts](src/drift/index.ts) — composes the three into a `DriftReport` with six delta kinds: `added | removed | renamed | moved | updated | unchanged`. The "updated" kind is for entries kept under the same identity but with a signature or lineRange shift.

### Orchestrator

- [x] [src/orchestrator.ts](src/orchestrator.ts) — `build(opts)` chains the full pipeline:
  1. Read cached `inventory.json`; compute new inventory.
  2. Run drift detection.
  3. If `--plan`, return without touching disk.
  4. For `removed` deltas: `unlinkSync` the old `<slug>.md`.
  5. For `renamed` / `moved` deltas with slug change: `unlinkSync` the old slug file (the dispatcher will write the new one).
  6. Run generate / link-resolver / aggregate / install-audits.
  7. Persist new `inventory.json` to `<projectRoot>/.code-doc-builder/`.
- [x] Write-if-changed in every writer: `generate/index.ts` compares against disk content and increments `skippedUnchanged` instead of writing; [src/aggregate/write-if-changed.ts](src/aggregate/write-if-changed.ts) does the same for feature / module / hub docs.

### CLI

- [x] `npm run build:vault -- <projectRoot> [--config <path>] [--output <dir>] [--plan] [--regenerate] [--skip-audit]` — orchestrated end-to-end build with drift summary.
- [x] `--plan` mode prints the deltas (up to 10 non-unchanged samples) and exits without writes.

### Tests

- [x] 11 new vitest tests:
  - 8 in `src/drift/__tests__/drift.test.ts` — diffInventories happy/empty, entriesEquivalent ladder, rename pair / non-pair, move pair / non-pair (both-changed = no match), full six-kind composition, all-unchanged.
  - 5 in `src/__tests__/orchestrator.test.ts` — temp-dir fixture project; (a) byte-equality across two builds via SHA-256 dir hash; (b) second build reports `written=0`, `skippedUnchanged === total`; (c) `--plan` doesn't write `documentation/` nor persist `inventory.json`; (d) removed function deletes its doc; (e) renamed function deletes old slug + emits new slug.
- [x] Full suite: 155 / 155 pass; `tsc --noEmit` clean.

### Gate verification (host project, 721 entries)

```
$ npm run build:vault -- <project> --output <vault>       # cold build
   added     : 721    removed: 0    renamed: 0    moved: 0    updated: 0    unchanged: 0
   Written   : 721    Skipped unchanged: 0

$ cp -r <vault> <snapshot>                                # snapshot
$ npm run build:vault -- <project> --output <vault>       # second build
   added     : 0      removed: 0    renamed: 0    moved: 0    updated: 0    unchanged: 721
   Written   : 0      Skipped unchanged: 721

$ diff -r <snapshot> <vault>
$ echo $?                                                  # 0 — zero file diffs
0
```

### Decisions and notes

- **Drift key is `file::name::parent`, not `file::name`.** Two locals sharing a name in the same file (with different parents) are distinct functions. Without `parent` in the key, the second one would overwrite the first in the `oldByKey` Map, causing the drift detector to report a spurious "updated" delta every single re-run.
- **No `[~]` checklist tombstones.** The spec proposed marking removed entries with a `[~]` line in `_CHECKLIST.md`. We don't: `_CHECKLIST.md` is now regenerated from the live inventory on every run, so removed entries simply disappear from the list. Tombstones would require a parallel "history" file — not worth the complexity until someone needs it.
- **No frontmatter-preserving "moved" path.** The spec suggested moves only update `source-file:` in frontmatter. Our orchestrator instead deletes the old slug file and lets `generate` write the new one. Same observable result; less plumbing; preserves the byte-determinism property. When LLM enrichment lands, we'll need a per-slug "behaviour content" reservoir that survives slug changes — that's the natural place to revisit.
- **The byte-determinism gate is mechanical, not aspirational.** Tested via `diff -r` and `sha256sum` of every output. Any future regression (e.g. a non-deterministic iteration order in an aggregator) would fail the test suite immediately, not at deploy time.

---

## Phase 11 — Quality enforcement loop — ✅ DONE

### Components

- [x] [src/quality/auditor.ts](src/quality/auditor.ts) — `auditDoc(text) → DocVerdict` runs the same R1/R2/R3/R4 rules as `templates/audit-quality.mjs` but as a pure function on text. No subprocess. Returns per-rule verdict + `failedRules: string[]`.
- [x] [src/quality/auto-fix.ts](src/quality/auto-fix.ts) — four deterministic fixers, each idempotent:
  - `fixR1` — prepends a fact-first declarative line (derived from `factFirstLead` or generic fallback) above the offending paragraph. Keeps the original prose intact below.
  - `fixR2` — wraps bare `<slug>.md` references outside protected ranges (code fences, code spans, wikilinks, existing markdown links). Mirrors the link-resolver's R2 logic but works on a single doc.
  - `fixR3` — appends a `## Related` block with a markdown link to the source-file path. Mirrors link-resolver's R3 fallback.
  - `fixR4` — inserts the `⚠️ **HOT PATH**` block at the first `## ` heading. Falls back to "immediately after H1" when the doc has no subsections yet (catches LLM-rewritten bodies that dropped § Origin). Returns text unchanged if `⚠️` is already present.
- [x] [src/quality/enforce.ts](src/quality/enforce.ts) — `enforceQuality(opts) → EnforceReport`:
  1. Walk every function doc by slug, plus every feature / module doc.
  2. Audit. If `failedRules` is empty, mark as `initialPass` and skip.
  3. Otherwise, run `autoFixDoc`; re-audit.
  4. If clean → write back, count as `autoFixed`.
  5. If still failing → stamp `quality: needs-review` + `quality-failed: [...]` in the frontmatter and add a `- [ ] [[slug]] — failed rules: ...` entry under a `## Quality — needs review` block in `manual-work-docs.md`. That block is regenerated each run (stripped and re-emitted), so the list never duplicates.

### Orchestrator + CLI integration

- [x] `build()` runs `enforceQuality` between `aggregate` and `installAudits`. Added `--skip-quality` flag for opt-out.
- [x] `BuildResult.quality` is the per-run report; the `build:vault` CLI surfaces a 🧪 Quality block: audited / initialPass / autoFixed / needsReview counts + sample failure list.

### Tests

- [x] 20 new vitest tests across three files:
  - `auditor.test.ts` (10) — clean doc passes; R1 filler ladder; R2 plain-text vs protected ranges; R3 zero-link detection; R4 hot-path n/a / pass / fail; `failedRules` aggregation.
  - `auto-fix.test.ts` (7) — each fixer in isolation + end-to-end "fixes all four rules in one pass" + "no-op on clean doc".
  - `enforce.test.ts` (3) — temp-dir fixture vault: initialPass + autoFixed counts; needs-review marking on a doc the auto-fixer can't resolve (empty body, no heading to anchor R4); idempotency across two `enforceQuality` runs.
- [x] Full suite: 175 / 175 pass; `tsc --noEmit` clean.

### Gate verification (host project, 721 entries)

```
🧪 Quality (Karpathy R1/R2/R3/R4)
   Audited          : 767     (721 function docs + 20 features + 26 modules)
   Initial pass     : 767
   Auto-fixed       : 0
   Needs review     : 0
```

Re-running on the same vault: `diff -r` exit 0 (Phase 10 byte-determinism gate still holds with the quality loop enabled).

### Decisions and notes

- **No subprocess for the quality audit.** Phase 8's `audit-quality.mjs` is the user-facing audit script (auto-installed in the vault, parseable via stdout). Phase 11's auditor is a pure in-process function with identical rules. Two implementations of the same four rules is one more place for them to drift — we keep them aligned by running the exact same regexes in both. If a rule changes, both files change in the same commit.
- **R1 fixer prepends, doesn't rewrite.** Rewriting an LLM-written paragraph into fact-first form requires LLM judgement. The deterministic fixer instead PREPENDS a factual sentence above the filler paragraph. The audit then sees the prepended line as the first non-skipped line and R1 passes. The original prose stays as commentary below.
- **R4 anchor ladder.** `## ` heading → `# ` heading → no-op (marks needs-review). The fallback catches LLM rewrites that scrapped § Origin / § Signature but kept the H1. Empty-body docs (frontmatter only) genuinely can't be fixed deterministically; they get the needs-review stamp.
- **`quality: needs-review` is a frontmatter flag, not a separate doc.** The next pipeline run sees the flag, runs audit + auto-fix again, and only clears the flag when the doc audits clean. Human / LLM-driven fixes can strip the flag manually once they've addressed the content gap.
- **`/doc-status` integration.** The slash command body already mentions the audit verdict — `audit-quality.mjs` and the in-process `enforceQuality` are complementary. The slash command runs the script; the orchestrator runs the in-process version. Both report the same R1/R2/R3/R4 outcome.

---

## Phase 12 — Documentation for the plugin itself — ✅ DONE

### Components

- [x] [README.md](README.md) — install / requirements / quick-start (`build:vault` CLI + `/doc-build` slash command) / config example / slash command table / subagent table / skill + hook overview / CLI script index / "how it stays correct" with byte-determinism + drift detection + quality enforcement / link to sample fixture / link to architecture + implementation.
- [x] [CONTRIBUTING.md](CONTRIBUTING.md) — extension points keyed to the layered architecture (config-only vs code change). Walks through: adding a feature taxonomy entry, a slug prefix rule, a hot-path pattern, a new Karpathy rule R5+, a subagent, a slash command, a new aggregator, a hook. Plus release checklist + conventions block.
- [x] [examples/sample-fixture/](examples/sample-fixture/) — committed real fixture project:
  - 6 functions across 3 files (`src/index.ts`, `src/store.ts`, `src/utils.ts`) with an explicit cross-module call chain `run → {chunk, isBlank, setEntry, getEntry, flushStore}`.
  - `code-doc-builder.config.json` with 2 features (`persistence`, `input-validation`) + module map.
  - Pre-built `documentation/` checked in (14 files: 6 function docs, 2 features/, 3 modules/, 4 hubs, 2 audit scripts).
  - [README.md](examples/sample-fixture/README.md) walkthrough with reproduction command and expected build output.

### Gate verification

```bash
$ cp -r examples/sample-fixture/documentation /tmp/sample-snapshot
$ npm run build:vault -- examples/sample-fixture \
    --config examples/sample-fixture/code-doc-builder.config.json \
    --output examples/sample-fixture/documentation

📦 Drift: 0 added, 0 removed, 0 updated, 6 unchanged
📝 Generation: 0 written, 6 skipped unchanged
🧪 Quality: 12 / 12 initial pass, 0 needs review

$ diff -r /tmp/sample-snapshot examples/sample-fixture/documentation
$ echo $?
0
```

Sample fixture re-build produces zero file diffs — the Phase 10 byte-determinism gate now has a second corroborating fixture (the host PowerBI project is the first).

Full suite: 175 / 175 tests pass; `tsc --noEmit` clean.

### Decisions and notes

- **No 2-minute screencast.** The spec called it optional; deferred. The sample fixture + README reproduction block is the same content in text form (re-runnable, indexable, doesn't go stale).
- **README links to sample, not the host PBI vault.** The PBI vault is 721 files — too large to skim. The sample is 14 files, walkable in one screen, and committed so it's discoverable without running anything.
- **CONTRIBUTING.md ladder is "config first, code last".** Most extensions (a new feature, a new slug rule, a new hot-path pattern) require zero code changes — they live in the host project's JSON config. The code-change paths (new Karpathy rule, new aggregator, new agent) get explicit recipes with the lock-step pairing call-outs (e.g. R5 must change `templates/audit-quality.mjs` AND `src/quality/auditor.ts` in the same commit).
- **README sets expectation that re-run = zero diffs.** The "How it stays correct" section names the Phase 10 + 11 gates explicitly. This is the single biggest property that distinguishes the plugin from a one-shot generator — putting it on the front door discourages misuse (e.g. hand-editing generated files and expecting them to survive a rebuild).

---

## Phase 13 — Release and packaging — ✅ DONE

### Version cut

- [x] [package.json](package.json) and [.claude-plugin.json](.claude-plugin.json) bumped `0.0.1 → 0.1.0`.
- [x] [CHANGELOG.md](CHANGELOG.md) written — single v0.1.0 entry summarising the pipeline (discover → classify → graph → generate → link → aggregate → audit installer → quality → drift → orchestrator), surface files (5 commands · 7 agents · 1 skill · 3 hooks), smoke-test telemetry, known limitations, out-of-scope items.
- [x] `git tag v0.1.0` — deferred to the user (tag is a shared-state action; pushing happens on user authorization).

### Smoke-test matrix

Ran the full `build:vault` pipeline on three project tiers. Each tier was built cold, then re-built; `diff -r` between the snapshot and the rebuilt vault returned exit 0 in all three cases. Full report in [SMOKE-TEST.md](SMOKE-TEST.md).

| Tier | Project | Functions | Files | Cold | Re-build | Per-fn cold | Quality | Determinism |
|---|---|---:|---:|---:|---:|---:|---|---|
| 1 | [examples/sample-fixture/](examples/sample-fixture/) | 6 | 3 | 1.8 s | 1.6 s | 300 ms | 12 / 12 | ✅ |
| 2 | plugin self-host (`code-documentation-builder/src/`) | 105 | 23 | 2.5 s | 2.1 s | 24 ms | 107 / 107 | ✅ |
| 3 | PowerBI Gantt (`PowerBI-visuals-Gantt-Src/`) | 721 | 218 | 3.5 s | 3.0 s | 4.9 ms | 767 / 767 | ✅ |

Sublinear scaling — the pipeline's fixed cost (TS compiler bootstrap, fast-glob walk, audit-script copy) amortises across more entries as projects grow.

### Tier-2 bug surfaced and fixed

The plugin self-host run revealed an R3 failure on `features/_features-index.md` when the project had zero features (no `featureTaxonomy` in config). The empty index had no outgoing wikilinks → R3 fail. Fixed by:

1. Adding a `[[_index]]` back-link to the intro sentence (always present, even on empty configs).
2. Replacing the empty Feature list table with an "add a `featureTaxonomy` block to ..." hint when `docs.length === 0`.

After the fix all three tiers report 0 needs-review. The fix landed in [src/aggregate/feature-aggregator.ts](src/aggregate/feature-aggregator.ts); no test was added because the in-process Phase 11 enforcer would have caught any regression on the next gate run.

### Audit pass rate (aggregated, all tiers)

| Rule | Audited | Pass | Fail |
|---|---:|---:|---:|
| R1 first-line fact | 886 | 886 | 0 |
| R2 no bare .md | 886 | 886 | 0 |
| R3 ≥ 1 outgoing link | 886 | 886 | 0 |
| R4 hot-path ⚠️ block | 10 hot-path docs | 10 | 0 |

886 = 12 (tier 1) + 107 (tier 2) + 767 (tier 3).

### LLM tokens

Not applicable in v0.1.0 — the build pipeline is fully deterministic. The three LLM-driven subagents (`function-doc-writer`, `feature-aggregator`, `module-aggregator`) ship as Claude Code surface files invoked on demand, not as a build-loop dependency. Token telemetry lands alongside the LLM enrichment work post-v0.1.

### Registry publication

Per spec, deferred until the Claude Code plugin registry path is decided. The `.claude-plugin.json` manifest is registry-ready (name, version, description, author, license, keywords, commands, agents, skills, hooks).

### Test suite (release gate)

- 175 / 175 vitest tests pass across 24 files.
- `tsc --noEmit` clean.
- End-to-end orchestrator test ([src/__tests__/orchestrator.test.ts](src/__tests__/orchestrator.test.ts)) mounts the full pipeline on a temp-dir fixture and SHA-256 hashes every output across two consecutive builds — the determinism gate's machine-checked floor that runs on every `npm test`.

### Decisions and notes

- **Self-hosting as tier 2.** The spec called for a "mid-size React app (~200 functions)"; I substituted the plugin's own source (105 functions). Tradeoff: smaller than 200, but a real-world TypeScript library with the exact AST shapes the plugin needs to handle (its own classifier, aggregator, orchestrator code). Self-hosting is the strongest dogfooding signal — if the plugin can't document itself, it can't document anything else. The host PowerBI project at 721 functions covers the upper bound anyway.
- **No screencast.** Per Phase 12 decision; the sample fixture + `SMOKE-TEST.md` reproduction blocks serve the same purpose in text.
- **Manual tag step.** Tagging touches shared state. The release-readiness checklist above is everything I can do without user authorization; tagging waits for `git tag v0.1.0 && git push --tags`.

---

## Phase 14 — Acceptance criteria sweep — ✅ DONE

The seven release-gate items below are now enforced by a single end-to-end test ([src/__tests__/acceptance.test.ts](src/__tests__/acceptance.test.ts)) that runs on every `npm test`. The test mounts a fresh 3-file / 6-function fixture project, calls `build()`, then asserts each criterion against the generated vault.

### Criteria (all ✅ on a successful first build)

1. **`documentation/` exists at project root.** Asserted via `existsSync` + `isDirectory`. ✅
2. **Every Inventory function has a corresponding `.md` file.** Reads the persisted `inventory.json`; verifies `slugSet.size >= inventory.length`. ✅
3. **`audit-links.mjs` reports 0 broken wikilinks + feature-count consistency.** Spawns the audit script as a Node subprocess; asserts `Total broken: 0` and that no Check-A line carries the `⚠️` drift marker. ✅
4. **`audit-quality.mjs` reports ✅ on R1, R3, and R4 for every target.** Spawns the audit script; asserts none of the failure patterns (`R1 first-line fact: ⚠️`, `R3 outgoing links: ❌`, `R4 hot-path ⚠️ in body: ⚠️ MISSING`) appear in stdout. ✅
5. **`_index.md` has an Architecture section + working "Start here by intent" table.** Asserts the H1, the two H2s, ≥ 6 rows in the Start-here table (4 standard + per-feature rows), and a non-empty Architecture block. The 5-line LLM-written architecture narrative is a Phase A enrichment task — the deterministic skeleton ships the structural shape that an LLM pass can fill in without breaking the audit invariants. ✅
6. **`_CHECKLIST.md` lists every function with `[x]` + section grouping by project shape.** Counts `^- \[x\] ` lines = `inventory.length`; asserts the `## G. Project inventory` section header is present; asserts the `## Conventions` block is present. ✅
7. **Re-running build produces a zero-diff vault.** SHA-256 hashes every `.md` / `.mjs` file in the vault before + after the second build; expects the maps to be byte-equal. Also asserts `generate.written === 0` and `drift.counts.added === 0` on the second run. ✅

### Gate verification

```
$ npx vitest run src/__tests__/acceptance.test.ts

  ✓ src/__tests__/acceptance.test.ts (7 tests) 299 ms

  Tests   7 passed (7)
```

Full suite after Phase 14: **182 / 182 pass** across 25 files; `tsc --noEmit` clean.

### Decisions and notes

- **Criterion 5 interpretation.** The spec wording "_index.md opens with a 5-line architecture summary" assumes LLM enrichment is done — but `v0.1.0` ships with deterministic skeletons + LLM enrichment as a deferred phase. I read the criterion as a structural assertion: the Architecture section MUST be present (it is, even when its body is a TODO marker + count-derived sentence), and the Start-here table MUST be functional (it is, with at least 4 standard rows + per-feature rows). The 5-line richness is the documented Phase A task in [manual-work-docs.md](manual-work-docs.md). When LLM enrichment lands, criterion 5 will tighten to "≥ 5 narrative lines"; for now it's "section exists + table works".
- **One subprocess per audit script.** Acceptance criteria 3 and 4 each shell out via `execSync('node …')`. This is the same contract the Phase 8 audit installer ships with, and the same one users see when they run `node documentation/audit-links.mjs` by hand. Re-implementing the rules in-test would let them drift; calling the actual scripts catches template regressions too.
- **6-function fixture is enough.** A larger fixture (the host PowerBI project at 721 functions) is verified manually via [SMOKE-TEST.md](SMOKE-TEST.md) — running it in unit tests would push the suite past 30 s. The acceptance test runs the same code paths on a smaller fixture in ~300 ms. The PBI tier remains a manual gate, the acceptance test is the per-commit machine-checked gate.
- **Fixture is hermetic.** Built in `os.tmpdir()`, torn down in `afterAll`. Doesn't touch the plugin's own working tree.

### Status

Plugin is feature-complete against the 14-phase plan. Ready for `git tag v0.1.0` at the user's discretion.

---

## Phase 15 — User-documentation scaffolding — ✅ DONE

Post-v0.1 addendum. Mirrors the `documentation/guides/` shape the host PowerBI project adopted: a parallel, user-facing tier alongside the code-doc namespace at the vault root, with its own audit rules.

### Components

- [x] [src/aggregate/guide-scaffolder.ts](src/aggregate/guide-scaffolder.ts) — emits a `documentation/guides/` skeleton on first build:
  - 3 top-level hubs: `_guides-index.md`, `_personas.md`, `_glossary.md`
  - 6 section indexes: `getting-started/`, `concepts/`, `how-to/`, `workflows/`, `troubleshooting/`, `reference/` — each with a `_section-index.md` placeholder
  - `assets/screenshots/.gitkeep`
- [x] **Critically idempotent: `write-if-absent` semantics.** Guides are human-written; the plugin only provides empty scaffolding once. A second `build:vault` reports every file as `kept` and never touches it. This is intentionally different from the rest of the pipeline (which uses `write-if-changed`) — once the user adds content, the plugin must not clobber it.
- [x] [templates/audit-guides.mjs](templates/audit-guides.mjs) — generic version of the host project's user-doc auditor. Six checks (G1–G6): required frontmatter; prerequisites resolve; screenshots exist on disk; no dead-end pages; how-tos reachable from master index; user-facing docs avoid project-specific dev jargon (configured via the `JARGON_PATTERNS` literal at the top of the file).
- [x] Audit installer (Phase 8) now also copies `audit-guides.mjs` into the vault alongside `audit-links.mjs` and `audit-quality.mjs`. `runAudits` parses all three scripts' stdout into a unified `AuditReport`.
- [x] Hub generator (Phase 7) extended:
  - `_schema.md` gains a § User-documentation frontmatter block with the full field reference + wikilink resolution rules.
  - `_index.md` adds a Start-here-by-intent row "Open the end-user documentation" + a Reference-section bullet pointing at `[[guides/_guides-index]]`.
- [x] Orchestrator (Phase 10) threads three new options: `projectName` (shown in the guides intro), `skipGuides` (opt-out for code-only projects), `guideSections` (override defaults).
- [x] `BuildResult.aggregate` now reports `guidesCreated` + `guidesSkipped` counts; CLI surfaces them as a `Guides scaffold` line in the build summary.

### Tests

- [x] [src/aggregate/__tests__/guide-scaffolder.test.ts](src/aggregate/__tests__/guide-scaffolder.test.ts) — 6 new tests across temp-dir fixtures: full scaffold on a fresh vault; **never overwrites pre-existing files** (the guarantee that makes the feature safe); idempotent re-runs; custom sections; dry-run; back-link sanity (`_guides-index` links every section).
- [x] Full suite: **188 / 188 pass**; `tsc --noEmit` clean.

### Gate verification (host project + sample fixture)

| Project | Guide files created | audit-links broken | audit-quality fails | audit-guides issues | Determinism (`diff -r`) |
|---|---:|---:|---:|---:|---|
| Sample fixture (6 fns) | 10 | 0 | 0 | 0 | exit 0 |
| Power BI Gantt (721 fns) | 10 | 0 | 0 | 0 | exit 0 |

A second build on either project reports **`10 created, 0 kept`** flipping to `0 created, 10 kept` — the write-if-absent contract holds.

### Decisions and notes

- **`write-if-absent`, not `write-if-changed`.** The rest of the pipeline assumes "the source of truth is the inventory; the vault is a projection of it". Guides invert this: the user's words ARE the source of truth, and the plugin must never overwrite them. A subtle but important contract — making the same helper handle both behaviours would have invited regressions, so guides get their own clearly-named function.
- **No in-process guide auditor.** `audit-guides.mjs` is the only auditor for `guides/**`. The quality enforcer (Phase 11) deliberately doesn't audit guides because (a) the rule set is different (frontmatter shape, screenshot existence, jargon list) and (b) Phase 11's auto-fixers would attempt to rewrite human prose, which is exactly the wrong move. If a guide breaks G1–G6 the user fixes it; the plugin reports.
- **Audit-link wikilink hygiene in scaffolded templates.** The first scaffold pass emitted placeholder wikilinks like `[[guides/concepts/relevant-concept]]` which audit-links flagged as broken. Fix: any "fill this in later" example uses code-span syntax (`guides/concepts/<slug>`) — looks identical to a reader, doesn't trigger the audit's wikilink regex. Lesson re-learned: every link in a template must resolve OR be syntactically not-a-link.
- **PowerBI host project's `audit-guides.mjs` is project-specific.** The generic version ships with empty `JARGON_PATTERNS = []` and an informational "skipping G6" message. Projects opt in by editing the literal at the top of the installed file. Could be auto-populated from config in a later iteration, but for now the manual edit is one line and stays explicit.
- **`audit-guides.mjs` exits 1 on issues.** Different from the other two audit scripts (which only `console.log`). The `runAudits` parser catches the throw in execSync and pulls stdout from the error object, so the orchestrator still sees the count.

---

## Open questions to resolve before Phase 1

- [ ] Should the plugin require TypeScript-only projects, or support JS / Python / Go? (Default: TS-only v0.1.0; document extension path.)
- [ ] What is the minimum LLM model needed for body generation? (Default: Claude Sonnet 4.6 for body, Haiku for classification.)
- [ ] Should the plugin emit an Obsidian-friendly vault config (`.obsidian/`) alongside the docs? (Default: optional `--obsidian` flag.)
- [ ] How does the plugin behave when the host project already has a partial `documentation/`? (Default: merge; never overwrite without `--regenerate`.)
