import { describe, it, expect } from 'vitest';
import { auditDoc } from '../auditor.js';

const fm = (hotPath = false) => [
  '---',
  'source-file: src/x.ts',
  'module: m',
  'type: util',
  'features: []',
  'called-by: []',
  `hot-path: ${hotPath}`,
  '---',
].join('\n');

describe('auditDoc', () => {
  it('passes a clean function doc', () => {
    const text = `${fm()}\n# foo\n\nIterates the list and returns sum.\n\n[[other-slug]]\n`;
    const v = auditDoc(text);
    expect(v.r1).toBe('pass');
    expect(v.r2).toBe('pass');
    expect(v.r3).toBe('pass');
    expect(v.r4).toBe('n/a');
    expect(v.failedRules).toEqual([]);
  });

  it('flags R1 filler openings', () => {
    const text = `${fm()}\n# foo\n\nThis function iterates ...\n\n[[x]]\n`;
    expect(auditDoc(text).r1).toBe('fail');
  });

  it('treats blockquote and heading lines as skip', () => {
    const text = `${fm()}\n# foo\n\n> Two-sentence summary.\n\n## Origin\n\nIterates.\n\n[[x]]\n`;
    expect(auditDoc(text).r1).toBe('pass');
  });

  it('flags R2 bare .md references', () => {
    const text = `${fm()}\n# foo\n\nSee other.md for details.\n\n[[x]]\n`;
    expect(auditDoc(text).r2).toBe('fail');
  });

  it('R2 ignores .md inside code spans, fences, wikilinks, and md links', () => {
    const text = `${fm()}\n# foo\n\nInline \`a.md\` and [b](b.md) and [[c]].\n\n\`\`\`\nd.md\n\`\`\`\n`;
    expect(auditDoc(text).r2).toBe('pass');
  });

  it('flags R3 when no outgoing links', () => {
    const text = `${fm()}\n# foo\n\nSome prose with no links.\n`;
    expect(auditDoc(text).r3).toBe('fail');
  });

  it('R4 fails when hot-path: true but no ⚠️ in body', () => {
    const text = `${fm(true)}\n# foo\n\nIterates.\n\n[[x]]\n`;
    expect(auditDoc(text).r4).toBe('fail');
  });

  it('R4 passes when hot-path doc contains ⚠️', () => {
    const text = `${fm(true)}\n# foo\n\n⚠️ **HOT PATH** — runs per row.\n\nIterates.\n\n[[x]]\n`;
    expect(auditDoc(text).r4).toBe('pass');
  });

  it('R4 is n/a for non-hot-path docs even without ⚠️', () => {
    const text = `${fm(false)}\n# foo\n\nIterates.\n\n[[x]]\n`;
    expect(auditDoc(text).r4).toBe('n/a');
  });

  it('aggregates failed rule names', () => {
    const text = `${fm(true)}\n# foo\n\nThis is bad. See other.md.\n`;
    const v = auditDoc(text);
    expect(v.failedRules).toEqual(expect.arrayContaining(['r1', 'r2', 'r3', 'r4']));
  });
});
