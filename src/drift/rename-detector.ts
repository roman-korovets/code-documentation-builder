// Rename detector — Phase 10.
// Among unmatched added/removed entries, finds pairs that look like renames:
// same file, same signature, same kind. The line range may have shifted.

import type { InventoryEntry } from '../discover/index.js';

export interface RenamePair {
  removed: InventoryEntry;
  added: InventoryEntry;
}

export function detectRenames(
  removed: InventoryEntry[],
  added: InventoryEntry[],
): { renames: RenamePair[]; remainingRemoved: InventoryEntry[]; remainingAdded: InventoryEntry[] } {
  const renames: RenamePair[] = [];
  const usedAdded = new Set<InventoryEntry>();
  const usedRemoved = new Set<InventoryEntry>();

  for (const r of removed) {
    const candidate = added.find((a) =>
      !usedAdded.has(a) &&
      a.file === r.file &&
      a.signature === r.signature &&
      a.kind === r.kind &&
      a.name !== r.name,
    );
    if (candidate) {
      renames.push({ removed: r, added: candidate });
      usedAdded.add(candidate);
      usedRemoved.add(r);
    }
  }

  return {
    renames,
    remainingRemoved: removed.filter((r) => !usedRemoved.has(r)),
    remainingAdded: added.filter((a) => !usedAdded.has(a)),
  };
}
