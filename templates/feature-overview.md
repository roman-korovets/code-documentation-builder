---
type: feature-overview
slug: <feature-slug>
risk: <low | medium | high>
function-count: 0
shared-with: []
---
# <Feature Display Name>

> Two-sentence summary: what the feature does end-to-end and why it exists. Include performance notes if the feature touches a hot-path callback.

## Entry points

<!-- Top-of-pipeline functions a developer would touch first -->
- [[<entry-fn-slug>]] — <role>

## Core pipeline

### Runtime
1. <Step 1 — function call> [[<fn-slug>]]
2. <Step 2> [[<fn-slug>]]
3. <Step 3> [[<fn-slug>]]

### Edit / UI pipeline (if applicable)
1. <Step 1> [[<fn-slug>]]
2. <Step 2> [[<fn-slug>]]

## All functions

<!-- Auto-populated from frontmatter — every function with this feature slug -->

### <Group label A>
- [[<fn-slug>]]

### <Group label B>
- [[<fn-slug>]]

## Shared dependencies

<!-- Functions that participate in this feature AND ≥1 other feature -->

| Function | Also used by |
|---|---|
| [[<shared-fn>]] | <other-features> |

## ⚠️ Performance warning (when applicable)

<!-- Emit if any function has hot-path: true. Otherwise omit this section. -->

## Related features

- [[features/<other>]] — <relationship>
