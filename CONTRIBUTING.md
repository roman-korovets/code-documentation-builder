# Contributing

This plugin is extensible at three layers: **config** (project-specific knowledge a host project supplies), **code** (new rule kinds, new aggregators), and **Claude Code surfaces** (slash commands, subagents, skills, hooks).

## Layout reminder

```
src/
├── orchestrator.ts        # build() — the full pipeline
├── discover/              # Phase 1 — AST scan → InventoryEntry[]
├── classify/              # Phase 2 — tag module / type / features / hot-path
├── graph/                 # Phase 3 — call graph
├── generate/              # Phase 4 — per-function docs + slugs + frontmatter + body
├── aggregate/             # Phase 6/7 — features + modules + hubs
├── audit/                 # Phase 8 — install audit-{links,quality}.mjs
├── quality/               # Phase 11 — in-process auditor + auto-fix + enforce
└── drift/                 # Phase 10 — diff inventories, detect renames/moves
commands/                  # Phase 9 — slash commands (.md)
agents/                    # Phase 9 — subagents (.md)
skills/                    # Phase 9 — skills (dir + SKILL.md + triggers.json)
hooks/                     # Phase 9 — git hook scripts
templates/                 # Phase 0 — verbatim audit scripts + function/feature/module templates
examples/
├── powerbi-gantt.config.json
└── sample-fixture/
```

Every code edit ships with vitest tests under the matching `__tests__/` directory and must keep the full suite at 100 % pass with `tsc --noEmit` clean. Run:

```bash
npm test
npm run typecheck
```

## Adding a feature to the taxonomy

Edit the host project's `code-doc-builder.config.json`:

```json
{
  "featureTaxonomy": [
    {
      "slug": "new-feature",
      "displayName": "New Feature",
      "pathPatterns": ["/new-feature-folder/"],
      "hintPatterns": ["\\bnewFeature[A-Z]", "createNewFeature"]
    }
  ]
}
```

- `pathPatterns` is substring-matched against `file` (case-sensitive).
- `hintPatterns` is regex-matched against `file + name + parent`, case-insensitive.
- Set `"exclusive": true` to stop the classifier from also assigning the entry to features later in the list.

Rebuild with `/doc-build` or `npm run build:vault -- <projectRoot>` — the new feature shows up in `features/_features-index.md` and every matching function doc gains the slug in its `features:` frontmatter.

No code changes needed.

## Adding a slug prefix rule

When a folder has a domain convention (callbacks → `gantt-callback-…`, hooks → `gantt-hook-…`), declare it in the config:

```json
{
  "slugPrefixRules": [
    { "filePattern": "/cli/", "prefix": "cli" },
    { "filePattern": "/handlers/", "prefix": "handler" }
  ]
}
```

`filePattern` is a regex source string compiled against the entry's relative file path. The first match wins. Without a rule, the default ladder applies (see [src/generate/slug-resolver.ts](src/generate/slug-resolver.ts) for the rules).

No code changes needed.

## Adding a hot-path pattern

```json
{
  "hotPathPatterns": [
    "renderRow",
    "onScroll[A-Z]"
  ]
}
```

Pattern source strings compile to case-insensitive regexes and test against the function name. Matching entries get `hot-path: true`, are included in the audit-quality TARGETS, and get the `⚠️ HOT PATH` body block.

No code changes needed.

## Adding a new Karpathy rule (R5+)

Two files in lock-step — `templates/audit-quality.mjs` (user-facing script) and `src/quality/auditor.ts` (in-process). They must check the same condition with the same regex; a rule that exists in only one place is a bug waiting to happen.

1. **Add the check to [templates/audit-quality.mjs](templates/audit-quality.mjs)** — copy the existing R-block style. Emit a `console.log` line so the audit's stdout includes a parseable verdict.
2. **Mirror it in [src/quality/auditor.ts](src/quality/auditor.ts)** — add a `r5` field to `DocVerdict`, push `'r5'` to `failedRules` on fail.
3. **Write the auto-fixer in [src/quality/auto-fix.ts](src/quality/auto-fix.ts)** — `fixR5(text, opts)` must be deterministic and idempotent. Return text unchanged if the rule already passes.
4. **Wire `fixR5` into `autoFixDoc`** — run it before re-audit. Order matters when fixers can affect each other (e.g. R3 fallback inserts a link that satisfies its own outgoing-link check).
5. **Update [src/audit/index.ts](src/audit/index.ts) `parseQualityOutput`** so the CLI report counts R5 fails.
6. **Tests in `src/quality/__tests__/`** — at minimum: pass case, fail case, auto-fix round-trip.

The reader for new rules: [src/quality/auditor.ts](src/quality/auditor.ts) is the source of truth for the in-process audit; everything else mirrors it.

## Adding a subagent

1. Create `agents/<name>.md` with frontmatter:
   ```markdown
   ---
   name: <name>
   description: One sentence on when to use; trigger phrases included.
   tools: Read, Edit, Grep
   ---

   # <name>

   ## Inputs / Hard rules / Workflow / What you return — see existing agents for the shape.
   ```
2. Keep the `tools:` list narrow. The fewer tools, the smaller the prompt and the less drift potential.
3. Register the file in `.claude-plugin.json` under `"agents"`.
4. The `name:` frontmatter field MUST match the filename basename — enforced by the contract test in [src/__tests__/plugin-surfaces.test.ts](src/__tests__/plugin-surfaces.test.ts).

## Adding a slash command

1. Create `commands/<name>.md` with frontmatter:
   ```markdown
   ---
   description: One sentence on what the command does. Shown in /help.
   allowed-tools: Read, Bash, Glob
   ---

   # /<name>

   ## Arguments / Workflow / What you do NOT do — see existing commands.
   ```
2. Register the file in `.claude-plugin.json` under `"commands"`.
3. If the command calls `npm run X`, make sure `X` exists in `package.json`. The contract test asserts this.

## Adding an aggregator (e.g. settings / types / API surface)

Beyond features and modules, you might want a third aggregation axis (e.g. "every Settings card", "every public API export"). Pattern:

1. Add `src/aggregate/<name>-aggregator.ts` — exports `aggregate<Name>(opts) → Result`. Follow `feature-aggregator.ts` as the template:
   - Takes inventory + slugByKey + the relevant config slice.
   - Emits one `.md` per group under a subdirectory.
   - Uses `writeIfChanged()` from [src/aggregate/write-if-changed.ts](src/aggregate/write-if-changed.ts) for idempotency.
2. Wire into [src/aggregate/index.ts](src/aggregate/index.ts).
3. Add the subdir to the gate test in [src/__tests__/orchestrator.test.ts](src/__tests__/orchestrator.test.ts).
4. Tests under `src/aggregate/__tests__/<name>-aggregator.test.ts` — minimum: empty input, single group, multi-group, slug-with-slash filename safety.

## Adding a hook

1. Add `hooks/<name>.sh` with `#!/usr/bin/env bash` + `set -` flags. Keep it bash + node only — no `tsx` or other compiled tools (slow startup, dependency on host `node_modules`).
2. Add to `hooks/install.sh` so it gets symlinked into `.git/hooks/`.
3. Register under `"hooks"` in `.claude-plugin.json`.
4. The contract test asserts shebang + strict mode.

## Releasing

Pre-flight:

```bash
npm run typecheck
npm test
npm run build:vault -- examples/sample-fixture --config examples/sample-fixture/code-doc-builder.config.json --output examples/sample-fixture/documentation
diff -r <snapshot-of-sample-fixture/documentation> examples/sample-fixture/documentation
# → exit 0
```

Bump `version` in `package.json` and `.claude-plugin.json` (semver — patch for fixes, minor for new commands / agents / config keys, major for breaking changes to the YAML frontmatter schema).

Tag `v<version>`. The CI gate (when set up) replays this checklist + audits both the sample fixture and a larger reference project (host project: 721 functions).

## Conventions

- **Tests live next to code** in `__tests__/`. The vitest include glob is `src/**/*.test.ts`.
- **No new top-level dirs** without a phase note in `implementation.md`. The structure mirrors the pipeline.
- **Deterministic by default.** Anything that varies (LLM enrichment, timestamps in commits) goes behind a flag or stays out of the build hot path.
- **`git commit --no-verify` is allowed** when a hook is genuinely wrong — but fix the hook in the same series of commits.
