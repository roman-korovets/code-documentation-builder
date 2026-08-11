---
type: index
---
# <Project Name> — Documentation Index

> Master entry point for LLM and human navigation. Start here.

---

## Architecture (5 lines)

<!-- Populated by orchestrator from feature taxonomy + module list + entry-point analysis -->
1. <Top-of-call-tree entry point>
2. <Main pipeline step 1>
3. <Main pipeline step 2>
4. <Main pipeline step 3>
5. <Side-effect surface>

---

## Start here by intent

| I want to… | Start at |
|---|---|
| Understand the lifecycle | [[<lifecycle-entry-point>]] |
| Trace a setting / option to code | [[<settings-entry-point>]] |
| Debug a feature | [[features/<feature-of-interest>]] |
| Add a new feature | [[_schema]] → [[features/_features-index]] |
| Find which docs need manual enrichment | [[manual-work-docs]] |

---

## Key lifecycle functions

<!-- Populated by orchestrator from functions with highest incoming edges -->

| Function | Role |
|---|---|
| [[<fn-slug>]] | <role> |

### Hot-path callbacks (run O(rows × cols))

| Callback | Fires for |
|---|---|
| [[<hot-fn-slug>]] | <surface> |

---

## Features

<!-- Populated from features/_features-index.md -->

| Feature | Doc | Risk | Functions |
|---|---|---|---|
| <Feature> | [[features/<slug>]] | <risk> | <count> |

---

## Modules

<!-- Populated from modules/ folder -->

| Module | Source path | Feature doc |
|---|---|---|
| [[modules/<slug>]] | `src/modules/<path>/` | [[features/<related>]] |

---

## Shared-dependency hot spots

Functions that appear in 3+ features — **highest risk on change**:

<!-- Populated by audit-links.mjs Check D -->

| Function | Used by |
|---|---|
| [[<shared-fn>]] | <feature-list> |

---

## Reference

- [[_schema]] — frontmatter field spec and valid type / module values
- [[features/_features-index]] — full feature taxonomy with risk levels
- [[manual-work-docs]] — remaining manual enrichment tasks
