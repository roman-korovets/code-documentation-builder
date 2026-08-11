// Inventory diff — Phase 10.
// Pure function. Groups two inventories by (file, name) and emits three sets:
// added (only in new), removed (only in old), kept (in both with full pair).

import type { InventoryEntry } from '../discover/index.js';

export interface InventoryDiff {
  added: InventoryEntry[];
  removed: InventoryEntry[];
  kept: { oldEntry: InventoryEntry; newEntry: InventoryEntry }[];
}

// Drift key includes `parent` so two locals named the same inside different
// parent functions in the same file (e.g. `close` in both `useExcelExport` and
// `usePdfExport`) don't collide.
const entryKey = (e: InventoryEntry) =>
  `${e.file}::${e.name}${e.parent ? `::${e.parent}` : ''}`;

export function diffInventories(
  oldInventory: InventoryEntry[],
  newInventory: InventoryEntry[],
): InventoryDiff {
  const oldByKey = new Map<string, InventoryEntry>();
  for (const e of oldInventory) oldByKey.set(entryKey(e), e);

  const newByKey = new Map<string, InventoryEntry>();
  for (const e of newInventory) newByKey.set(entryKey(e), e);

  const added: InventoryEntry[] = [];
  const removed: InventoryEntry[] = [];
  const kept: InventoryDiff['kept'] = [];

  for (const e of newInventory) {
    const old = oldByKey.get(entryKey(e));
    if (old) kept.push({ oldEntry: old, newEntry: e });
    else added.push(e);
  }
  for (const e of oldInventory) {
    if (!newByKey.has(entryKey(e))) removed.push(e);
  }

  return { added, removed, kept };
}

/** Returns true when (signature, lineRange) match — no body refresh needed. */
export function entriesEquivalent(a: InventoryEntry, b: InventoryEntry): boolean {
  return a.signature === b.signature && a.lineRange === b.lineRange && a.kind === b.kind;
}
