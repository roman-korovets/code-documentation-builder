// In-process Karpathy R1-R4 auditor — Phase 11.
// Mirrors templates/audit-quality.mjs but runs as a pure function on doc text,
// so the orchestrator can audit-fix-re-audit without spawning a Node subprocess.

export type RuleResult = 'pass' | 'fail' | 'n/a';

export interface DocVerdict {
  r1: RuleResult;
  r2: RuleResult;
  r3: RuleResult;
  r4: RuleResult;
  hotPath: boolean;
  failedRules: string[]; // subset of ['r1', 'r2', 'r3', 'r4']
}

const FILLERS = /^(this|the following|here|in this|below|above|note that|please|simply|just|basically|essentially)\b/i;

export function auditDoc(text: string): DocVerdict {
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
  const fm = fmMatch ? fmMatch[1] : '';
  const body = text.replace(/^---[\s\S]*?\n---/, '').trim();
  const hotPath = /hot-path:\s*true/.test(fm);

  // R1 — first non-skipped body line is fact-first.
  const firstPara =
    body.split('\n').find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('---')) ?? '';
  const filler = FILLERS.test(firstPara.replace(/^[`*_>\s]+/, ''));
  const r1: RuleResult = filler ? 'fail' : 'pass';

  // R2 — no bare `<slug>.md` references outside code spans, fences, wikilinks,
  // or markdown links.
  const stripped = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]+`/g, '')
    .replace(/\[\[[^\]]+\]\]/g, '')
    .replace(/\[[^\]]*\]\([^)]+\)/g, '');
  const r2: RuleResult = /\b[a-z][a-z0-9-]+\.md\b/.test(stripped) ? 'fail' : 'pass';

  // R3 — at least one wikilink or markdown link in body.
  const wikilinks = (body.match(/\[\[[^\]]+\]\]/g) || []).length;
  const mdLinks = (body.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;
  const r3: RuleResult = wikilinks + mdLinks > 0 ? 'pass' : 'fail';

  // R4 — only applies to hot-path docs.
  const r4: RuleResult = hotPath ? (/⚠️/.test(body) ? 'pass' : 'fail') : 'n/a';

  const failedRules: string[] = [];
  if (r1 === 'fail') failedRules.push('r1');
  if (r2 === 'fail') failedRules.push('r2');
  if (r3 === 'fail') failedRules.push('r3');
  if (r4 === 'fail') failedRules.push('r4');

  return { r1, r2, r3, r4, hotPath, failedRules };
}
