# Smoke-test report — v0.1.0

Three-tier pre-release validation matching the Phase 13 spec: small CLI / mid-size library / large React-Syncfusion app. Ran on Windows 10, Node 20.14.0, npm 10. All measurements from `time npm run build:vault ...`.

---

## Tier 1 — sample-fixture (small)

**Project**: [examples/sample-fixture/](examples/sample-fixture/) — synthetic, 6 named exports across 3 files (`src/index.ts`, `src/store.ts`, `src/utils.ts`).

**Command**:

```bash
npm run build:vault -- examples/sample-fixture \
  --config examples/sample-fixture/code-doc-builder.config.json \
  --output examples/sample-fixture/documentation
```

**Cold build**:

```
📦 Drift: 6 added, 0 unchanged                       (1.8 s)
📝 Generation: 6 written, 0 skipped
🔗 Link: 0 rewritten, 6 unchanged
📚 Aggregates: 2 features, 3 modules
🧪 Quality: 12 audited, 12 initial pass, 0 needs review
```

**Re-build (cache populated)**:

```
📦 Drift: 0 added, 0 removed, 6 unchanged            (1.6 s)
📝 Generation: 0 written, 6 skipped unchanged
🧪 Quality: 12 audited, 12 initial pass
```

**Determinism**: `diff -r snapshot/ rebuilt/` → exit 0. Zero file diffs.

---

## Tier 2 — plugin self-host (mid-size)

**Project**: the plugin's own `src/` directory. Real-world TypeScript library code: AST traversal, classifiers, aggregators, CLI scripts.

**Command**:

```bash
npm run build:vault -- . --output /tmp/plugin-self-vault
# (no config — uses generic defaults)
```

**Cold build**:

```
📦 Drift: 105 added, 0 unchanged                     (2.5 s)
📝 Generation: 105 written, 0 skipped
🔗 Link: 0 rewritten, 105 unchanged
📚 Aggregates: 0 features, 2 modules
🧪 Quality: 107 audited, 107 initial pass, 0 needs review
```

**Re-build**:

```
📦 Drift: 0 added, 0 removed, 105 unchanged          (2.1 s)
📝 Generation: 0 written, 105 skipped unchanged
🧪 Quality: 107 audited, 107 initial pass
```

**Determinism**: `diff -r` → exit 0.

**Note**: 0 features because no `featureTaxonomy` was supplied. The empty `_features-index.md` was a bug surfaced by this tier — fixed before release (the index now includes a back-link to `_index.md` to keep R3 passing on empty configs).

---

## Tier 3 — PowerBI Gantt (large)

**Project**: `d:/Work/GANTT/project/PowerBI-visuals-Gantt-Src` — 721 named functions across 218 files. React 18 + Syncfusion EJ2 Gantt + Power BI Visual SDK. The reference project that drove the plugin's design.

**Command**:

```bash
npm run build:vault -- /path/to/PowerBI-visuals-Gantt-Src \
  --config examples/powerbi-gantt.config.json \
  --output /tmp/pbi-vault
```

**Cold build**:

```
📦 Drift: 721 added, 0 unchanged                     (3.5 s)
📝 Generation: 721 written, 0 skipped
🔗 Link: 0 rewritten, 721 unchanged
📚 Aggregates: 20 features, 26 modules
🧪 Quality: 767 audited, 767 initial pass, 0 needs review
```

**Re-build**:

```
📦 Drift: 0 added, 0 removed, 721 unchanged          (3.0 s)
📝 Generation: 0 written, 721 skipped unchanged
🧪 Quality: 767 audited, 767 initial pass
```

**Determinism**: `diff -r` → exit 0.

---

## Summary

| Tier | Functions | Files | Cold | Re-build | Per-fn cold | Quality | Determinism |
|---|---:|---:|---:|---:|---:|---|---|
| 1 sample-fixture | 6 | 3 | 1.8 s | 1.6 s | 300 ms | 12 / 12 | ✅ |
| 2 plugin self-host | 105 | 23 | 2.5 s | 2.1 s | 24 ms | 107 / 107 | ✅ |
| 3 PowerBI Gantt | 721 | 218 | 3.5 s | 3.0 s | 4.9 ms | 767 / 767 | ✅ |

Throughput scales sublinearly with function count — the per-function cost falls as the project size grows because the fixed pipeline cost (TS compiler bootstrap, fast-glob, audit-script copy) amortises across more entries.

## LLM tokens

Not applicable in v0.1.0 — the pipeline is fully deterministic. The `function-doc-writer` / `feature-aggregator` / `module-aggregator` subagents are LLM-driven, but they ship as Claude Code surface files invoked on demand, not as a build-loop dependency. Token telemetry will land alongside the LLM enrichment phase post-v0.1.

## Audit pass rate (aggregated across all tiers)

| Rule | Audited | Pass | Fail |
|---|---:|---:|---:|
| R1 first-line fact | 886 | 886 | 0 |
| R2 no bare .md | 886 | 886 | 0 |
| R3 ≥ 1 outgoing link | 886 | 886 | 0 |
| R4 hot-path ⚠️ block | 10 hot-path docs | 10 | 0 |

886 = 12 (tier 1) + 107 (tier 2) + 767 (tier 3).

## Test suite

`npm test`: **175 / 175 pass** across 24 files.
`npm run typecheck`: clean.

End-to-end orchestrator test ([src/__tests__/orchestrator.test.ts](src/__tests__/orchestrator.test.ts)) mounts the full pipeline on a temp-dir fixture and SHA-256 hashes every output across two consecutive builds — this is the determinism gate's machine-checked floor.

## Release status

- `package.json` and `.claude-plugin.json` bumped to `0.1.0`.
- [CHANGELOG.md](CHANGELOG.md) written.
- Sample fixture's `documentation/` regenerated against the latest plugin version and committed.
- Ready for `git tag v0.1.0` (manual — user controls when to publish).
- Plugin registry publication path deferred per spec (registry not yet decided).
