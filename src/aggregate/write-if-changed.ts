// write-if-changed — Phase 10 helper.
// Writes a file only when its content differs from what's on disk. Returns
// `true` when a write happened, `false` when skipped. Used by all aggregators
// and the hub generator to keep re-runs byte-deterministic AND skip the OS
// write call when there's nothing to do (preserves mtime for git).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export function writeIfChanged(path: string, text: string): boolean {
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return false;
  writeFileSync(path, text, 'utf8');
  return true;
}
