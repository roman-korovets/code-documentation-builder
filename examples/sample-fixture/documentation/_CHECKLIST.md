# Documentation Checklist

> Tracks per-function documentation files. 6 entries.

## Conventions

- One `.md` file per inventory entry. Filename = kebab-case slug.
- `Visual` class methods → `visual-<method>.md`.
- Local helpers inside class methods → `visual-<method>-<helper>.md`.
- Other entries → `<file-base>-<name>.md`. See [[_schema]] for frontmatter spec.
- `[x]` marks a doc file present in the vault. Auto-generated — every line should be checked.

---

## G. Project inventory (6)

### G.`store` (3)

- [x] [flushStore](store-flush-store.md)
- [x] [getEntry](store-get-entry.md)
- [x] [setEntry](store-set-entry.md)

### G.`utils` (2)

- [x] [chunk](utils-chunk.md)
- [x] [isBlank](utils-is-blank.md)

### G.`app` (1)

- [x] [run](index-run.md)
