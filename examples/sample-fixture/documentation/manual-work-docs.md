# Manual Work — Documentation Build

> Tracks documentation tasks that require human or LLM enrichment beyond the deterministic skeleton.

---

## Phase A — Function Behaviour narratives

- [ ] Replace `<!-- TODO -->` Behaviour blocks in 6 function docs.
  - Each one should describe key invariants, exit paths, or phase ordering.
  - Karpathy R1: first body line must be fact-first.

## Phase B — Feature pipeline narratives

- [ ] Replace `<!-- TODO -->` summary in 2 feature docs.
  - Add Core pipeline section describing entry → transform → output flow.

## Phase C — Module narratives

- [ ] Replace `<!-- TODO -->` summary in 3 module docs.
  - Describe each module's responsibility and primary entry component / service.

## Phase D — Architecture sketch in `_index.md`

- [ ] Replace the `<!-- TODO -->` block in `_index.md` § Architecture with a 5-line summary.
  - Walk the read from host call → data transform → render → DOM patch.

---

> All Karpathy R1 / R3 / R4 audits already pass on the deterministic skeleton (verified by `audit-quality.mjs`). The enrichment work above does not need to fix audits — it adds the *content* that audits cannot generate.
