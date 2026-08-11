# `code-documentation-builder` — Architecture

> A Claude Code plugin that ingests a function inventory of a target project and produces a Karpathy-style LLM-wiki under `documentation/`: one Markdown node per function, YAML frontmatter for metadata, `[[wikilinks]]` for the graph, plus feature / module overview docs, master index, schema, audit scripts, and quality gates.
>
> The output is shaped after the reference vault in `d:/Work/GANTT/project/PowerBI-visuals-Gantt-Src/documentation/` (768 docs, 20 features, 10 modules, Karpathy quality rules R1–R4).

---

## 1. Goals and non-goals

### Goals

1. From a list of `{file, function, signature}` produce a self-consistent `documentation/` vault that a fresh LLM agent can navigate cold.
2. Populate forward and backward edges of the call graph (`called-by:` and outgoing `[[wikilinks]]`) so that impact analysis is one hop away.
3. Flag hot-path callbacks with `hot-path: true` and a body-level ⚠️ warning.
4. Be idempotent and re-runnable: a second pass on an evolved codebase produces a diff, not a rewrite.
5. Provide audit scripts (`audit-links.mjs`, `audit-quality.mjs`) the project keeps using after the initial build.
6. Be a normal Claude Code plugin — installable, packaged with skills, subagents, slash commands, and optional hooks.

### Non-goals

- Not a static-analysis tool. Function discovery may use AST parsing as input, but the doc generation itself is LLM-driven.
- Not a language server. No real-time updates while typing.
- Not opinionated about test frameworks, bundlers, or build systems.
- Not a general code-summarizer. The output schema is fixed (Karpathy LLM-wiki).

---

## 2. Inputs and outputs

### Inputs

| Input | Source | Required |
|---|---|---|
| Project root path | CLI arg or `cwd` | yes |
| Function inventory | JSON / CSV file OR fresh AST scan | yes |
| Feature taxonomy | optional config; else inferred from folder structure + LLM clustering | no |
| Skip list | optional config (paths / globs to exclude) | no |
| Hot-path heuristics | optional config (regex on function name / file path) | no |

A function inventory entry has the shape:

```json
{
  "name": "queryCellInfoEvent",
  "file": "src/modules/ganttChart/callbacks/queryCellInfo.ts",
  "line-range": "21-248",
  "kind": "named-export",
  "signature": "({ args, ganttRef, ... }) => void"
}
```

### Outputs

```
<project-root>/documentation/
├── _schema.md                # frontmatter spec (generated, editable)
├── _index.md                 # master entry point
├── _CHECKLIST.md             # all functions enumerated, [x] when doc written
├── _templates/
│   └── function-doc.md       # canonical body skeleton
├── <slug>.md                 # one per function (kebab-case)
├── features/
│   ├── _features-index.md
│   └── <feature-slug>.md     # one per feature
├── modules/
│   └── <module-slug>.md      # one per module
├── audit-links.mjs           # count / orphan / broken-link / shared-deps check
├── audit-quality.mjs         # Karpathy R1–R4 rule check
└── manual-work-docs.md       # outstanding manual enrichment items
```

---

## 3. Pipeline overview

```
┌─────────────────────┐
│ 0. Discover         │  AST parse OR ingest provided inventory
│   functions         │  → { name, file, line-range, kind, signature }[]
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ 1. Classify         │  Assign module (path-based) + type (LLM/heuristic)
│   each function     │  + initial features (folder-based) + hot-path flag
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ 2. Build call graph │  Static scan of import + identifier references
│                     │  → callers[name] = [callerNames]
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ 3. Generate per-fn  │  Per function: frontmatter (from classification +
│   .md files         │  call graph) + body (LLM with source snippet)
└──────────┬──────────┘                 + filename = kebab-case slug
           │
┌──────────▼──────────┐
│ 4. Cross-link pass  │  Resolve [[wikilinks]] against generated slugs;
│                     │  fill called-by from call graph; rewrite refs to
│                     │  existing slugs.
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ 5. Aggregate        │  Build features/<slug>.md from cluster of fns
│   features/modules  │  with same `features:` entry; build modules/*
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ 6. Build hubs       │  _index.md (architecture in 5 lines,
│                     │  "start here by intent", hot-path callbacks,
│                     │  shared-dep hot spots); _CHECKLIST.md;
│                     │  _schema.md; manual-work-docs.md.
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ 7. Emit audit       │  Copy audit-links.mjs + audit-quality.mjs from
│   scripts           │  bundled templates; parameterise TARGETS.
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ 8. Run audits       │  Execute both scripts; fix automated issues
│                     │  (counts, broken links); list remainder in
│                     │  manual-work-docs.md.
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ 9. Report           │  Stats: N docs, M orphans, K hot-paths, L
│                     │  shared-deps, P drift, build duration.
└─────────────────────┘
```

---

## 4. Component breakdown

### 4.1 Discovery (`src/discover/`)

- `ast-scanner.ts` — TypeScript Compiler API; walks source, emits `{ name, file, line-range, kind, signature, callers-raw, callees-raw }`.
- `inventory-loader.ts` — accepts pre-built inventory JSON/CSV when AST scan is undesirable.
- Output is a single normalised `Inventory` object.

### 4.2 Classification (`src/classify/`)

- `module-classifier.ts` — pure path-based mapping (`src/modules/X/` → module `X`, `src/services/Y/` → `services/Y`).
- `type-classifier.ts` — heuristic + LLM; assigns `callback | transform | render | export | component | hook | service | util | host | builtin` based on file location, exports, and signature.
- `feature-classifier.ts` — LLM-aided clustering using function name + module + nearby identifiers; result is reviewed against a feature taxonomy (provided or inferred).
- `hot-path-detector.ts` — pattern match against known O(rows × cols) callback signatures + user-provided regex.

### 4.3 Call-graph builder (`src/graph/`)

- `static-resolver.ts` — second AST pass; records identifier references inside each function body and maps them to inventory entries.
- `external-caller-sentinels.ts` — produces `[powerbi-host-ivisual-update]`-style sentinels for functions called from outside the inventory (framework callbacks, host APIs).
- Output: `Map<functionSlug, { calls: slug[], calledBy: slug[] }>`.

### 4.4 Doc generator (`src/generate/`)

- `frontmatter-builder.ts` — pure: combines classification + graph into the YAML block.
- `body-generator.ts` — LLM-driven; prompt includes source snippet, signature, module context, feature membership, and a template skeleton. Output respects Karpathy R1 (fact-first first line) and R3 (≥1 outgoing wikilink).
- `slug-resolver.ts` — kebab-case rules including prefix conventions: `visual-<method>`, `cf-<fn>`, `gantt-callback-<fn>`, `gantt-hook-<fn>`, `builtin-<fn>`, `host-<fn>`, etc. Conflict resolution → append disambiguator.
- `template-renderer.ts` — fills `_templates/function-doc.md` with concrete sections.

### 4.5 Aggregator (`src/aggregate/`)

- `feature-aggregator.ts` — for each feature slug, builds `features/<slug>.md` listing entry points, runtime pipeline, all functions, shared dependencies, related features, and a ⚠️ warning when hot-path callbacks are involved.
- `module-aggregator.ts` — for each module, builds `modules/<slug>.md` describing source structure, key functions by area, features served, related modules/services.
- `hub-builder.ts` — `_index.md`, `_CHECKLIST.md`, `_schema.md`, `manual-work-docs.md`.

### 4.6 Audit (`src/audit/`)

- `link-auditor.mjs` — template for `audit-links.mjs`: feature/function count consistency, broken `[[wikilinks]]`, shared-dep hotspots (≥3 features), orphan docs.
- `quality-auditor.mjs` — template for `audit-quality.mjs`: R1 fact-first / R2 no plain-text refs / R3 outgoing links / R4 hot-path warnings.
- `drift-detector.ts` — used during build to compare a re-run against existing vault and emit a diff report.

---

## 5. Claude Code integration

The plugin packages four Claude Code surfaces:

### 5.1 Slash commands (`commands/`)

| Command | Purpose |
|---|---|
| `/doc-build` | First-time build. Discovery → classify → generate → aggregate → audit. |
| `/doc-update <function>` | Targeted refresh for one function and its neighbourhood (callers + features). |
| `/doc-audit` | Run both audit scripts and surface findings in chat. |
| `/doc-promote <feature>` | Promote a function cluster into a new feature overview doc. |
| `/doc-status` | Counts, coverage %, last-build timestamp, outstanding manual items. |

### 5.2 Subagents (`agents/`)

| Agent | Role | Tools |
|---|---|---|
| `inventory-scanner` | Runs AST scan, returns normalised Inventory. | Read, Glob, Grep, Bash |
| `function-doc-writer` | Generates one function doc with full frontmatter + body. | Read, Write, Edit |
| `feature-aggregator` | Builds one `features/<slug>.md` from its members. | Read, Write |
| `module-aggregator` | Builds one `modules/<slug>.md`. | Read, Write |
| `link-resolver` | Second-pass `called-by` + wikilink resolution across whole vault. | Read, Edit, Grep |
| `quality-auditor` | Applies Karpathy rules, reports per-doc verdict. | Read, Bash |
| `hot-path-flagger` | Inspects hot callbacks, ensures `hot-path: true` + body warning. | Read, Edit, Grep |

`function-doc-writer`, `feature-aggregator`, and `module-aggregator` are designed to run in parallel — the orchestrator dispatches them in batches.

### 5.3 Skill (`skills/doc-keep-in-sync/`)

Triggered when the host project edits source under tracked paths. Skill instructs the agent to update the corresponding function doc, refresh `called-by:` of neighbours, and re-run the relevant audit slice — same contract as rule 7 in this project's `CLAUDE.md`.

### 5.4 Hooks (optional, `hooks/`)

- `post-commit`: run `audit-links.mjs` against staged docs; warn if any broken wikilinks introduced.
- `pre-commit`: verify that every changed `src/` file has a matching doc edit in the same commit (mirrors CLAUDE.md rule 7).

---

## 6. Quality model

The plugin enforces the same four Karpathy rules used by the reference vault:

- **R1 — Fact-first first line.** Body opens with what the function does, not «This function…». A regex blocklist filters fillers (`this | the following | here | essentially | basically`).
- **R2 — No plain-text references.** All file / function references must be `[[wikilinks]]` or `[text](path)` markdown links — never bare `name.md` strings.
- **R3 — No dead ends.** Every doc has ≥1 outgoing link.
- **R4 — Hot-path warnings.** A doc with `hot-path: true` must contain a body-level ⚠️ block.

The generator targets these rules during writing; the auditor verifies them after the build; the host-project CI re-runs the auditor before any merge.

---

## 7. Idempotency and re-runs

A second `/doc-build` on an evolved project does NOT rewrite from scratch:

1. Re-discover functions → diff against existing `_CHECKLIST.md`.
2. For **added** functions: generate new docs, append to checklist, update neighbours' `called-by`.
3. For **removed** functions: delete the file, strip wikilinks from neighbours, mark checklist as `[~]` (removed).
4. For **renamed** functions: detect via signature + neighbouring fingerprint; rename file, update all backlinks.
5. For **moved** functions (file changed, signature stable): update `source-file:` frontmatter only.
6. For **unchanged** functions: skip body regeneration unless the user passes `--regenerate`. Re-resolve frontmatter (cheap).
7. Always rebuild `_index.md` and feature/module aggregates — they are deterministic from frontmatter.

A run report lists each delta with file + reason. The reference vault `_CHECKLIST.md` convention with `[ ]` / `[x]` / `[~]` markers is preserved.

---

## 8. Failure modes and defensive design

| Failure | Mitigation |
|---|---|
| Inventory entry references a non-existent file | Skip + log; surface in `manual-work-docs.md`. |
| Two functions resolve to the same slug | Append `-<module>` disambiguator; if still collision, append `-<line>`. |
| LLM body violates Karpathy rules | Auditor flags; orchestrator retries body generation once with rule reminders in prompt; if still failing, leave a TODO marker. |
| Cycle in call graph | Allowed (call cycles exist in real code); rendered as wikilinks both ways. |
| External-caller detection fails | Fall back to sentinel `[external]`; user can refine via config. |
| Re-run after major refactor produces large diff | Run in dry-run mode first (`--plan`), present user with rename / move map, await confirmation. |
| Hot-path classifier false negative | Provide manual hot-path override list in config. |

---

## 9. Configuration

A single `code-doc-builder.config.json` at project root:

```json
{
  "source": {
    "roots": ["src/"],
    "exclude": ["**/__tests__/**", "**/node_modules/**"]
  },
  "inventory": {
    "mode": "ast | provided",
    "path": "function-inventory.json"
  },
  "modules": {
    "src/modules/ganttChart/": "ganttChart",
    "src/services/excel-service/": "services/excel-service"
  },
  "features": {
    "taxonomy": "infer | provided",
    "path": "features.json"
  },
  "hot-path": {
    "patterns": [
      "queryCellInfo",
      "taskbarInfo",
      "rowDataBound",
      "headerCellInfo"
    ]
  },
  "output": {
    "root": "documentation/",
    "naming": {
      "prefixes": {
        "src/modules/conditional-formatting/": "cf-",
        "src/modules/ganttChart/callbacks/": "gantt-callback-",
        "src/modules/ganttChart/hooks/": "gantt-hook-"
      }
    }
  },
  "quality": {
    "enforce-r1": true,
    "enforce-r2": true,
    "enforce-r3": true,
    "enforce-r4": true,
    "audit-targets": [
      "<auto-pick-top-9-hot-path-and-shared-deps>"
    ]
  }
}
```

Reasonable defaults are bundled; the file is fully optional.

---

## 10. Extension points

- **Custom doc type.** Project can add new `type:` values in `_schema.md`; plugin honours them.
- **Custom audit script.** Drop a file matching `audit-*.mjs` into `documentation/`; `/doc-audit` discovers and runs it.
- **Custom aggregator.** Provide a JS module that consumes the Inventory + graph and writes additional aggregate files (e.g. `settings/<card>.md` à la Phase 9 of the host project).
- **Feature taxonomy hot-reload.** Adding a feature slug to config triggers an aggregator pass on next `/doc-build` without regenerating function bodies.

---

## 11. Why this is useful for AI-driven development

A function-per-file vault with frontmatter and wikilinks turns the codebase into a **graph the LLM can traverse instead of a flat text it has to re-read**. Three concrete payoffs:

1. **Cheap impact analysis.** «Change this option → which functions break?» becomes one `called-by:` lookup, not a full-repo grep.
2. **Pre-warned risk.** `hot-path: true` and shared-dep hotspots (≥3 features) tell the agent in advance where edits are dangerous, before it touches anything.
3. **Determinism under refactors.** When code moves, the wiki graph survives intact via the rename/move logic — the agent's mental model does not have to reboot.

The plugin's job is to produce that graph once and keep it producible on demand, so every project gets the same lift the reference vault already gives.
