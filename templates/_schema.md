# Frontmatter Schema Reference

Every function `.md` in this vault carries a YAML frontmatter block.
Obsidian reads it; Dataview queries it; LLMs use it for impact analysis.

---

## Fields

```yaml
---
source-file: src/modules/<module>/<file>.ts
module: <module-slug>
type: <type-value>
features: [feature-slug-a, feature-slug-b]
called-by: [caller-doc-slug]
hot-path: true
---
```

| Field | Required | Type | Description |
|---|---|---|---|
| `source-file` | yes | string | Relative path from repo root to the source file |
| `module` | yes | string | Logical module slug — see **Module values** below |
| `type` | yes | string | Function category — see **Type values** below |
| `features` | yes | string[] | Feature slugs this function participates in — see [[features/_features-index]] |
| `called-by` | recommended | string[] | Doc slugs of direct callers. **Frontmatter is the single source of truth.** External callers use sentinel strings like `[<external-system>-<entry-point>]`. |
| `hot-path` | conditional | boolean | `true` if the function runs O(rows × cols) — every hot callback per render frame |

---

## Type values

| Value | When to use |
|---|---|
| `callback` | Event handler passed as a prop to a UI framework |
| `transform` | Pure or near-pure data transformation |
| `render` | Triggers or controls React / DOM rendering |
| `export` | Part of a file export pipeline (PDF, Excel, CSV, ...) |
| `component` | React component (returns JSX) |
| `hook` | React hook (`use*`) |
| `service` | Stateful service method or class method |
| `util` | Pure utility with no side effects |
| `host` | Host API call or wrapper (Power BI host, browser host, ...) |
| `builtin` | Browser built-in wrapper (timers, DOM, stylesheets) |

---

## Module values

> Populated by the orchestrator from the project's source layout. One entry per module slug.

| Value | Maps to |
|---|---|
| `<module-a>` | `src/modules/<module-a>/` |
| `services/<service-a>` | `src/services/<service-a>/` |
| `utils` | `src/utils/` |
| `components` | `src/components/` |
| `host` | host APIs |
| `builtin` | browser built-ins |

---

## Dataview query examples

List all hot-path functions:
```dataview
TABLE source-file, features
FROM ""
WHERE hot-path = true
SORT file.name ASC
```

List all functions involved in a feature:
```dataview
TABLE source-file, type, called-by
FROM ""
WHERE contains(features, "<feature-slug>")
SORT type ASC
```

Find functions shared by 3+ features (high-risk change targets):
```dataview
TABLE source-file, length(features) AS feature-count
FROM ""
WHERE length(features) >= 3
SORT length(features) DESC
```

---

## Maintenance

### Adding a new function doc
1. Add the entry to `_CHECKLIST.md` AND create the `.md` file at the same time.
2. Required frontmatter: `source-file`, `module`, `type`, `features`.
3. Add `[[wikilink]]` from the relevant `features/<slug>.md` and `modules/<module>.md`.

### After renaming or moving a function / doc
Run `node documentation/audit-links.mjs` — flags broken `[[wikilinks]]` and feature-count drift.

### Quality spot-check on high-traffic docs
Run `node documentation/audit-quality.mjs` — Karpathy rules R1–R4. Extend the `TARGETS` array to audit more files.
