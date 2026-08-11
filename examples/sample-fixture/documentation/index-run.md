---
source-file: src/index.ts
module: app
type: transform
features: []
called-by: []
hot-path: false
---
# `run` (`index.ts`)

> `run` — named export in `src/index.ts`.

## 1. Origin
- **File:** `src/index.ts:8-21`
- **Exported as:** named export

## 2. Signature
```ts
(input: string[]): { writes: number; reads: number; flushed: number }
```

## 3. Behaviour
<!-- TODO: describe key invariants, exit paths, or phase ordering -->

## 4. Called by
- _none_

## 5. Calls
- [[utils-chunk]]
- [[utils-is-blank]]
- [[store-set-entry]]
- [[store-get-entry]]
- [[store-flush-store]]
