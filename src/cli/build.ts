#!/usr/bin/env node
// CLI: full orchestrated build with drift detection.
//
// Usage:
//   npm run build:vault -- <projectRoot> [--config <path>] [--output <dir>]
//                                        [--plan] [--regenerate] [--skip-audit]

import { resolve, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { build } from '../orchestrator.js';
import type { FeatureTaxonomyEntry } from '../classify/index.js';

interface CliConfig {
  moduleMap?: Record<string, string>;
  featureTaxonomy?: FeatureTaxonomyEntry[];
  hotPathPatterns?: string[];
  slugPrefixRules?: { filePattern?: string; namePattern?: string; prefix: string }[];
  rootClassFile?: string;
  rootClassName?: string;
}

const args = process.argv.slice(2);
let projectRoot = process.cwd();
let configPath: string | undefined;
let outputDir: string | undefined;
let plan = false;
let regenerate = false;
let skipAudit = false;
let skipQuality = false;
let skipGuides = false;
let projectName: string | undefined;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--config') configPath = resolve(args[++i]);
  else if (a === '--output') outputDir = args[++i];
  else if (a === '--plan') plan = true;
  else if (a === '--regenerate') regenerate = true;
  else if (a === '--skip-audit') skipAudit = true;
  else if (a === '--skip-quality') skipQuality = true;
  else if (a === '--skip-guides') skipGuides = true;
  else if (a === '--project-name') projectName = args[++i];
  else if (a && !a.startsWith('--')) projectRoot = resolve(a);
}

(async () => {
  const config: CliConfig = configPath ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
  const outputRoot = outputDir ? resolve(outputDir) : join(projectRoot, 'documentation');

  const start = Date.now();
  const result = await build({
    projectRoot,
    outputRoot,
    taxonomy: config.featureTaxonomy,
    moduleMap: config.moduleMap,
    hotPathPatterns: config.hotPathPatterns?.map((p) => new RegExp(p)),
    slugPrefixRules: config.slugPrefixRules?.map((r) => ({
      filePattern: r.filePattern ? new RegExp(r.filePattern) : undefined,
      namePattern: r.namePattern ? new RegExp(r.namePattern) : undefined,
      prefix: r.prefix,
    })),
    rootClassFile: config.rootClassFile,
    rootClassName: config.rootClassName,
    plan,
    regenerate,
    skipAudit,
    skipQuality,
    skipGuides,
    projectName,
  });
  const ms = Date.now() - start;

  const c = result.drift.counts;
  console.log(`\n📦 Drift summary (${ms} ms)`);
  console.log(`   added     : ${c.added}`);
  console.log(`   removed   : ${c.removed}`);
  console.log(`   renamed   : ${c.renamed}`);
  console.log(`   moved     : ${c.moved}`);
  console.log(`   updated   : ${c.updated}`);
  console.log(`   unchanged : ${c.unchanged}`);

  if (plan) {
    const examples = result.drift.deltas.filter((d) => d.kind !== 'unchanged').slice(0, 10);
    if (examples.length > 0) {
      console.log(`\n   Sample non-unchanged deltas:`);
      for (const d of examples) {
        if (d.kind === 'added' || d.kind === 'removed') {
          console.log(`     ${d.kind.padEnd(9)} ${d.entry.file}::${d.entry.name}`);
        } else {
          console.log(`     ${d.kind.padEnd(9)} ${d.oldEntry.file}::${d.oldEntry.name} → ${d.newEntry.file}::${d.newEntry.name}`);
        }
      }
    }
    console.log(`\n--plan mode: no files written.`);
    return;
  }

  console.log(`\n📝 Generation`);
  console.log(`   Written          : ${result.generate.written}`);
  console.log(`   Skipped unchanged: ${result.generate.skippedUnchanged}`);
  if (result.removed.length > 0) console.log(`   Removed files    : ${result.removed.length}`);
  if (result.renamed.length > 0) console.log(`   Renamed files    : ${result.renamed.length}`);
  console.log(`\n🔗 Link resolution`);
  console.log(`   Rewritten        : ${result.link.rewritten}`);
  console.log(`   Unchanged        : ${result.link.unchanged}`);
  console.log(`\n📚 Aggregates`);
  console.log(`   Features         : ${result.aggregate.features}`);
  console.log(`   Modules          : ${result.aggregate.modules}`);
  if (result.aggregate.guidesCreated + result.aggregate.guidesSkipped > 0) {
    console.log(`   Guides scaffold  : ${result.aggregate.guidesCreated} created, ${result.aggregate.guidesSkipped} kept`);
  }

  if (result.quality) {
    const q = result.quality;
    console.log(`\n🧪 Quality (Karpathy R1/R2/R3/R4)`);
    console.log(`   Audited          : ${q.audited}`);
    console.log(`   Initial pass     : ${q.initialPass}`);
    console.log(`   Auto-fixed       : ${q.autoFixed}`);
    console.log(`   Needs review     : ${q.needsReview.length}`);
    if (q.autoFixed > 0) {
      const counts = Object.entries(q.fixCounts).filter(([, n]) => n > 0).map(([r, n]) => `${r}=${n}`).join(', ');
      console.log(`   Fixes applied    : ${counts}`);
    }
    if (q.needsReview.length > 0) {
      console.log(`\n   Sample needs-review:`);
      for (const item of q.needsReview.slice(0, 5)) {
        console.log(`     ${item.slug.padEnd(50)} ${item.failedRules.join(', ')}`);
      }
    }
  }

  console.log(`\n✅ Build complete. Vault: ${result.outputRoot}`);
})().catch((e) => {
  console.error(`\n❌ build failed: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
