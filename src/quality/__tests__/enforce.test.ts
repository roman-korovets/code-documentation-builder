import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { enforceQuality } from '../enforce.js';
import type { ClassifiedEntry } from '../../classify/index.js';
import { entryKey } from '../../graph/index.js';

const cleanDoc = `---
source-file: src/x.ts
module: m
type: util
features: []
called-by: []
hot-path: false
---
# foo

Iterates and returns the sum.

[[other]]
`;

const dirtyDoc = `---
source-file: src/y.ts
module: m
type: util
features: []
called-by: []
hot-path: true
---
# bar

This function iterates. See other.md.
`;

const e1: ClassifiedEntry = {
  name: 'foo', file: 'src/x.ts', lineRange: '1-5', kind: 'named-export', signature: '()',
  module: 'm', type: 'util', features: [], hotPath: false,
};
const e2: ClassifiedEntry = {
  name: 'bar', file: 'src/y.ts', lineRange: '1-5', kind: 'named-export', signature: '()',
  module: 'm', type: 'util', features: [], hotPath: true,
};

describe('enforceQuality', () => {
  it('initialPass counts clean docs; auto-fixes dirty ones', async () => {
    const root = mkdtempSync(join(tmpdir(), 'enforce-test-'));
    writeFileSync(join(root, 'foo.md'), cleanDoc);
    writeFileSync(join(root, 'bar.md'), dirtyDoc);
    writeFileSync(join(root, 'manual-work-docs.md'), '# Manual Work\n');
    const slugByKey = new Map<string, string>([
      [entryKey(e1.file, e1.name), 'foo'],
      [entryKey(e2.file, e2.name), 'bar'],
    ]);

    const report = await enforceQuality({
      inventory: [e1, e2],
      slugByKey,
      outputRoot: root,
    });

    expect(report.audited).toBe(2);
    expect(report.initialPass).toBe(1);
    expect(report.autoFixed).toBe(1);
    expect(report.needsReview).toEqual([]);

    const fixed = readFileSync(join(root, 'bar.md'), 'utf8');
    expect(fixed).toContain('⚠️ **HOT PATH**');
    expect(fixed).toContain('[other](other.md)');
    // R1 fix prepends a fact-first lead above the original filler paragraph.
    expect(fixed).toMatch(/Defined at `src\/y\.ts:1-5`/);

    rmSync(root, { recursive: true });
  });

  it('marks needs-review when auto-fix cannot resolve everything', async () => {
    const root = mkdtempSync(join(tmpdir(), 'enforce-fail-'));
    // Doc with hot-path: true but a completely empty body (no H1, no ##).
    // fixR4's anchor ladder has nothing to bite on, so R4 stays failing.
    const empty = `---
source-file: src/z.ts
module: m
type: util
features: []
called-by: []
hot-path: true
---
`;
    writeFileSync(join(root, 'baz.md'), empty);
    writeFileSync(join(root, 'manual-work-docs.md'), '# Manual Work\n');

    const e3: ClassifiedEntry = { ...e1, name: 'baz', file: 'src/z.ts', hotPath: true };
    const slugByKey = new Map<string, string>([[entryKey(e3.file, e3.name), 'baz']]);

    const report = await enforceQuality({
      inventory: [e3],
      slugByKey,
      outputRoot: root,
    });

    expect(report.needsReview).toHaveLength(1);
    expect(report.needsReview[0].slug).toBe('baz');
    expect(report.needsReview[0].failedRules).toContain('r4');
    const finalDoc = readFileSync(join(root, 'baz.md'), 'utf8');
    expect(finalDoc).toContain('quality: needs-review');
    expect(finalDoc).toMatch(/quality-failed: \[.*r4.*\]/);

    const manual = readFileSync(join(root, 'manual-work-docs.md'), 'utf8');
    expect(manual).toContain('## Quality — needs review');
    expect(manual).toContain('[[baz]]');

    rmSync(root, { recursive: true });
  });

  it('is idempotent — re-running on a clean vault changes nothing', async () => {
    const root = mkdtempSync(join(tmpdir(), 'enforce-idempotent-'));
    writeFileSync(join(root, 'foo.md'), cleanDoc);
    writeFileSync(join(root, 'manual-work-docs.md'), '# Manual Work\n');
    const slugByKey = new Map<string, string>([[entryKey(e1.file, e1.name), 'foo']]);

    const first = await enforceQuality({ inventory: [e1], slugByKey, outputRoot: root });
    const firstContent = readFileSync(join(root, 'foo.md'), 'utf8');
    const second = await enforceQuality({ inventory: [e1], slugByKey, outputRoot: root });
    const secondContent = readFileSync(join(root, 'foo.md'), 'utf8');

    expect(first.initialPass).toBe(1);
    expect(second.initialPass).toBe(1);
    expect(second.autoFixed).toBe(0);
    expect(firstContent).toBe(secondContent);

    rmSync(root, { recursive: true });
  });
});
