#!/usr/bin/env node
// CLI: full pipeline → per-function .md files in <projectRoot>/documentation/.
//
// Usage:
//   npm run generate -- <projectRoot> [--config <path>] [--output <dir>] [--dry-run]

import { resolve, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { discover } from '../discover/index.js';
import { classify, type FeatureTaxonomyEntry } from '../classify/index.js';
import { buildCallGraph } from '../graph/index.js';
import { generateFunctionDocs } from '../generate/index.js';

interface CliConfig {
  moduleMap?: Record<string, string>;
  featureTaxonomy?: FeatureTaxonomyEntry[];
  hotPathPatterns?: string[];
  slugPrefixRules?: { filePattern?: string; namePattern?: string; prefix: string }[];
}

const args = process.argv.slice(2);
let projectRoot = process.cwd();
let configPath: string | undefined;
let outputDir: string | undefined;
let dryRun = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--config') configPath = resolve(args[++i]);
  else if (a === '--output') outputDir = args[++i];
  else if (a === '--dry-run') dryRun = true;
  else if (a && !a.startsWith('--')) projectRoot = resolve(a);
}

(async () => {
  const config: CliConfig = configPath ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
  const outputRoot = outputDir ? resolve(outputDir) : join(projectRoot, 'documentation');

  const start = Date.now();
  const inventory = await discover({ projectRoot, cache: false });
  const classified = await classify({
    inventory,
    projectRoot,
    moduleMap: config.moduleMap,
    featureTaxonomy: config.featureTaxonomy,
    hotPathPatterns: config.hotPathPatterns?.map((p) => new RegExp(p)),
  });
  const graph = await buildCallGraph({ inventory: classified, projectRoot, cache: false });

  const slugPrefixRules = config.slugPrefixRules?.map((r) => ({
    filePattern: r.filePattern ? new RegExp(r.filePattern) : undefined,
    namePattern: r.namePattern ? new RegExp(r.namePattern) : undefined,
    prefix: r.prefix,
  }));

  const { docs } = await generateFunctionDocs({
    inventory: classified,
    graph,
    outputRoot,
    slugPrefixRules,
    write: !dryRun,
  });
  const ms = Date.now() - start;

  // Slug stats — from docs directly, so collisions are visible.
  const slugCounts = new Map<string, number>();
  for (const d of docs) slugCounts.set(d.slug, (slugCounts.get(d.slug) ?? 0) + 1);
  const collisions = [...slugCounts.entries()].filter(([, n]) => n > 1);

  console.log(`\n📝 Generated ${docs.length} docs in ${ms} ms${dryRun ? ' (dry-run)' : ''}`);
  console.log(`   Output         : ${outputRoot}`);
  console.log(`   Unique slugs   : ${slugCounts.size}`);
  if (collisions.length > 0) {
    console.log(`   ⚠️  Collisions  : ${collisions.length}`);
    for (const [s, n] of collisions.slice(0, 5)) console.log(`     ${s} × ${n}`);
  }

  // Sample 5 random slugs
  console.log(`\n   Sample slugs:`);
  const sample = docs.filter((_, i) => i % Math.max(1, Math.floor(docs.length / 5)) === 0).slice(0, 5);
  for (const d of sample) console.log(`     ${d.slug}.md`);
})().catch((e) => {
  console.error(`\n❌ generate failed: ${e.message}`);
  process.exit(1);
});
