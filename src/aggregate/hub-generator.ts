// Hub-file generator — Phase 7.
// Emits the four vault-root hub files:
//   _schema.md          — frontmatter spec + observed type/module enums
//   _index.md           — architecture + start-here + lifecycle + features + modules + hotspots
//   _CHECKLIST.md       — every function by section, with file links
//   manual-work-docs.md — TODO markers seeded from placeholders in the body skeleton

import { join } from 'node:path';
import { writeIfChanged } from './write-if-changed.js';
import type { ClassifiedEntry, ClassifiedInventory, FunctionType } from '../classify/index.js';
import type { CallGraph } from '../graph/index.js';
import type { FeatureAggregateResult } from './feature-aggregator.js';
import type { ModuleDoc, ModuleAggregateResult } from './module-aggregator.js';
import { entryKey } from '../graph/index.js';

export interface HubOptions {
  inventory: ClassifiedInventory;
  graph: CallGraph;
  slugByKey: Map<string, string>;
  features: FeatureAggregateResult;
  modules: ModuleAggregateResult;
  outputRoot: string;
  rootClassFile?: string; // default 'src/visual.ts'
  rootClassName?: string; // default 'Visual'
  write?: boolean;
}

export interface HubFile {
  path: string;
  text: string;
}

export interface HubResult {
  schema: HubFile;
  index: HubFile;
  checklist: HubFile;
  manualWork: HubFile;
}

export async function generateHubs(opts: HubOptions): Promise<HubResult> {
  const rootClassFile = opts.rootClassFile ?? 'src/visual.ts';
  const rootClassName = opts.rootClassName ?? 'Visual';

  const schema: HubFile = {
    path: join(opts.outputRoot, '_schema.md'),
    text: renderSchema(opts.inventory),
  };
  const index: HubFile = {
    path: join(opts.outputRoot, '_index.md'),
    text: renderIndex(opts),
  };
  const checklist: HubFile = {
    path: join(opts.outputRoot, '_CHECKLIST.md'),
    text: renderChecklist(opts.inventory, opts.slugByKey, rootClassFile, rootClassName),
  };
  const manualWork: HubFile = {
    path: join(opts.outputRoot, 'manual-work-docs.md'),
    text: renderManualWork(opts),
  };

  if (opts.write !== false) {
    writeIfChanged(schema.path, schema.text);
    writeIfChanged(index.path, index.text);
    writeIfChanged(checklist.path, checklist.text);
    writeIfChanged(manualWork.path, manualWork.text);
  }
  return { schema, index, checklist, manualWork };
}

// ─── _schema.md ─────────────────────────────────────────────────────────────

function renderSchema(inventory: ClassifiedInventory): string {
  const types = uniqueSorted(inventory.map((e) => e.type));
  const modules = uniqueSorted(inventory.map((e) => e.module));

  const lines: string[] = [];
  lines.push('---');
  lines.push('type: index');
  lines.push('---');
  lines.push('# Frontmatter Schema Reference');
  lines.push('');
  lines.push('Every function `.md` in this vault carries a YAML frontmatter block. Obsidian reads it; Dataview queries it; LLMs use it for impact analysis.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Fields');
  lines.push('');
  lines.push('```yaml');
  lines.push('---');
  lines.push('source-file: src/path/to/file.ts');
  lines.push('module: <module-slug>');
  lines.push('type: <type-enum>');
  lines.push('features: [<feature-slug>, ...]');
  lines.push('called-by: [<caller-slug>, ...]');
  lines.push('hot-path: false');
  lines.push('---');
  lines.push('```');
  lines.push('');
  lines.push('| Field | Required | Type | Description |');
  lines.push('|---|---|---|---|');
  lines.push('| `source-file` | yes | string | Repo-relative path to the `.ts` / `.tsx` file |');
  lines.push('| `module` | yes | string | Logical module slug — see § Module values |');
  lines.push('| `type` | yes | string | Function category — see § Type values |');
  lines.push('| `features` | yes | string[] | Feature slugs this function participates in — see [[features/_features-index]] |');
  lines.push('| `called-by` | recommended | string[] | Doc slugs of direct callers. Bracketed tokens (`[sentinel]`) mark external callers |');
  lines.push('| `hot-path` | conditional | boolean | `true` for functions that run O(rows × cols) on every render |');
  lines.push('');
  lines.push('## Type values');
  lines.push('');
  lines.push('| Value | Meaning |');
  lines.push('|---|---|');
  for (const t of types) lines.push(`| \`${t}\` | ${typeMeaning(t)} |`);
  lines.push('');
  lines.push('## Module values');
  lines.push('');
  lines.push('Observed in this project:');
  lines.push('');
  for (const m of modules) lines.push(`- \`${m}\``);
  lines.push('');
  lines.push('## Dataview query examples');
  lines.push('');
  lines.push('List all hot-path functions:');
  lines.push('```dataview');
  lines.push('TABLE source-file, features');
  lines.push('FROM ""');
  lines.push('WHERE hot-path = true');
  lines.push('SORT file.name ASC');
  lines.push('```');
  lines.push('');
  lines.push('Find functions shared by 3+ features (high-risk change targets):');
  lines.push('```dataview');
  lines.push('TABLE source-file, length(features) AS feature-count');
  lines.push('FROM ""');
  lines.push('WHERE length(features) >= 3');
  lines.push('SORT length(features) DESC');
  lines.push('```');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## User-documentation frontmatter');
  lines.push('');
  lines.push('Docs under `guides/**` carry a separate frontmatter shape — they describe user-facing tasks, not source functions.');
  lines.push('');
  lines.push('```yaml');
  lines.push('---');
  lines.push('type: guide                              # guide | concept | workflow | troubleshooting | reference-user | persona | index');
  lines.push('audience: report-author                  # report-author | end-user | developer | admin');
  lines.push('complexity: beginner                     # beginner | intermediate | advanced');
  lines.push('prerequisites: [guides/getting-started/installation]');
  lines.push('related-settings: [settings/some-card]   # required when type=guide');
  lines.push('related-functions: [some-function-slug]  # consumer functions in the code-doc namespace');
  lines.push('related-features: [some-feature-slug]');
  lines.push('screenshots: [assets/screenshots/example-01.png]');
  lines.push('premium: false');
  lines.push('editmode-only: false');
  lines.push('---');
  lines.push('```');
  lines.push('');
  lines.push('| Field | Required | Notes |');
  lines.push('|---|---|---|');
  lines.push('| `type` | yes | One of the 7 enum values. `guide` is the default for how-to recipes |');
  lines.push('| `audience` | yes | Drives the G6 dev-jargon audit |');
  lines.push('| `complexity` | recommended | Helps the index group docs by reading order |');
  lines.push('| `prerequisites` | recommended | Slugs of guides to read first. Audit G2 verifies each one resolves |');
  lines.push('| `related-settings` | required for type=guide | Settings docs the recipe configures |');
  lines.push('| `related-functions` | recommended | Function slugs that read the settings touched in this guide. Reciprocal of `documented-by-guides:` on the function side |');
  lines.push('| `related-features` | recommended | Feature aggregate slugs |');
  lines.push('| `screenshots` | recommended | Paths relative to `guides/`. Audit G3 verifies they exist on disk |');
  lines.push('| `premium` | optional | `true` if the recipe requires a gated tier |');
  lines.push('| `editmode-only` | optional | `true` if the action only works in the product\'s edit mode |');
  lines.push('');
  lines.push('### Wikilink resolution rules for guides');
  lines.push('');
  lines.push('- From `guides/**`, ALWAYS use full-path wikilinks of the form `guides/how-to/<recipe>`, never the bare recipe slug alone. The same recipe slug may exist in other namespaces.');
  lines.push('- Bare slugs from `guides/**` are reserved for code-doc cross-links to the flat vault root (e.g. a function-doc slug).');
  lines.push('');
  return lines.join('\n').trimEnd() + '\n';
}

function typeMeaning(t: FunctionType | string): string {
  switch (t) {
    case 'callback': return 'Event handler / framework callback';
    case 'transform': return 'Pure or near-pure data transformation';
    case 'render': return 'Triggers or controls DOM / React rendering';
    case 'export': return 'Part of an export pipeline (PDF, Excel, etc.)';
    case 'component': return 'React component (returns JSX)';
    case 'hook': return 'React hook (`use*`)';
    case 'service': return 'Stateful service or class method';
    case 'util': return 'Pure utility with no side effects';
    case 'host': return 'Host API call or wrapper';
    case 'builtin': return 'Browser / runtime built-in';
    default: return '—';
  }
}

// ─── _index.md ──────────────────────────────────────────────────────────────

function renderIndex(opts: HubOptions): string {
  const { inventory, graph, slugByKey, features, modules } = opts;
  const totalDocs = inventory.length;

  const lines: string[] = [];
  lines.push('---');
  lines.push('type: index');
  lines.push('---');
  lines.push('# Documentation Index');
  lines.push('');
  lines.push(`> Master entry point. ${totalDocs} function docs, ${features.docs.length} feature${features.docs.length === 1 ? '' : 's'}, ${modules.docs.length} module${modules.docs.length === 1 ? '' : 's'}.`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Architecture sketch — placeholder for LLM enrichment.
  lines.push('## Architecture');
  lines.push('');
  lines.push(`<!-- TODO: replace with a 5-line architecture summary. -->`);
  lines.push(`The project surface is described by ${modules.docs.length} module overview${modules.docs.length === 1 ? '' : 's'} and ${features.docs.length} feature${features.docs.length === 1 ? '' : 's'}. See § Modules and § Features below for entry points.`);
  lines.push('');

  // Start-here-by-intent — generic + feature-driven rows.
  lines.push('## Start here by intent');
  lines.push('');
  lines.push('| I want to… | Start at |');
  lines.push('|---|---|');
  lines.push(`| Understand the frontmatter spec | [[_schema]] |`);
  lines.push(`| See all features and risk levels | [[features/_features-index]] |`);
  lines.push(`| Find every documented function | [[_CHECKLIST]] |`);
  lines.push(`| Open the end-user documentation | [[guides/_guides-index]] |`);
  lines.push(`| Track remaining enrichment work | [[manual-work-docs]] |`);
  for (const f of features.docs.slice(0, 8)) {
    lines.push(`| Understand ${f.displayName.toLowerCase()} | [[features/${f.slug}]] |`);
  }
  lines.push('');

  // Key lifecycle — top entries by incoming edge count.
  const incoming = new Map<string, number>();
  for (const node of graph.values()) {
    for (const c of node.calls) {
      if (c.startsWith('[')) continue;
      incoming.set(c, (incoming.get(c) ?? 0) + 1);
    }
  }
  const topByIncoming = [...incoming.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, n]) => ({ slug: slugByKey.get(k), count: n }))
    .filter((r) => r.slug);

  if (topByIncoming.length > 0) {
    lines.push('## Key lifecycle functions');
    lines.push('');
    lines.push('Top entries by incoming call edges (the more callers, the more central):');
    lines.push('');
    lines.push('| Function | Incoming edges |');
    lines.push('|---|---|');
    for (const r of topByIncoming) lines.push(`| [[${r.slug}]] | ${r.count} |`);
    lines.push('');
  }

  // Hot-path callbacks.
  const hotPath = inventory
    .filter((e) => e.hotPath)
    .map((e) => slugByKey.get(entryKey(e.file, e.name)))
    .filter((s): s is string => !!s)
    .sort();
  if (hotPath.length > 0) {
    lines.push('## Hot-path callbacks');
    lines.push('');
    lines.push('These run O(rows × cols) on every render. Allocations and synchronous work here directly affect scroll and render performance:');
    lines.push('');
    for (const s of hotPath) lines.push(`- [[${s}]]`);
    lines.push('');
  }

  // Features table.
  lines.push(`## Features (${features.docs.length})`);
  lines.push('');
  lines.push('| Feature | Doc | Risk | Functions |');
  lines.push('|---|---|---|---|');
  for (const d of features.docs) {
    lines.push(`| ${d.displayName} | [[features/${d.slug}]] | ${d.risk} | ${d.functionCount} |`);
  }
  lines.push('');

  // Modules table.
  lines.push(`## Modules (${modules.docs.length})`);
  lines.push('');
  lines.push('| Module | Source | Doc | Functions |');
  lines.push('|---|---|---|---|');
  for (const d of sortedModules(modules.docs)) {
    const filename = d.slug.replace(/\//g, '-');
    const src = d.sourceRoot ? `\`${d.sourceRoot}\`` : '—';
    lines.push(`| \`${d.slug}\` | ${src} | [[modules/${filename}]] | ${d.functionCount} |`);
  }
  lines.push('');

  // Shared-dependency hot spots.
  if (features.sharedHotspots.length > 0) {
    lines.push('## Shared-dependency hot spots');
    lines.push('');
    lines.push('Functions assigned to 3+ features — highest risk on change:');
    lines.push('');
    const seen = new Set<string>();
    for (const h of features.sharedHotspots) {
      if (seen.has(h.slug)) continue;
      seen.add(h.slug);
      lines.push(`- [[${h.slug}]] — ${h.features.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Reference');
  lines.push('');
  lines.push('- [[_schema]] — frontmatter field spec and enums');
  lines.push('- [[_CHECKLIST]] — every function by section');
  lines.push('- [[features/_features-index]] — full feature taxonomy');
  lines.push('- [[guides/_guides-index]] — end-user documentation');
  lines.push('- [[manual-work-docs]] — outstanding manual / LLM enrichment tasks');

  return lines.join('\n').trimEnd() + '\n';
}

function sortedModules(docs: ModuleDoc[]): ModuleDoc[] {
  return [...docs].sort((a, b) => {
    if (a.functionCount !== b.functionCount) return b.functionCount - a.functionCount;
    return a.slug.localeCompare(b.slug);
  });
}

// ─── _CHECKLIST.md ──────────────────────────────────────────────────────────

function renderChecklist(
  inventory: ClassifiedInventory,
  slugByKey: Map<string, string>,
  rootClassFile: string,
  rootClassName: string,
): string {
  const total = inventory.length;
  const lines: string[] = [];
  lines.push('# Documentation Checklist');
  lines.push('');
  lines.push(`> Tracks per-function documentation files. ${total} entries.`);
  lines.push('');
  lines.push('## Conventions');
  lines.push('');
  lines.push('- One `.md` file per inventory entry. Filename = kebab-case slug.');
  lines.push(`- \`${rootClassName}\` class methods → \`${kebabFromName(rootClassName)}-<method>.md\`.`);
  lines.push(`- Local helpers inside class methods → \`${kebabFromName(rootClassName)}-<method>-<helper>.md\`.`);
  lines.push('- Other entries → `<file-base>-<name>.md`. See [[_schema]] for frontmatter spec.');
  lines.push('- `[x]` marks a doc file present in the vault. Auto-generated — every line should be checked.');
  lines.push('');
  lines.push('---');
  lines.push('');

  const rootClassMethods: ClassifiedEntry[] = [];
  const rootClassLocals: ClassifiedEntry[] = [];
  const rest: ClassifiedEntry[] = [];
  for (const e of inventory) {
    if (e.file === rootClassFile && e.kind === 'class-method') rootClassMethods.push(e);
    else if (e.kind === 'local' && e.parent?.startsWith(`${rootClassName}.`)) rootClassLocals.push(e);
    else rest.push(e);
  }
  rootClassMethods.sort((a, b) => a.name.localeCompare(b.name));
  rootClassLocals.sort((a, b) => (a.parent ?? '').localeCompare(b.parent ?? '') || a.name.localeCompare(b.name));

  if (rootClassMethods.length > 0) {
    lines.push(`## C. ${rootClassName} class methods (${rootClassMethods.length})`);
    lines.push('');
    for (const e of rootClassMethods) lines.push(checklistLine(e, slugByKey));
    lines.push('');
  }

  if (rootClassLocals.length > 0) {
    lines.push(`## D. Local helpers inside ${rootClassName} methods (${rootClassLocals.length})`);
    lines.push('');
    let lastParent: string | null = null;
    for (const e of rootClassLocals) {
      if (e.parent !== lastParent) {
        if (lastParent !== null) lines.push('');
        lines.push(`### \`${e.parent}\``);
        lines.push('');
        lastParent = e.parent ?? null;
      }
      lines.push(checklistLine(e, slugByKey));
    }
    lines.push('');
  }

  // G. Project inventory — grouped by module.
  if (rest.length > 0) {
    lines.push(`## G. Project inventory (${rest.length})`);
    lines.push('');
    const byModule = new Map<string, ClassifiedEntry[]>();
    for (const e of rest) {
      const arr = byModule.get(e.module) ?? [];
      arr.push(e);
      byModule.set(e.module, arr);
    }
    const modules = [...byModule.keys()].sort((a, b) => {
      const an = byModule.get(a)!.length;
      const bn = byModule.get(b)!.length;
      if (an !== bn) return bn - an;
      return a.localeCompare(b);
    });
    for (const m of modules) {
      const items = byModule.get(m)!.sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name));
      lines.push(`### G.\`${m}\` (${items.length})`);
      lines.push('');
      for (const e of items) lines.push(checklistLine(e, slugByKey));
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}

function checklistLine(e: ClassifiedEntry, slugByKey: Map<string, string>): string {
  const slug = slugByKey.get(entryKey(e.file, e.name)) ?? '';
  const localName = e.name.includes('.') ? e.name.split('.').pop()! : e.name;
  const label = e.kind === 'local' ? `${localName} (local)` : localName;
  return `- [x] [${label}](${slug}.md)`;
}

function kebabFromName(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// ─── manual-work-docs.md ────────────────────────────────────────────────────

function renderManualWork(opts: HubOptions): string {
  const { inventory, features, modules } = opts;
  const functionTodoCount = inventory.length; // every Phase 4 body has a Behaviour TODO
  const featureTodoCount = features.docs.length;
  const moduleTodoCount = modules.docs.length;

  const lines: string[] = [];
  lines.push('# Manual Work — Documentation Build');
  lines.push('');
  lines.push('> Tracks documentation tasks that require human or LLM enrichment beyond the deterministic skeleton.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Phase A — Function Behaviour narratives');
  lines.push('');
  lines.push(`- [ ] Replace \`<!-- TODO -->\` Behaviour blocks in ${functionTodoCount} function doc${functionTodoCount === 1 ? '' : 's'}.`);
  lines.push('  - Each one should describe key invariants, exit paths, or phase ordering.');
  lines.push('  - Karpathy R1: first body line must be fact-first.');
  lines.push('');
  lines.push('## Phase B — Feature pipeline narratives');
  lines.push('');
  lines.push(`- [ ] Replace \`<!-- TODO -->\` summary in ${featureTodoCount} feature doc${featureTodoCount === 1 ? '' : 's'}.`);
  lines.push('  - Add Core pipeline section describing entry → transform → output flow.');
  lines.push('');
  lines.push('## Phase C — Module narratives');
  lines.push('');
  lines.push(`- [ ] Replace \`<!-- TODO -->\` summary in ${moduleTodoCount} module doc${moduleTodoCount === 1 ? '' : 's'}.`);
  lines.push('  - Describe each module\'s responsibility and primary entry component / service.');
  lines.push('');
  lines.push('## Phase D — Architecture sketch in `_index.md`');
  lines.push('');
  lines.push('- [ ] Replace the `<!-- TODO -->` block in `_index.md` § Architecture with a 5-line summary.');
  lines.push('  - Walk the read from host call → data transform → render → DOM patch.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('> All Karpathy R1 / R3 / R4 audits already pass on the deterministic skeleton (verified by `audit-quality.mjs`). The enrichment work above does not need to fix audits — it adds the *content* that audits cannot generate.');
  return lines.join('\n').trimEnd() + '\n';
}

function uniqueSorted(arr: string[]): string[] {
  return [...new Set(arr)].sort();
}
