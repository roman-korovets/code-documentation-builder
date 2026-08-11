# Documentation Checklist

> Tracks progress of per-function documentation files inside `documentation/`.
> Each entry has its own `.md` file. Mark `[x]` when the doc file is created.

## Conventions

- Filename pattern: kebab-case of the function / method name + `.md`.
- Prefix conventions are project-specific and live in `code-doc-builder.config.json` under `output.naming.prefixes`. Defaults:
  - Class methods → `<class-kebab>-<method-kebab>.md`.
  - Local functions inside a method → `<class-kebab>-<method-kebab>-<fn-kebab>.md`.
  - Browser built-ins → `builtin-<name>.md`.
  - Host APIs → `host-<name>.md`.
- **When adding a new entry here, also create the `.md` file with a frontmatter block at the same time.** Empty stubs without frontmatter break Dataview queries.
- Status markers: `[ ]` not started, `[x]` complete, `[~]` removed (function no longer exists; doc deleted but marker retained for history).

---

## Sections

<!-- The orchestrator groups functions by source path / kind. Sections are populated
     during Phase 7 hub generation. -->

### A. Imported external functions

<!-- one entry per external import detected -->

### B. Constructors

<!-- one entry per class constructor -->

### C. Class methods

<!-- one entry per class method, grouped by class -->

### D. Local functions inside larger methods

<!-- one entry per nested helper function -->

### E. Host API / Service methods

<!-- one entry per host API call -->

### F. Browser built-ins

<!-- one entry per browser API wrapper -->

### G. Project functions by folder

<!-- Hierarchical listing mirroring the source-tree -->

---

## Working order

For each function, write a short doc proportional to complexity (≈80–200 lines for orchestrators, ≈40–80 for trivial helpers). Mark `[x]` as you go.
