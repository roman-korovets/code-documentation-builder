---
type: persona
audience: report-author
---
# Personas — Who this documentation is for

> Two or three audiences interact with this product and its documentation. The `audience:` frontmatter field on every guide tells you who the doc is written for.

> <!-- TODO: edit the persona descriptions below to match your project. The defaults below are generic and assume an end-user + developer split. -->

---

## End User *(primary audience)*

**Who.** A user of the product. Configures it through its UI, does not read source code.

**Goal.** Get the product to do what they need without learning its internals.

**Reads.** Every doc tagged `audience: end-user` (or `audience: report-author` for Power-BI-style products). Starts at [[guides/getting-started/_section-index]].

**Does not need.** Code-level docs at vault root, function call hierarchies, internal-graph edges.

---

## Developer *(secondary audience)*

**Who.** An engineer extending or fixing the product. Reads the source.

**Goal.** Add a feature, fix a bug, understand impact.

**Reads.** The flat function-level docs at vault root (see [[_index]]) plus `features/`, `modules/`. May open a user guide to confirm the user-visible behaviour of a change.

**Reciprocal entry.** A function doc lists every guide that documents it (`documented-by-guides:`). Traversal works in both directions.

---

## Mapping persona → section

| Section | End User | Developer |
|---|---|---|
| `guides/getting-started/` | ✅ primary | ◯ reads installation |
| `guides/concepts/` | ✅ primary | ◯ reference |
| `guides/how-to/` | ✅ primary | ◯ when changing a setting |
| `guides/workflows/` | ✅ primary | — |
| `guides/troubleshooting/` | ✅ primary | ◯ to confirm visible symptom |
| `guides/reference/` | ✅ primary | ◯ reference |
| Vault root (function docs) | — | ✅ primary |
| `features/`, `modules/` | — | ✅ primary |

✅ primary · ◯ occasional · — not their target

## Related

- [[guides/_guides-index]]
- [[guides/_glossary]]
