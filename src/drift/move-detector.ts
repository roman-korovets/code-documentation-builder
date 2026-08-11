// Move detector — Phase 10.
// Among unmatched added/removed entries (after rename detection), finds pairs
// with the same name + signature + kind in different files.

import type { InventoryEntry } from '../discover/index.js';

export interface MovePair {
  removed: InventoryEntry;
  added: InventoryEntry;
}

export function detectMoves(
  removed: InventoryEntry[],
  added: InventoryEntry[],
): { moves: MovePair[]; remainingRemoved: InventoryEntry[]; remainingAdded: InventoryEntry[] } {
  const moves: MovePair[] = [];
  const usedAdded = new Set<InventoryEntry>();
  const usedRemoved = new Set<InventoryEntry>();

  for (const r of removed) {
    const candidate = added.find((a) =>
      !usedAdded.has(a) &&
      a.name === r.name &&
      a.signature === r.signature &&
      a.kind === r.kind &&
      a.file !== r.file,
    );
    if (candidate) {
      moves.push({ removed: r, added: candidate });
      usedAdded.add(candidate);
      usedRemoved.add(r);
    }
  }

  return {
    moves,
    remainingRemoved: removed.filter((r) => !usedRemoved.has(r)),
    remainingAdded: added.filter((a) => !usedAdded.has(a)),
  };
}
