// Body generator — Phase 4.3.
// Emits a deterministic skeleton from inventory + graph data alone. Sections:
// Origin, Signature, Behaviour (TODO), Called by, Calls, Related. The Behaviour
// section is a placeholder that an LLM enrichment pass can fill in later.
//
// R1 (fact-first first line): the first non-skipped line is always a `- **File:**`
// bullet inside § Origin — never matches the FILLERS regex in audit-quality.
// R3 (≥1 outgoing link): always emit either wikilinks in Called by / Calls or
// fall back to a § Related section that links to the source file path.

import { basename } from 'node:path';
import type { ClassifiedEntry } from '../classify/index.js';

export interface BodyInput {
  entry: ClassifiedEntry;
  callerSlugs: string[]; // mix of slugs and `[sentinel]` tokens
  calleeSlugs: string[]; // same shape
}

export function buildBody(input: BodyInput): string {
  const { entry, callerSlugs, calleeSlugs } = input;
  const local = entry.name.includes('.') ? entry.name.split('.').pop()! : entry.name;
  const fileBase = basename(entry.file);
  const lines: string[] = [];

  lines.push(`# \`${local}\` (\`${fileBase}\`)`);
  lines.push('');
  lines.push(`> ${oneLineSummary(entry)}`);
  lines.push('');

  if (entry.hotPath) {
    lines.push('⚠️ **HOT PATH** — runs on every row / cell render. Avoid allocations.');
    lines.push('');
  }

  lines.push('## 1. Origin');
  lines.push(`- **File:** \`${entry.file}:${entry.lineRange}\``);
  lines.push(`- **Exported as:** ${formatKind(entry)}`);
  lines.push('');

  lines.push('## 2. Signature');
  lines.push('```ts');
  lines.push(entry.signature);
  lines.push('```');
  lines.push('');

  lines.push('## 3. Behaviour');
  lines.push('<!-- TODO: describe key invariants, exit paths, or phase ordering -->');
  lines.push('');

  lines.push('## 4. Called by');
  appendRefList(lines, callerSlugs);
  lines.push('');

  lines.push('## 5. Calls');
  appendRefList(lines, calleeSlugs);
  lines.push('');

  // Outgoing-link guarantee (R3): if neither callers nor callees produced a
  // wikilink, link to the source file path via a markdown link.
  const hasWikilink = [...callerSlugs, ...calleeSlugs].some((s) => s && !s.startsWith('['));
  if (!hasWikilink) {
    lines.push('## 6. Related');
    lines.push(`- [Source: ${entry.file}](../${entry.file})`);
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

function oneLineSummary(entry: ClassifiedEntry): string {
  const local = entry.name.includes('.') ? entry.name.split('.').pop()! : entry.name;
  return `\`${local}\` — ${formatKind(entry)} in \`${entry.file}\`.`;
}

function formatKind(entry: ClassifiedEntry): string {
  switch (entry.kind) {
    case 'named-export':
      return 'named export';
    case 'default':
      return 'default export';
    case 'class-method':
      return entry.parent ? `${entry.parent} class method` : 'class method';
    case 'arrow-const':
      return 'arrow constant';
    case 'local':
      return entry.parent ? `local helper in \`${entry.parent}\`` : 'local helper';
  }
}

function appendRefList(lines: string[], refs: string[]): void {
  if (refs.length === 0) {
    lines.push('- _none_');
    return;
  }
  for (const r of refs) {
    if (r.startsWith('[') && r.endsWith(']')) {
      lines.push(`- _${r.slice(1, -1)}_`);
    } else {
      lines.push(`- [[${r}]]`);
    }
  }
}
