#!/usr/bin/env node
// CLI: discover → classify → graph → resolve-slugs → aggregate features+modules.
//
// Usage:
//   npm run aggregate -- <projectRoot> [--config <path>] [--output <dir>] [--dry-run]

import { resolve, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { discover } from '../discover/index.js';
import { classify, type FeatureTaxonomyEntry } from '../classify/index.js';
import { buildCallGraph } from '../graph/index.js';
import { resolveSlugs } from '../generate/slug-resolver.js';
import { aggregate } from '../aggregate/index.js';

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
  const { byKey } = resolveSlugs(classified, { prefixRules: slugPrefixRules });

  const { features, modules, hubs } = await aggregate({
    inventory: classified,
    graph,
    slugByKey: byKey,
    taxonomy: config.featureTaxonomy ?? [],
    projectRoot,
    outputRoot,
    write: !dryRun,
  });
  const ms = Date.now() - start;

  // Coverage gate — every feature slug present in inventory must have a doc.
  const featureSlugsInInv = new Set<string>();
  for (const e of classified) for (const f of e.features) featureSlugsInInv.add(f);
  const featureDocsSlugs = new Set(features.docs.map((d) => d.slug));
  const missingFeatures = [...featureSlugsInInv].filter((s) => !featureDocsSlugs.has(s));

  const moduleSlugsInInv = new Set(classified.map((e) => e.module));
  const moduleDocsSlugs = new Set(modules.docs.map((d) => d.slug));
  const missingModules = [...moduleSlugsInInv].filter((s) => !moduleDocsSlugs.has(s));

  console.log(`\n📚 Aggregation in ${ms} ms${dryRun ? ' (dry-run)' : ''}`);
  console.log(`   Feature docs   : ${features.docs.length} (${featureSlugsInInv.size} unique feature slugs in inventory)`);
  console.log(`   Module docs    : ${modules.docs.length} (${moduleSlugsInInv.size} unique modules in inventory)`);
  console.log(`   Hubs           : _schema.md, _index.md, _CHECKLIST.md, manual-work-docs.md`);
  void hubs;
  console.log(`   Shared hotspots: ${features.sharedHotspots.length}`);
  if (missingFeatures.length > 0) console.log(`   ⚠️  Missing features: ${missingFeatures.join(', ')}`);
  if (missingModules.length > 0) console.log(`   ⚠️  Missing modules: ${missingModules.join(', ')}`);

  console.log(`\n   Risk distribution:`);
  const byRisk = new Map<string, number>();
  for (const d of features.docs) byRisk.set(d.risk, (byRisk.get(d.risk) ?? 0) + 1);
  for (const [r, n] of byRisk) console.log(`     ${r.padEnd(8)} ${n}`);
})().catch((e) => {
  console.error(`\n❌ aggregate failed: ${e.message}`);
  process.exit(1);
});
