// Aggregation — Phases 6 + 7.
// Builds features/<slug>.md, modules/<slug>.md, and the four vault-root hubs:
// _schema, _index, _CHECKLIST, manual-work-docs.

import type { ClassifiedInventory } from '../classify/index.js';
import type { FeatureTaxonomyEntry } from '../classify/feature-classifier.js';
import type { CallGraph } from '../graph/index.js';
import { aggregateFeatures, type FeatureAggregateResult } from './feature-aggregator.js';
import { aggregateModules, type ModuleAggregateResult } from './module-aggregator.js';
import { generateHubs, type HubResult } from './hub-generator.js';
import { scaffoldGuides, type ScaffoldResult, type SectionSpec } from './guide-scaffolder.js';

export interface AggregateOptions {
  inventory: ClassifiedInventory;
  graph: CallGraph;
  slugByKey: Map<string, string>;
  taxonomy: FeatureTaxonomyEntry[];
  projectRoot: string;
  outputRoot: string;
  rootClassFile?: string;
  rootClassName?: string;
  /** Project name shown in the guides intro (defaults to "this project"). */
  projectName?: string;
  /** Override default guide sections. */
  guideSections?: SectionSpec[];
  /** Skip guides scaffolding (e.g. for code-only projects). */
  skipGuides?: boolean;
  write?: boolean;
}

export interface AggregateResult {
  features: FeatureAggregateResult;
  modules: ModuleAggregateResult;
  hubs: HubResult;
  guides?: ScaffoldResult;
}

export async function aggregate(opts: AggregateOptions): Promise<AggregateResult> {
  const features = await aggregateFeatures({
    inventory: opts.inventory,
    slugByKey: opts.slugByKey,
    taxonomy: opts.taxonomy,
    outputRoot: opts.outputRoot,
    write: opts.write,
  });
  const modules = await aggregateModules({
    inventory: opts.inventory,
    slugByKey: opts.slugByKey,
    projectRoot: opts.projectRoot,
    outputRoot: opts.outputRoot,
    write: opts.write,
  });
  const hubs = await generateHubs({
    inventory: opts.inventory,
    graph: opts.graph,
    slugByKey: opts.slugByKey,
    features,
    modules,
    outputRoot: opts.outputRoot,
    rootClassFile: opts.rootClassFile,
    rootClassName: opts.rootClassName,
    write: opts.write,
  });

  let guides: ScaffoldResult | undefined;
  if (!opts.skipGuides) {
    guides = await scaffoldGuides({
      outputRoot: opts.outputRoot,
      sections: opts.guideSections,
      projectName: opts.projectName,
      write: opts.write,
    });
  }

  return { features, modules, hubs, guides };
}

export { aggregateFeatures, aggregateModules, generateHubs, scaffoldGuides };
