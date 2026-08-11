#!/usr/bin/env node
// CLI: discover + classify a project, write classified.json to .code-doc-builder/.
// Usage:
//   npm run classify -- <projectRoot> [--config <path>]

import { resolve } from 'node:path';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { discover } from '../discover/index.js';
import { classify, type FeatureTaxonomyEntry } from '../classify/index.js';

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
  const ms = Date.now() - start;

  const moduleStats = new Map<string, number>();
  const typeStats = new Map<string, number>();
  const featureStats = new Map<string, number>();
  let hotPath = 0;
  let orphanFeatures = 0;
  for (const e of classified) {
    moduleStats.set(e.module, (moduleStats.get(e.module) ?? 0) + 1);
    typeStats.set(e.type, (typeStats.get(e.type) ?? 0) + 1);
    for (const f of e.features) featureStats.set(f, (featureStats.get(f) ?? 0) + 1);
    if (e.hotPath) hotPath++;
    if (e.features.length === 0) orphanFeatures++;
  }

  console.log(`\n📊 ${classified.length} functions classified in ${ms} ms\n`);
  console.log(`   Modules (${moduleStats.size}):`);
  for (const [m, n] of [...moduleStats.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${m.padEnd(35)} ${n}`);
  }
  console.log(`\n   Types:`);
  for (const [t, n] of [...typeStats.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${t.padEnd(15)} ${n}`);
  }
  console.log(`\n   Features (${featureStats.size}):`);
  for (const [f, n] of [...featureStats.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${f.padEnd(28)} ${n}`);
  }
  console.log(`\n   Hot-path: ${hotPath}`);
  console.log(`   Orphans (features: []): ${orphanFeatures}`);

  const cacheDir = `${projectRoot}/.code-doc-builder`;
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(`${cacheDir}/classified.json`, JSON.stringify(classified, null, 2));
  console.log(`\n   Cache: ${cacheDir}/classified.json`);
})().catch((e) => {
  console.error(`\n❌ classify failed: ${e.message}`);
  process.exit(1);
});
