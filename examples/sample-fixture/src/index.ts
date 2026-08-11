// Sample app entry. Demonstrates a small call graph:
//   run → setEntry → getEntry → isBlank
//       → flushStore

import { setEntry, getEntry, flushStore } from './store.js';
import { isBlank, chunk } from './utils.js';

export function run(input: string[]): { writes: number; reads: number; flushed: number } {
  let writes = 0;
  let reads = 0;
  for (const batch of chunk(input, 2)) {
    for (const value of batch) {
      if (isBlank(value)) continue;
      setEntry(`k-${writes}`, value);
      writes++;
      if (getEntry(`k-${writes - 1}`)) reads++;
    }
  }
  const flushed = flushStore();
  return { writes, reads, flushed };
}
