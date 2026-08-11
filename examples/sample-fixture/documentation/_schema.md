---
type: index
---
# Frontmatter Schema Reference

Every function `.md` in this vault carries a YAML frontmatter block. Obsidian reads it; Dataview queries it; LLMs use it for impact analysis.

---

## Fields

```yaml
---
source-file: src/path/to/file.ts
module: <module-slug>
type: <type-enum>
features: [<feature-slug>, ...]
called-by: [<caller-slug>, ...]
hot-path: false
---
```

| Field | Required | Type | Description |
|---|---|---|---|
| `source-file` | yes | string | Repo-relative path to the `.ts` / `.tsx` file |
| `module` | yes | string | Logical module slug — see § Module values |
| `type` | yes | string | Function category — see § Type values |
| `features` | yes | string[] | Feature slugs this function participates in — see [[features/_features-index]] |
| `called-by` | recommended | string[] | Doc slugs of direct callers. Bracketed tokens (`[sentinel]`) mark external callers |
| `hot-path` | conditional | boolean | `true` for functions that run O(rows × cols) on every render |

## Type values

| Value | Meaning |
|---|---|
| `transform` | Pure or near-pure data transformation |
| `util` | Pure utility with no side effects |

## Module values

Observed in this project:

- `app`
- `store`
- `utils`

## Dataview query examples

List all hot-path functions:
```dataview
TABLE source-file, features
FROM ""
WHERE hot-path = true
SORT file.name ASC
```

Find functions shared by 3+ features (high-risk change targets):
```dataview
TABLE source-file, length(features) AS feature-count
FROM ""
WHERE length(features) >= 3
SORT length(features) DESC
```

---

## User-documentation frontmatter

Docs under `guides/**` carry a separate frontmatter shape — they describe user-facing tasks, not source functions.

```yaml
---
type: guide                              # guide | concept | workflow | troubleshooting | reference-user | persona | index
audience: report-author                  # report-author | end-user | developer | admin
complexity: beginner                     # beginner | intermediate | advanced
prerequisites: [guides/getting-started/installation]
related-settings: [settings/some-card]   # required when type=guide
related-functions: [some-function-slug]  # consumer functions in the code-doc namespace
related-features: [some-feature-slug]
screenshots: [assets/screenshots/example-01.png]
premium: false
editmode-only: false
---
```

| Field | Required | Notes |
|---|---|---|
| `type` | yes | One of the 7 enum values. `guide` is the default for how-to recipes |
| `audience` | yes | Drives the G6 dev-jargon audit |
| `complexity` | recommended | Helps the index group docs by reading order |
| `prerequisites` | recommended | Slugs of guides to read first. Audit G2 verifies each one resolves |
| `related-settings` | required for type=guide | Settings docs the recipe configures |
| `related-functions` | recommended | Function slugs that read the settings touched in this guide. Reciprocal of `documented-by-guides:` on the function side |
| `related-features` | recommended | Feature aggregate slugs |
| `screenshots` | recommended | Paths relative to `guides/`. Audit G3 verifies they exist on disk |
| `premium` | optional | `true` if the recipe requires a gated tier |
| `editmode-only` | optional | `true` if the action only works in the product's edit mode |

### Wikilink resolution rules for guides

- From `guides/**`, ALWAYS use full-path wikilinks of the form `guides/how-to/<recipe>`, never the bare recipe slug alone. The same recipe slug may exist in other namespaces.
- Bare slugs from `guides/**` are reserved for code-doc cross-links to the flat vault root (e.g. a function-doc slug).
