// Guide scaffolder — Phase 15.
// Emits a `documentation/guides/` skeleton for user-facing documentation:
//   guides/
//   ├── _guides-index.md     ← master entry point
//   ├── _personas.md         ← who reads what
//   ├── _glossary.md         ← project vocabulary
//   ├── getting-started/_section-index.md
//   ├── concepts/_section-index.md
//   ├── how-to/_section-index.md
//   ├── workflows/_section-index.md
//   ├── troubleshooting/_section-index.md
//   ├── reference/_section-index.md
//   └── assets/screenshots/.gitkeep
//
// Critically idempotent: NEVER overwrites a file that already exists. Guides
// are human-written; the plugin only provides empty scaffolding so the user
// knows where to put things. Once a file is on disk it's the user's.

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface GuideScaffoldOptions {
  outputRoot: string;
  /** Override the default six sections — useful for projects that don't need workflows / reference. */
  sections?: SectionSpec[];
  /** Project display name for the _guides-index intro. */
  projectName?: string;
  write?: boolean;
}

export interface SectionSpec {
  slug: string;
  displayName: string;
  description: string;
}

export interface ScaffoldResult {
  created: string[];
  skipped: string[];
}

export const DEFAULT_SECTIONS: SectionSpec[] = [
  { slug: 'getting-started', displayName: 'Getting started', description: 'First-touch flow for new users. Beginner complexity, no prerequisites.' },
  { slug: 'concepts',        displayName: 'Concepts',        description: 'Mental model the rest of the vault assumes. Read these once.' },
  { slug: 'how-to',          displayName: 'How-to recipes',  description: 'One task-oriented recipe per feature / setting. One file = one user task.' },
  { slug: 'workflows',       displayName: 'Workflows',       description: 'Multi-feature playbooks that chain several how-tos.' },
  { slug: 'troubleshooting', displayName: 'Troubleshooting', description: 'Symptom → likely cause → diagnostic → fix. Every leaf links to a how-to or concept.' },
  { slug: 'reference',       displayName: 'Reference',       description: 'Lookup tables — presets, limits, shortcuts.' },
];

export async function scaffoldGuides(opts: GuideScaffoldOptions): Promise<ScaffoldResult> {
  const sections = opts.sections ?? DEFAULT_SECTIONS;
  const projectName = opts.projectName ?? 'this project';
  const result: ScaffoldResult = { created: [], skipped: [] };

  const guidesDir = join(opts.outputRoot, 'guides');
  if (opts.write !== false) {
    mkdirSync(guidesDir, { recursive: true });
    mkdirSync(join(guidesDir, 'assets', 'screenshots'), { recursive: true });
    for (const s of sections) mkdirSync(join(guidesDir, s.slug), { recursive: true });
  }

  const write = (relPath: string, content: string): void => {
    const full = join(guidesDir, relPath);
    if (existsSync(full)) {
      result.skipped.push(relPath);
      return;
    }
    if (opts.write !== false) writeFileSync(full, content, 'utf8');
    result.created.push(relPath);
  };

  write('_guides-index.md', renderGuidesIndex(sections, projectName));
  write('_personas.md', renderPersonas());
  write('_glossary.md', renderGlossary());
  write('assets/screenshots/.gitkeep', '');

  for (const s of sections) {
    write(`${s.slug}/_section-index.md`, renderSectionIndex(s));
  }

  return result;
}

// ─── Templates ──────────────────────────────────────────────────────────

function renderGuidesIndex(sections: SectionSpec[], projectName: string): string {
  const lines: string[] = [];
  lines.push('---');
  lines.push('type: index');
  lines.push('audience: report-author');
  lines.push('---');
  lines.push('# User Documentation — Index');
  lines.push('');
  lines.push(`> Master entry point for user-facing documentation of ${projectName}. Audience: **end user** of the product. Developer / function-level docs live in the vault root (see [[_index]]).`);
  lines.push('');
  lines.push('See [[_schema]] § User-documentation frontmatter for the field spec used across `guides/**`.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Quick start by persona');
  lines.push('');
  lines.push('| I am… | Start here |');
  lines.push('|---|---|');
  lines.push('| A new user opening the product for the first time | [[guides/getting-started/_section-index]] |');
  lines.push('| An experienced user configuring a specific feature | [[guides/how-to/_section-index]] |');
  lines.push('| Trying to fix something that doesn\'t work as expected | [[guides/troubleshooting/_section-index]] |');
  lines.push('| Trying to understand how the product thinks about data | [[guides/concepts/_section-index]] |');
  lines.push('| Planning a multi-feature scenario | [[guides/workflows/_section-index]] |');
  lines.push('| Looking up a preset, limit, or shortcut | [[guides/reference/_section-index]] |');
  lines.push('| Curious who this documentation is written for | [[guides/_personas]] |');
  lines.push('| Wondering what a term means | [[guides/_glossary]] |');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Sections');
  lines.push('');
  for (const s of sections) {
    lines.push(`### ${s.displayName}`);
    lines.push(s.description);
    lines.push('');
    lines.push(`→ [[guides/${s.slug}/_section-index]]`);
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push('## How user docs cross-reference code docs');
  lines.push('');
  lines.push('Each how-to lists in its frontmatter:');
  lines.push('');
  lines.push('- `related-settings:` — Settings docs the recipe configures.');
  lines.push('- `related-functions:` — Consumer functions that read those settings. Wikilinks resolve into the flat code-doc namespace at vault root.');
  lines.push('- `related-features:` — Feature aggregates under `features/`.');
  lines.push('');
  lines.push('This makes the bidirectional graph complete: a developer changing a function can find the user guide affected; an end user hitting an issue can find the code path responsible.');
  lines.push('');
  lines.push('## Conventions');
  lines.push('');
  lines.push('- All wikilinks from `guides/**` use **full paths** of the form `guides/how-to/<recipe>`, not the bare slug alone. See [[_schema]] § Wikilink resolution rules for guides.');
  lines.push('- Plain language in `audience: report-author` / `audience: end-user` docs — developer-only terms (engine internals, code symbols, project file names) stay in the code namespace.');
  lines.push('- Screenshots live under `assets/screenshots/`, named `<guide-slug>-NN.png`.');
  lines.push('- Every guide ends with a `## Related` section linking ≥ 1 outside node.');
  return lines.join('\n').trimEnd() + '\n';
}

function renderPersonas(): string {
  return [
    '---',
    'type: persona',
    'audience: report-author',
    '---',
    '# Personas — Who this documentation is for',
    '',
    '> Two or three audiences interact with this product and its documentation. The `audience:` frontmatter field on every guide tells you who the doc is written for.',
    '',
    '> <!-- TODO: edit the persona descriptions below to match your project. The defaults below are generic and assume an end-user + developer split. -->',
    '',
    '---',
    '',
    '## End User *(primary audience)*',
    '',
    '**Who.** A user of the product. Configures it through its UI, does not read source code.',
    '',
    '**Goal.** Get the product to do what they need without learning its internals.',
    '',
    '**Reads.** Every doc tagged `audience: end-user` (or `audience: report-author` for Power-BI-style products). Starts at [[guides/getting-started/_section-index]].',
    '',
    '**Does not need.** Code-level docs at vault root, function call hierarchies, internal-graph edges.',
    '',
    '---',
    '',
    '## Developer *(secondary audience)*',
    '',
    '**Who.** An engineer extending or fixing the product. Reads the source.',
    '',
    '**Goal.** Add a feature, fix a bug, understand impact.',
    '',
    '**Reads.** The flat function-level docs at vault root (see [[_index]]) plus `features/`, `modules/`. May open a user guide to confirm the user-visible behaviour of a change.',
    '',
    '**Reciprocal entry.** A function doc lists every guide that documents it (`documented-by-guides:`). Traversal works in both directions.',
    '',
    '---',
    '',
    '## Mapping persona → section',
    '',
    '| Section | End User | Developer |',
    '|---|---|---|',
    '| `guides/getting-started/` | ✅ primary | ◯ reads installation |',
    '| `guides/concepts/` | ✅ primary | ◯ reference |',
    '| `guides/how-to/` | ✅ primary | ◯ when changing a setting |',
    '| `guides/workflows/` | ✅ primary | — |',
    '| `guides/troubleshooting/` | ✅ primary | ◯ to confirm visible symptom |',
    '| `guides/reference/` | ✅ primary | ◯ reference |',
    '| Vault root (function docs) | — | ✅ primary |',
    '| `features/`, `modules/` | — | ✅ primary |',
    '',
    '✅ primary · ◯ occasional · — not their target',
    '',
    '## Related',
    '',
    '- [[guides/_guides-index]]',
    '- [[guides/_glossary]]',
    '',
  ].join('\n');
}

function renderGlossary(): string {
  return [
    '---',
    'type: reference-user',
    'audience: report-author',
    'complexity: beginner',
    '---',
    '# Glossary — User-facing terms',
    '',
    '> Plain-language definitions for terms the product uses in its UI and the documentation.',
    '',
    '> <!-- TODO: replace the placeholder entries below with real terms from your product. Group by topic. Cross-link each entry to the relevant concept or how-to via full-path wikilinks. -->',
    '',
    '---',
    '',
    '## Example category',
    '',
    '- **Term A** — one-sentence plain-language definition. Cross-link to the relevant `guides/concepts/<slug>` doc once you have one.',
    '- **Term B** — definition. Cross-link to `guides/how-to/<slug>` for the typical use.',
    '',
    '## Related',
    '',
    '- [[guides/_guides-index]]',
    '- [[guides/_personas]]',
    '',
  ].join('\n');
}

function renderSectionIndex(s: SectionSpec): string {
  return [
    '---',
    'type: index',
    'audience: report-author',
    '---',
    `# ${s.displayName} — Section Index`,
    '',
    `> ${s.description}`,
    '',
    'Back to [[guides/_guides-index]].',
    '',
    '> <!-- TODO: add a table of docs in this section. Until docs are written, this is an empty placeholder. -->',
    '',
    '---',
    '',
    '## Docs in this section',
    '',
    '_None yet. Drop new docs into this directory; their slugs become `guides/' + s.slug + '/<filename>`._',
    '',
    '---',
    '',
    '## Related',
    '',
    '- [[guides/_guides-index]]',
    '',
  ].join('\n');
}
