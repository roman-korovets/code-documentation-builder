#!/usr/bin/env node
// CLI: install audit scripts into the vault, populate TARGETS, optionally run.
//
// Usage:
//   npm run audit -- <projectRoot> [--config <path>] [--output <dir>]
//                                  [--no-install] [--no-run] [--top-linked N]

import { resolve, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { discover } from '../discover/index.js';
import { classify, type FeatureTaxonomyEntry } from '../classify/index.js';
import { buildCallGraph } from '../graph/index.js';
import { resolveSlugs } from '../generate/slug-resolver.js';
import { aggregateFeatures } from '../aggregate/feature-aggregator.js';
import { installAudits, runAudits } from '../audit/index.js';

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
let doInstall = true;
let doRun = true;
let topLinked = 3;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--config') configPath = resolve(args[++i]);
  else if (a === '--output') outputDir = args[++i];
  else if (a === '--no-install') doInstall = false;
  else if (a === '--no-run') doRun = false;
  else if (a === '--top-linked') topLinked = Number(args[++i]);
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
  const features = await aggregateFeatures({
    inventory: classified,
    slugByKey: byKey,
    taxonomy: config.featureTaxonomy ?? [],
    outputRoot,
    write: false,
  });

  let installed: { targets: string[] } | null = null;
  if (doInstall) {
    installed = await installAudits({
      inventory: classified,
      graph,
      slugByKey: byKey,
      sharedHotspots: features.sharedHotspots,
      outputRoot,
      topLinkedCount: topLinked,
    });
    console.log(`\n🛠  Audits installed (${Date.now() - start} ms)`);
    console.log(`   audit-links.mjs    : ${join(outputRoot, 'audit-links.mjs')}`);
    console.log(`   audit-quality.mjs  : ${join(outputRoot, 'audit-quality.mjs')}`);
    console.log(`   TARGETS auto-set   : ${installed.targets.length}`);
  }

  if (doRun) {
    const report = await runAudits({ outputRoot });
    console.log(`\n📋 audit-links`);
    console.log(`   Broken wikilinks   : ${report.links.broken}`);
    console.log(`\n📋 audit-quality`);
    console.log(`   TARGETS audited    : ${report.quality.targets}`);
    console.log(`   R1 fails           : ${report.quality.r1Fails}`);
    console.log(`   R3 fails           : ${report.quality.r3Fails}`);
    console.log(`   R4 fails           : ${report.quality.r4Fails}`);

    if (report.links.broken > 0 || report.quality.r1Fails + report.quality.r3Fails + report.quality.r4Fails > 0) {
      console.log(`\n❌ Gate FAILED.`);
      process.exit(1);
    }
    console.log(`\n✅ Gate passed.`);
  }
})().catch((e) => {
  console.error(`\n❌ audit failed: ${e.message}`);
  process.exit(1);
});
