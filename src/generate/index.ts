// Doc generation — Phase 4.
// For each classified entry: build frontmatter (deterministic from data),
// resolve slug, generate body skeleton. LLM-driven body enrichment is a
// downstream pass; this phase emits valid, R1/R3-passing skeletons.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ClassifiedEntry, ClassifiedInventory } from '../classify/index.js';
import type { CallGraph } from '../graph/index.js';
import { entryKey } from '../graph/index.js';
import { buildFrontmatter } from './frontmatter-builder.js';
import { buildBody } from './body-generator.js';
import { resolveSlugs, type SlugPrefixRule } from './slug-resolver.js';

export interface GeneratedDoc {
  slug: string;
  path: string;
  frontmatter: string;
  body: string;
  fullText: string;
}

export interface GenerateOptions {
  inventory: ClassifiedInventory;
  graph: CallGraph;
  outputRoot: string;
  slugPrefixRules?: SlugPrefixRule[];
  write?: boolean;
}

export interface GenerateResult {
  docs: GeneratedDoc[];
  slugByKey: Map<string, string>;
  written: number;
  skippedUnchanged: number;
}

export async function generateFunctionDocs(opts: GenerateOptions): Promise<GenerateResult> {
  const { slugs, byKey } = resolveSlugs(opts.inventory, { prefixRules: opts.slugPrefixRules });
  const docs: GeneratedDoc[] = [];

  if (opts.write !== false) mkdirSync(opts.outputRoot, { recursive: true });

  let written = 0;
  let skippedUnchanged = 0;

  for (let i = 0; i < opts.inventory.length; i++) {
    const entry = opts.inventory[i];
    const slug = slugs[i];
    const doc = generateOne(entry, opts.graph, byKey, opts.outputRoot, slug);
    docs.push(doc);
    if (opts.write !== false) {
      if (existsSync(doc.path) && readFileSync(doc.path, 'utf8') === doc.fullText) {
        skippedUnchanged++;
      } else {
        writeFileSync(doc.path, doc.fullText, 'utf8');
        written++;
      }
    }
  }

  return { docs, slugByKey: byKey, written, skippedUnchanged };
}

export function generateOne(
  entry: ClassifiedEntry,
  graph: CallGraph,
  slugByKey: Map<string, string>,
  outputRoot: string,
  slug: string,
): GeneratedDoc {
  const node = graph.get(entryKey(entry.file, entry.name));
  const calledBy = mapRefs(node?.calledBy ?? [], slugByKey);
  const calls = mapRefs(node?.calls ?? [], slugByKey);

  const frontmatter = buildFrontmatter({ entry, calledBy });
  const body = buildBody({ entry, callerSlugs: calledBy, calleeSlugs: calls });
  const fullText = `${frontmatter}\n${body}`;
  const path = join(outputRoot, `${slug}.md`);

  return { slug, path, frontmatter, body, fullText };
}

function mapRefs(refs: string[], slugByKey: Map<string, string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of refs) {
    let token: string;
    if (r.startsWith('[')) token = r;
    else {
      const s = slugByKey.get(r);
      if (!s) continue;
      token = s;
    }
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}
