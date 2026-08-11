# Manual Work — Documentation Build

Tracks remaining manual tasks that the automated build could not finish. Items here typically need human judgement: ambiguous feature assignment, missing pipeline narrative, or a Karpathy rule violation the auto-fix could not resolve.

---

## Phase 0 — Vault setup

- [ ] Open vault in Obsidian (or another Markdown viewer)
- [ ] Install Obsidian community plugins: **Dataview** and **Graph Analysis** (optional but useful)

---

## Phase 1 — Frontmatter enrichment

> Functions left with `features: []` because the LLM could not assign them to a feature. Review and either tag with a feature slug or accept as infrastructure.

- [ ] <fn-slug-1>
- [ ] <fn-slug-2>

---

## Phase 2 — Feature narratives

> Feature docs whose pipeline narrative needs hand-written context.

- [ ] features/<slug-1>
- [ ] features/<slug-2>

---

## Phase 3 — Quality fixes

> Docs flagged by `audit-quality.mjs` that the auto-fix retry could not repair.

- [ ] <fn-slug> — R1 fact-first violation
- [ ] <fn-slug> — R3 dead end
- [ ] <fn-slug> — R4 hot-path warning missing

---

## Reusable tools

- `documentation/audit-links.mjs` — counts, broken links, shared deps.
- `documentation/audit-quality.mjs` — Karpathy rules R1–R4.

Run both periodically. The build orchestrator re-runs them after every `/doc-build` and `/doc-update`.
