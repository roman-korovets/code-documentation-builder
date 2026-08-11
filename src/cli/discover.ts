#!/usr/bin/env node
// CLI: discover functions in a project, write inventory.json to .code-doc-builder/.
// Usage:
//   npm run discover -- <projectRoot> [--source <root>] [--no-cache]

import { discover } from '../discover/index.js';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
let projectRoot = process.cwd();
const sourceRoots: string[] = [];
let cache = true;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--source') sourceRoots.push(args[++i]);
  else if (a === '--no-cache') cache = false;
  else if (a && !a.startsWith('--')) projectRoot = resolve(a);
}

(async () => {
  const start = Date.now();
  const entries = await discover({
    projectRoot,
    sourceRoots: sourceRoots.length > 0 ? sourceRoots : undefined,
    cache,
  });
  const ms = Date.now() - start;

  console.log(`\n📊 ${entries.length} functions discovered in ${ms} ms`);
  console.log(`   Project: ${projectRoot}`);
  if (cache) console.log(`   Cache:   ${projectRoot}/.code-doc-builder/inventory.json`);

  const byKind = new Map<string, number>();
  for (const e of entries) byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);
  console.log(`\n   By kind:`);
  for (const [k, n] of [...byKind.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${k.padEnd(14)} ${n}`);
  }
})().catch((e) => {
  console.error(`\n❌ discover failed: ${e.message}`);
  process.exit(1);
});
