import { describe, it, expect } from 'vitest';
import { autoFixDoc, fixR1, fixR2, fixR3, fixR4 } from '../auto-fix.js';
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

describe('fixR1', () => {
  it('prepends a fact-first line above the filler paragraph', () => {
    const text = `${fm()}\n# foo\n\nThis function iterates.\n\n[[x]]\n`;
    const fixed = fixR1(text, 'at `src/x.ts:10-20` as the `foo` function');
    expect(auditDoc(fixed).r1).toBe('pass');
    expect(fixed).toContain('Defined at `src/x.ts:10-20`');
    expect(fixed).toContain('This function iterates.'); // original kept
  });
});

describe('fixR2', () => {
  it('wraps bare slug.md outside protected ranges', () => {
    const text = `${fm()}\n# foo\n\nSee other.md and \`x.md\` and [[a]].\n`;
    const fixed = fixR2(text);
    expect(auditDoc(fixed).r2).toBe('pass');
    expect(fixed).toContain('[other](other.md)');
    expect(fixed).toContain('`x.md`'); // untouched
  });
});

describe('fixR3', () => {
  it('appends Related section with source-file link', () => {
    const text = `${fm()}\n# foo\n\nNo links here.\n`;
    const fixed = fixR3(text, 'src/x.ts');
    expect(auditDoc(fixed).r3).toBe('pass');
    expect(fixed).toContain('## Related');
    expect(fixed).toContain('[Source: src/x.ts](../src/x.ts)');
  });
});

describe('fixR4', () => {
  it('inserts ⚠️ block before first heading when hot-path body lacks it', () => {
    const text = `${fm(true)}\n# foo\n\n> summary\n\n## 1. Origin\n\nIterates.\n\n[[x]]\n`;
    const fixed = fixR4(text);
    expect(auditDoc(fixed).r4).toBe('pass');
    expect(fixed).toContain('⚠️ **HOT PATH**');
  });

  it('is idempotent (no change when ⚠️ already present)', () => {
    const text = `${fm(true)}\n# foo\n\n⚠️ already\n\n## 1. Origin\n\nIterates.\n\n[[x]]\n`;
    expect(fixR4(text)).toBe(text);
  });
});

describe('autoFixDoc end-to-end', () => {
  it('fixes all four rules in one pass', () => {
    const text = `${fm(true)}\n# foo\n\nThis function iterates. See other.md.\n`;
    const { text: fixed, applied } = autoFixDoc(text, {
      sourceFile: 'src/x.ts',
      factFirstLead: 'at `src/x.ts:1-5` as the `foo` function',
    });
    expect(applied.sort()).toEqual(['r1', 'r2', 'r3', 'r4']);
    const v = auditDoc(fixed);
    expect(v.failedRules).toEqual([]);
  });

  it('does nothing on already-clean docs', () => {
    const text = `${fm()}\n# foo\n\nIterates.\n\n[[x]]\n`;
    const { text: fixed, applied } = autoFixDoc(text, { sourceFile: 'src/x.ts' });
    expect(applied).toEqual([]);
    expect(fixed).toBe(text);
  });
});
