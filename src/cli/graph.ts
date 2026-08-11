#!/usr/bin/env node
// CLI: discover + classify + build call graph; report coverage stats and
// write call-graph.json to .code-doc-builder/.
//
// Usage:
//   npm run graph -- <projectRoot> [--config <path>]

import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { discover } from '../discover/index.js';
import { classify, type FeatureTaxonomyEntry } from '../classify/index.js';
import { buildCallGraph, entryKey } from '../graph/index.js';

interface CliConfig {
  moduleMap?: Record<string, string>;
  featureTaxonomy?: FeatureTaxonomyEntry[];
  hotPathPatterns?: string[];
}

const args = process.argv.slice(2);
let projectRoot = process.cwd();
let configPath: string | undefined;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--config') configPath = resolve(args[++i]);
  else if (a && !a.startsWith('--')) projectRoot = resolve(a);
}

(async () => {
  const config: CliConfig = configPath ? JSON.parse(readFileSync(configPath, 'utf8')) : {};

  const start = Date.now();
  const inventory = await discover({ projectRoot, cache: false });
  const classified = await classify({
    inventory,
    projectRoot,
    moduleMap: config.moduleMap,
    featureTaxonomy: config.featureTaxonomy,
    hotPathPatterns: config.hotPathPatterns?.map((p) => new RegExp(p)),
  });
  const graph = await buildCallGraph({ inventory: classified, projectRoot });
  const ms = Date.now() - start;

  const total = classified.length;
  let withCalls = 0;
  let withCallers = 0;
  let withSentinelOnly = 0;
  let orphans = 0;
  let totalEdges = 0;
  const sentinelCount = new Map<string, number>();

  for (const e of classified) {
    const node = graph.get(entryKey(e.file, e.name))!;
    if (node.calls.length > 0) withCalls++;
    if (node.calledBy.length > 0) withCallers++;
    if (node.calledBy.length === 0) orphans++;
    if (node.calledBy.length === 1 && node.calledBy[0].startsWith('[')) withSentinelOnly++;
    totalEdges += node.calls.length;
    for (const c of node.calledBy) {
      if (c.startsWith('[')) sentinelCount.set(c, (sentinelCount.get(c) ?? 0) + 1);
    }
  }

  console.log(`\n📊 Call graph built in ${ms} ms`);
  console.log(`   Entries        : ${total}`);
  console.log(`   With callers   : ${withCallers} (${Math.round((withCallers / total) * 100)}%)`);
  console.log(`   With calls     : ${withCalls} (${Math.round((withCalls / total) * 100)}%)`);
  console.log(`   Sentinel-only  : ${withSentinelOnly}`);
  console.log(`   Orphans        : ${orphans}`);
  console.log(`   Total edges    : ${totalEdges}`);
  console.log(`   Avg fan-out    : ${(totalEdges / total).toFixed(2)}`);
  console.log(`\n   Sentinels used:`);
  for (const [s, n] of [...sentinelCount.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${s.padEnd(35)} ${n}`);
  }
  console.log(`\n   Cache: ${projectRoot}/.code-doc-builder/call-graph.json`);
})().catch((e) => {
  console.error(`\n❌ graph failed: ${e.message}`);
  process.exit(1);
});
