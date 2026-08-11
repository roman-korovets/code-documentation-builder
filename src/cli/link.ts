#!/usr/bin/env node
// CLI: re-pass link resolution over an existing vault.
//
// Usage:
//   npm run link -- <projectRoot> [--config <path>] [--docs <dir>] [--dry-run]

import { resolve, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { discover } from '../discover/index.js';
import { classify, type FeatureTaxonomyEntry } from '../classify/index.js';
import { buildCallGraph } from '../graph/index.js';
import { resolveSlugs } from '../generate/slug-resolver.js';
import { resolveLinks } from '../generate/link-resolver.js';

interface CliConfig {
  moduleMap?: Record<string, string>;
  featureTaxonomy?: FeatureTaxonomyEntry[];
  hotPathPatterns?: string[];
  slugPrefixRules?: { filePattern?: string; namePattern?: string; prefix: string }[];
}

const args = process.argv.slice(2);
let projectRoot = process.cwd();
let configPath: string | undefined;
let docsDir: string | undefined;
let dryRun = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--config') configPath = resolve(args[++i]);
  else if (a === '--docs') docsDir = args[++i];
  else if (a === '--dry-run') dryRun = true;
  else if (a && !a.startsWith('--')) projectRoot = resolve(a);
}

(async () => {
  const config: CliConfig = configPath ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
  const docRoot = docsDir ? resolve(docsDir) : join(projectRoot, 'documentation');

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

  const result = await resolveLinks({
    inventory: classified,
    graph,
    slugByKey: byKey,
    docRoot,
    write: !dryRun,
  });
  const ms = Date.now() - start;

  const reasonCounts = new Map<string, number>();
  for (const f of result.fixes) for (const r of f.reasons) reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1);

  console.log(`\n🔗 Link resolution in ${ms} ms${dryRun ? ' (dry-run)' : ''}`);
  console.log(`   Scanned     : ${result.scanned}`);
  console.log(`   Rewritten   : ${result.rewritten}`);
  console.log(`   Unchanged   : ${result.unchanged}`);
  if (reasonCounts.size > 0) {
    console.log(`\n   By reason:`);
    for (const [r, n] of [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`     ${r.padEnd(25)} ${n}`);
    }
  }
})().catch((e) => {
  console.error(`\n❌ link failed: ${e.message}`);
  process.exit(1);
});
