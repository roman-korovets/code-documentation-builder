---
type: index
audience: report-author
---
# User Documentation — Index

> Master entry point for user-facing documentation of Sample Fixture. Audience: **end user** of the product. Developer / function-level docs live in the vault root (see [[_index]]).

See [[_schema]] § User-documentation frontmatter for the field spec used across `guides/**`.

---

## Quick start by persona

| I am… | Start here |
|---|---|
| A new user opening the product for the first time | [[guides/getting-started/_section-index]] |
| An experienced user configuring a specific feature | [[guides/how-to/_section-index]] |
| Trying to fix something that doesn't work as expected | [[guides/troubleshooting/_section-index]] |
| Trying to understand how the product thinks about data | [[guides/concepts/_section-index]] |
| Planning a multi-feature scenario | [[guides/workflows/_section-index]] |
| Looking up a preset, limit, or shortcut | [[guides/reference/_section-index]] |
| Curious who this documentation is written for | [[guides/_personas]] |
| Wondering what a term means | [[guides/_glossary]] |

---

## Sections

### Getting started
First-touch flow for new users. Beginner complexity, no prerequisites.

→ [[guides/getting-started/_section-index]]

### Concepts
Mental model the rest of the vault assumes. Read these once.

→ [[guides/concepts/_section-index]]

### How-to recipes
One task-oriented recipe per feature / setting. One file = one user task.

→ [[guides/how-to/_section-index]]

### Workflows
Multi-feature playbooks that chain several how-tos.

→ [[guides/workflows/_section-index]]

### Troubleshooting
Symptom → likely cause → diagnostic → fix. Every leaf links to a how-to or concept.

→ [[guides/troubleshooting/_section-index]]

### Reference
Lookup tables — presets, limits, shortcuts.

→ [[guides/reference/_section-index]]

---

## How user docs cross-reference code docs

Each how-to lists in its frontmatter:

- `related-settings:` — Settings docs the recipe configures.
- `related-functions:` — Consumer functions that read those settings. Wikilinks resolve into the flat code-doc namespace at vault root.
- `related-features:` — Feature aggregates under `features/`.

This makes the bidirectional graph complete: a developer changing a function can find the user guide affected; an end user hitting an issue can find the code path responsible.

## Conventions

- All wikilinks from `guides/**` use **full paths** of the form `guides/how-to/<recipe>`, not the bare slug alone. See [[_schema]] § Wikilink resolution rules for guides.
- Plain language in `audience: report-author` / `audience: end-user` docs — developer-only terms (engine internals, code symbols, project file names) stay in the code namespace.
- Screenshots live under `assets/screenshots/`, named `<guide-slug>-NN.png`.
- Every guide ends with a `## Related` section linking ≥ 1 outside node.
