# code-documentation-builder

A Claude Code plugin that builds a Karpathy-style LLM-wiki under `documentation/` for any TypeScript / TSX project. One Markdown node per function with YAML frontmatter, `[[wikilinks]]` for the call graph, plus feature / module overview docs, hub files, and audit scripts. The vault is byte-deterministic — running `/doc-build` twice on an unchanged project produces zero file diffs.

---

## Why

Code is a graph. Functions call each other; features touch multiple modules; hot-path callbacks ripple through the rest of the codebase. A wiki vault that mirrors this graph, one node per function, lets both humans and LLM agents do impact analysis without reading every file. Karpathy described the pattern at <https://aimaker.substack.com/p/llm-wiki-obsidian-knowledge-base-andrej-karphaty> — this plugin generates and maintains that vault.

---

## What you get

For every function in your project:

- `documentation/<slug>.md` — frontmatter (`source-file`, `module`, `type`, `features`, `called-by`, `hot-path`) + body skeleton (Origin · Signature · Behaviour TODO · Called by · Calls).

Plus, derived from the inventory + call graph:

- `documentation/features/<slug>.md` — one per feature, with risk level, entry points, all functions, shared dependencies, performance warning for hot-path-touching features.
- `documentation/modules/<slug>.md` — one per module, with the real-disk file tree, key functions bucketed by type, features served.
- `documentation/_schema.md` — frontmatter spec with the type / module enums actually used in this project.
- `documentation/_index.md` — master entry point: architecture, start-here-by-intent, top lifecycle functions (by incoming edges), hot-path callbacks, features table, modules table.
- `documentation/_CHECKLIST.md` — every function under `[x]`, grouped by root-class methods / locals / project inventory.
- `documentation/manual-work-docs.md` — outstanding LLM-enrichment tasks + a `## Quality — needs review` block stamped by the auto-fixer when it can't resolve a Karpathy rule failure.
- `documentation/audit-links.mjs` — broken-wikilink checker; pre-populated with no parameters.
- `documentation/audit-quality.mjs` — Karpathy R1 / R2 / R3 / R4 spot-check; `TARGETS` auto-populated with hot-path docs + shared-dep hotspots + top-N most-linked.

---

## Install

```bash
git clone https://github.com/<you>/code-documentation-builder.git
cd code-documentation-builder
npm install
npm run build
```

Requirements: **Node ≥ 20**, **TypeScript 5.4**.

Add the plugin to your Claude Code workspace via `claude plugin add <path-to-this-repo>` (or symlink into `.claude/plugins/`).

---

## Quick start

From any TypeScript / TSX project:

```bash
# One-shot build — discover → classify → graph → generate → link → aggregate → audit → quality.
npm run build:vault -- /path/to/your-project --config /path/to/code-doc-builder.config.json

# Or from inside Claude Code:
/doc-build
```

Outputs to `<project>/documentation/`. The build runs in a few seconds for ~700 functions (host project: 721 functions in ~1.1 s).

### Config

Optional. Without a config, the plugin uses generic defaults. Project-specific knowledge (feature taxonomy, hot-path patterns, module map overrides) goes in `code-doc-builder.config.json`:

```json
{
  "moduleMap": {
    "src/modules/ganttChart/": "ganttChart"
  },
  "featureTaxonomy": [
    {
      "slug": "pdf-export",
      "displayName": "PDF Export",
      "pathPatterns": ["/pdf-service/"],
      "hintPatterns": ["\\bpdf[A-Z]", "exportPdf"]
    }
  ],
  "hotPathPatterns": [
    "queryCellInfo",
    "rowDataBound"
  ],
  "slugPrefixRules": [
    { "filePattern": "/callbacks/", "prefix": "gantt-callback" }
  ]
}
```

See [examples/powerbi-gantt.config.json](examples/powerbi-gantt.config.json) for a full real-world example (20 features, 9 hot-path patterns).

---

## Slash commands

All five live under [commands/](commands/) — invoke from Claude Code:

| Command | What it does |
|---|---|
| `/doc-build` | Full pipeline. Flags: `--regenerate`, `--config`, `--output`, `--dry-run`. |
| `/doc-update <target>` | Refresh one function's doc; cascades `called-by` to neighbours. `--enrich` invokes the LLM body writer. |
| `/doc-audit` | Read-only. Runs both audit scripts; summarises Check A-D + R1 / R2 / R3 / R4. |
| `/doc-promote <slug>` | Promotes a function cluster into a new feature overview. |
| `/doc-status` | Counts, coverage, last-build timestamp, manual backlog. |

---

## Subagents

Seven specialists under [agents/](agents/), each with a narrow tool set:

- `inventory-scanner` — fresh AST scan, sanity-check.
- `function-doc-writer` — rewrites Behaviour + Side effects for ONE doc; preserves R1/R3/R4.
- `feature-aggregator` — refreshes ONE feature doc; LLM-writes the pipeline narrative.
- `module-aggregator` — refreshes ONE module doc.
- `link-resolver` — idempotent re-pass: rebuilds `called-by`, R2 + R3 fallbacks.
- `quality-auditor` — read-only Karpathy verdict; recommends the right fix agent.
- `hot-path-flagger` — narrow-scope R4 insertion.

---

## Skill

[skills/doc-keep-in-sync/](skills/doc-keep-in-sync/) — fires on `src/**/*.{ts,tsx}` edits to enforce that every code change ships with a matching doc update. Excludes tests, fixtures, `.d.ts`.

---

## Hooks (opt-in)

```bash
./hooks/install.sh
```

Installs:
- `pre-commit` — refuses to commit `src/` changes without any `documentation/` changes.
- `post-commit` — runs `audit-links.mjs` and warns if the commit introduced broken wikilinks.

Bypass with `git commit --no-verify` when you mean it.

---

## CLI scripts (direct, no Claude Code)

Every stage has a standalone CLI for scripting / CI. Run with `npm run <name> -- <projectRoot> [flags]`:

| Script | Phase | Purpose |
|---|---|---|
| `discover` | 1 | AST scan → `inventory.json`. |
| `classify` | 2 | Tag module / type / features / hot-path. |
| `graph` | 3 | Build call graph; report coverage. |
| `verify` | 2 | Cross-check classified output against an existing reference vault. |
| `generate` | 4 | Per-function .md generation. |
| `link` | 5 | Cross-link resolution (idempotent re-pass). |
| `aggregate` | 6 + 7 | Feature / module docs + hub files. |
| `audit` | 8 | Install + run both audit scripts. |
| `build:vault` | 0–11 | Full orchestrated build with drift detection + quality loop. |

---

## How it stays correct

- **Byte-determinism.** Every writer is idempotent (`write-if-changed` helper). Running `build:vault` twice on an unchanged project produces zero file diffs — proven by `diff -r` and SHA-256 dir hash in the test suite.
- **Drift detection.** Each run compares the new inventory against the cached one. Added / removed / renamed / moved / updated / unchanged are tracked separately; renames/removals delete the stale slug files before regeneration so orphans don't accumulate.
- **R1 / R3 / R4 by construction.** The deterministic Phase 4 skeleton guarantees Karpathy invariants without LLM input: first body line is always `- **File:**` (fact-first); every doc has at least one outgoing link via Called by / Calls or a § Related fallback; hot-path docs auto-include the `⚠️ HOT PATH` block.
- **Quality enforcement loop.** After generation, the in-process auditor checks every doc; the deterministic auto-fixer addresses failures; anything still failing gets stamped `quality: needs-review` in the frontmatter and added to `manual-work-docs.md` for human / LLM review.
- **Reference-vault parity.** Verified end-to-end on a 721-function Power BI custom visual project. See [examples/powerbi-gantt.config.json](examples/powerbi-gantt.config.json).

---

## Sample output

A 5-function fixture project lives under [examples/sample-fixture/](examples/sample-fixture/). Run:

```bash
npm run build:vault -- examples/sample-fixture --output examples/sample-fixture/documentation
```

The pre-built output is committed under [examples/sample-fixture/documentation/](examples/sample-fixture/documentation/) — it's the easiest place to see what a vault actually looks like without building one yourself. See [examples/sample-fixture/README.md](examples/sample-fixture/README.md) for the walkthrough.

---

## Extending

See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Adding a custom feature taxonomy entry.
- Adding a project-specific slug prefix rule.
- Adding a new Karpathy rule to the auditor + auto-fixer.
- Adding a new subagent.
- Adding a new slash command.

---

## Architecture

[architecture.md](architecture.md) walks through the full pipeline, components, and the AI-value rationale.

## Implementation history

[implementation.md](implementation.md) — phase-by-phase build log with decisions, edge cases, and gate verifications.

---

## License

MIT.
