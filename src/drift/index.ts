// Drift detection — Phase 10.
// Composes diffInventories + detectRenames + detectMoves into a typed Delta[]
// the orchestrator can consume to decide per-entry actions.

import type { InventoryEntry } from '../discover/index.js';
import { diffInventories, entriesEquivalent } from './compare-inventories.js';
import { detectRenames } from './rename-detector.js';
import { detectMoves } from './move-detector.js';

export type Delta =
  | { kind: 'added'; entry: InventoryEntry }
  | { kind: 'removed'; entry: InventoryEntry }
  | { kind: 'renamed'; oldEntry: InventoryEntry; newEntry: InventoryEntry }
  | { kind: 'moved'; oldEntry: InventoryEntry; newEntry: InventoryEntry }
  | { kind: 'updated'; oldEntry: InventoryEntry; newEntry: InventoryEntry }
  | { kind: 'unchanged'; entry: InventoryEntry };

export interface DriftOptions {
  oldInventory: InventoryEntry[];
  newInventory: InventoryEntry[];
}

export interface DriftReport {
  deltas: Delta[];
  counts: Record<Delta['kind'], number>;
}

export async function detectDrift(opts: DriftOptions): Promise<DriftReport> {
  const { added, removed, kept } = diffInventories(opts.oldInventory, opts.newInventory);
  const { renames, remainingAdded: afterRenameAdded, remainingRemoved: afterRenameRemoved } =
    detectRenames(removed, added);
  const { moves, remainingAdded, remainingRemoved } =
    detectMoves(afterRenameRemoved, afterRenameAdded);

  const deltas: Delta[] = [];
  for (const e of remainingAdded) deltas.push({ kind: 'added', entry: e });
  for (const e of remainingRemoved) deltas.push({ kind: 'removed', entry: e });
  for (const p of renames) deltas.push({ kind: 'renamed', oldEntry: p.removed, newEntry: p.added });
  for (const p of moves) deltas.push({ kind: 'moved', oldEntry: p.removed, newEntry: p.added });
  for (const { oldEntry, newEntry } of kept) {
    if (entriesEquivalent(oldEntry, newEntry)) deltas.push({ kind: 'unchanged', entry: newEntry });
    else deltas.push({ kind: 'updated', oldEntry, newEntry });
  }

  const counts: Record<Delta['kind'], number> = {
    added: 0, removed: 0, renamed: 0, moved: 0, updated: 0, unchanged: 0,
  };
  for (const d of deltas) counts[d.kind]++;

  return { deltas, counts };
}

export { diffInventories, entriesEquivalent } from './compare-inventories.js';
export { detectRenames } from './rename-detector.js';
export { detectMoves } from './move-detector.js';
