// Quality enforcement loop — Phase 11.
// Walks every function doc in the vault. For each:
//   1. Audit R1 / R2 / R3 / R4.
//   2. If any rule fails, run the deterministic auto-fixer.
//   3. Re-audit.
//   4. If anything still fails, stamp `quality: needs-review` in frontmatter
//      and add a checklist entry under manual-work-docs.md.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ClassifiedInventory } from '../classify/index.js';
import { entryKey } from '../graph/index.js';
import { auditDoc, type DocVerdict } from './auditor.js';
import { autoFixDoc } from './auto-fix.js';

export interface EnforceOptions {
  inventory: ClassifiedInventory;
  slugByKey: Map<string, string>;
  outputRoot: string;
  /** Skip the manual-work-docs.md TODO append (the orchestrator does that). */
  silentReport?: boolean;
  write?: boolean;
}

export interface EnforceReport {
  audited: number;
  initialPass: number;
  autoFixed: number;
  needsReview: { slug: string; failedRules: string[] }[];
  fixCounts: Record<string, number>; // rule → number of docs that needed that fix
}

export async function enforceQuality(opts: EnforceOptions): Promise<EnforceReport> {
  const report: EnforceReport = {
    audited: 0,
    initialPass: 0,
    autoFixed: 0,
    needsReview: [],
    fixCounts: { r1: 0, r2: 0, r3: 0, r4: 0 },
  };

  const sourceFileBySlug = new Map<string, string>();
  const factFirstBySlug = new Map<string, string>();
  for (const e of opts.inventory) {
    const slug = opts.slugByKey.get(entryKey(e.file, e.name));
    if (!slug) continue;
    sourceFileBySlug.set(slug, e.file);
    const local = e.name.includes('.') ? e.name.split('.').pop()! : e.name;
    factFirstBySlug.set(slug, `at \`${e.file}:${e.lineRange}\` as the \`${local}\` function`);
  }

  for (const slug of sourceFileBySlug.keys()) {
    const path = join(opts.outputRoot, `${slug}.md`);
    if (!existsSync(path)) continue;
    const original = readFileSync(path, 'utf8');
    report.audited++;

    const firstVerdict = auditDoc(original);
    if (firstVerdict.failedRules.length === 0) {
      report.initialPass++;
      continue;
    }

    const { text: fixed, applied } = autoFixDoc(original, {
      sourceFile: sourceFileBySlug.get(slug)!,
      factFirstLead: factFirstBySlug.get(slug),
    });
    for (const rule of applied) report.fixCounts[rule]++;

    const secondVerdict = auditDoc(fixed);
    if (secondVerdict.failedRules.length === 0) {
      if (fixed !== original && opts.write !== false) writeFileSync(path, fixed, 'utf8');
      report.autoFixed++;
      continue;
    }

    // Auto-fix didn't resolve everything → mark needs-review.
    const final = markNeedsReview(fixed, secondVerdict);
    if (opts.write !== false) writeFileSync(path, final, 'utf8');
    report.needsReview.push({ slug, failedRules: secondVerdict.failedRules });
  }

  // Walk feature + module + hub docs too — they only need R3 (other rules
  // either pass by construction or don't apply).
  for (const dir of ['features', 'modules']) {
    const full = join(opts.outputRoot, dir);
    if (!existsSync(full)) continue;
    for (const f of readdirSync(full)) {
      if (!f.endsWith('.md')) continue;
      const path = join(full, f);
      const text = readFileSync(path, 'utf8');
      report.audited++;
      const v = auditDoc(text);
      if (v.failedRules.length === 0) report.initialPass++;
      // We don't auto-fix non-function docs (no source-file to point R3
      // fallback at). They're produced by deterministic aggregators that
      // already include outgoing links, so failures here would be a bug,
      // not a content issue — surface and stop.
      else report.needsReview.push({ slug: `${dir}/${f.replace(/\.md$/, '')}`, failedRules: v.failedRules });
    }
  }

  if (!opts.silentReport && report.needsReview.length > 0 && opts.write !== false) {
    appendNeedsReviewToManual(opts.outputRoot, report.needsReview);
  }

  return report;
}

function markNeedsReview(text: string, verdict: DocVerdict): string {
  const fmMatch = text.match(/^(---\n)([\s\S]*?)(\n---)/);
  if (!fmMatch) return text;
  const fmBody = fmMatch[2];
  if (/^quality:/m.test(fmBody)) return text; // already marked
  const replaced = `${fmBody}\nquality: needs-review\nquality-failed: [${verdict.failedRules.join(', ')}]`;
  return text.replace(fmMatch[0], `${fmMatch[1]}${replaced}${fmMatch[3]}`);
}

function appendNeedsReviewToManual(outputRoot: string, items: EnforceReport['needsReview']): void {
  const path = join(outputRoot, 'manual-work-docs.md');
  if (!existsSync(path)) return;
  const original = readFileSync(path, 'utf8');
  const tag = '<!-- quality-needs-review -->';
  // Strip any previous quality block first, so the append is idempotent.
  const stripped = original.replace(/\n## Quality — needs review[\s\S]*?(?=\n## |$)/, '');
  const lines: string[] = [];
  lines.push('');
  lines.push('## Quality — needs review');
  lines.push('');
  lines.push(`${tag}`);
  lines.push(`Karpathy rule failures that the deterministic auto-fixer could not resolve. Resolve manually, then strip the \`quality: needs-review\` flag from the doc's frontmatter.`);
  lines.push('');
  for (const item of items) {
    lines.push(`- [ ] [[${item.slug}]] — failed rules: ${item.failedRules.join(', ')}`);
  }
  lines.push('');
  writeFileSync(path, stripped.trimEnd() + '\n' + lines.join('\n'), 'utf8');
}
