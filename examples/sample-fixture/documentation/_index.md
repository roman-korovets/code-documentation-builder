---
type: index
---
# Documentation Index

> Master entry point. 6 function docs, 2 features, 3 modules.

---

## Architecture

<!-- TODO: replace with a 5-line architecture summary. -->
The project surface is described by 3 module overviews and 2 features. See § Modules and § Features below for entry points.

## Start here by intent

| I want to… | Start at |
|---|---|
| Understand the frontmatter spec | [[_schema]] |
| See all features and risk levels | [[features/_features-index]] |
| Find every documented function | [[_CHECKLIST]] |
| Open the end-user documentation | [[guides/_guides-index]] |
| Track remaining enrichment work | [[manual-work-docs]] |
| Understand persistence | [[features/persistence]] |
| Understand input validation | [[features/input-validation]] |

## Key lifecycle functions

Top entries by incoming call edges (the more callers, the more central):

| Function | Incoming edges |
|---|---|
| [[utils-chunk]] | 1 |
| [[utils-is-blank]] | 1 |
| [[store-set-entry]] | 1 |
| [[store-get-entry]] | 1 |
| [[store-flush-store]] | 1 |

## Features (2)

| Feature | Doc | Risk | Functions |
|---|---|---|---|
| Persistence | [[features/persistence]] | low | 3 |
| Input Validation | [[features/input-validation]] | low | 1 |

## Modules (3)

| Module | Source | Doc | Functions |
|---|---|---|---|
| `store` | — | [[modules/store]] | 3 |
| `utils` | — | [[modules/utils]] | 2 |
| `app` | — | [[modules/app]] | 1 |

---

## Reference

- [[_schema]] — frontmatter field spec and enums
- [[_CHECKLIST]] — every function by section
- [[features/_features-index]] — full feature taxonomy
- [[guides/_guides-index]] — end-user documentation
- [[manual-work-docs]] — outstanding manual / LLM enrichment tasks
