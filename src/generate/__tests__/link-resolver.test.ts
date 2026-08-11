import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveLinks, rewritePlainMdRefs } from '../link-resolver.js';
import type { ClassifiedEntry } from '../../classify/index.js';
import type { CallGraph, CallGraphNode } from '../../graph/index.js';
import { entryKey } from '../../graph/index.js';

describe('rewritePlainMdRefs', () => {
  const valid = new Set(['foo', 'bar-baz']);

  it('wraps bare slug.md as [slug](slug.md)', () => {
    const out = rewritePlainMdRefs('See foo.md for details.', valid);
    expect(out).toBe('See [foo](foo.md) for details.');
  });

  it('skips wikilinks', () => {
    const out = rewritePlainMdRefs('See [[foo]] and foo.md.', valid);
    expect(out).toBe('See [[foo]] and [foo](foo.md).');
  });

  it('skips existing markdown links', () => {
    const out = rewritePlainMdRefs('See [other](foo.md) — and foo.md too.', valid);
    expect(out).toBe('See [other](foo.md) — and [foo](foo.md) too.');
  });

  it('skips code spans and fences', () => {
    const out = rewritePlainMdRefs('Inline `foo.md` and\n```\nfoo.md\n```\noutside foo.md.', valid);
    expect(out).toContain('`foo.md`');
    expect(out).toContain('```\nfoo.md\n```');
    expect(out).toContain('outside [foo](foo.md).');
  });

  it('leaves unknown slugs alone', () => {
    const out = rewritePlainMdRefs('Mystery unknown.md', valid);
    expect(out).toBe('Mystery unknown.md');
  });

  it('handles hyphenated slugs', () => {
    const out = rewritePlainMdRefs('See bar-baz.md.', valid);
    expect(out).toBe('See [bar-baz](bar-baz.md).');
  });
});

describe('resolveLinks', () => {
  const setup = () => {
    const root = mkdtempSync(join(tmpdir(), 'link-resolver-'));
    const e1: ClassifiedEntry = {
      name: 'foo', file: 'src/a.ts', lineRange: '1-5', kind: 'named-export',
      signature: '() => void', module: 'm', type: 'util', features: [], hotPath: false,
    };
    const e2: ClassifiedEntry = {
      name: 'bar', file: 'src/b.ts', lineRange: '1-5', kind: 'named-export',
      signature: '() => void', module: 'm', type: 'util', features: [], hotPath: false,
    };
    const k1 = entryKey(e1.file, e1.name);
    const k2 = entryKey(e2.file, e2.name);
    const graph: CallGraph = new Map<string, CallGraphNode>([
      [k1, { key: k1, calls: [k2], calledBy: [] }],
      [k2, { key: k2, calls: [], calledBy: [k1] }],
    ]);
    const slugByKey = new Map<string, string>([[k1, 'a-foo'], [k2, 'b-bar']]);
    return { root, e1, e2, graph, slugByKey };
  };

  it('rewrites stale called-by line from current graph', async () => {
    const { root, e1, e2, graph, slugByKey } = setup();
    writeFileSync(join(root, 'a-foo.md'), [
      '---', 'source-file: src/a.ts', 'module: m', 'type: util',
      'features: []', 'called-by: [stale-slug]', 'hot-path: false', '---',
      '# foo',
    ].join('\n'));
    writeFileSync(join(root, 'b-bar.md'), [
      '---', 'source-file: src/b.ts', 'module: m', 'type: util',
      'features: []', 'called-by: [stale-slug]', 'hot-path: false', '---',
      '# bar',
    ].join('\n'));

    const result = await resolveLinks({ inventory: [e1, e2], graph, slugByKey, docRoot: root });
    expect(result.rewritten).toBe(2);
    expect(readFileSync(join(root, 'a-foo.md'), 'utf8')).toContain('called-by: []');
    expect(readFileSync(join(root, 'b-bar.md'), 'utf8')).toContain('called-by: [a-foo]');
    rmSync(root, { recursive: true });
  });

  it('is idempotent — second run reports 0 rewrites', async () => {
    const { root, e1, e2, graph, slugByKey } = setup();
    writeFileSync(join(root, 'a-foo.md'), [
      '---', 'source-file: src/a.ts', 'module: m', 'type: util',
      'features: []', 'called-by: []', 'hot-path: false', '---',
      '# foo',
      '',
      '[[b-bar]]',
    ].join('\n'));
    writeFileSync(join(root, 'b-bar.md'), [
      '---', 'source-file: src/b.ts', 'module: m', 'type: util',
      'features: []', 'called-by: [a-foo]', 'hot-path: false', '---',
      '# bar',
      '',
      '[[a-foo]]',
    ].join('\n'));

    const first = await resolveLinks({ inventory: [e1, e2], graph, slugByKey, docRoot: root });
    const second = await resolveLinks({ inventory: [e1, e2], graph, slugByKey, docRoot: root });
    expect(second.rewritten).toBe(0);
    expect(second.unchanged).toBe(first.scanned);
    rmSync(root, { recursive: true });
  });

  it('appends § Related fallback when body has no outgoing links (R3)', async () => {
    const { root, e1, e2, graph, slugByKey } = setup();
    writeFileSync(join(root, 'a-foo.md'), [
      '---', 'source-file: src/a.ts', 'module: m', 'type: util',
      'features: []', 'called-by: []', 'hot-path: false', '---',
      '# foo — no links here',
    ].join('\n'));
    writeFileSync(join(root, 'b-bar.md'), [
      '---', 'source-file: src/b.ts', 'module: m', 'type: util',
      'features: []', 'called-by: []', 'hot-path: false', '---',
      '# bar — also no links',
    ].join('\n'));

    await resolveLinks({ inventory: [e1, e2], graph, slugByKey, docRoot: root });
    const aText = readFileSync(join(root, 'a-foo.md'), 'utf8');
    expect(aText).toContain('## Related');
    expect(aText).toContain('[Source: src/a.ts](../src/a.ts)');
    rmSync(root, { recursive: true });
  });

  it('passes sentinel tokens through called-by verbatim', async () => {
    const { root, e1, e2, slugByKey } = setup();
    const k1 = entryKey(e1.file, e1.name);
    const graph: CallGraph = new Map<string, CallGraphNode>([
      [k1, { key: k1, calls: [], calledBy: ['[external-host]'] }],
      [entryKey(e2.file, e2.name), { key: entryKey(e2.file, e2.name), calls: [], calledBy: [] }],
    ]);
    writeFileSync(join(root, 'a-foo.md'), [
      '---', 'source-file: src/a.ts', 'module: m', 'type: util',
      'features: []', 'called-by: []', 'hot-path: false', '---',
      '# foo',
      '',
      '[[b-bar]]',
    ].join('\n'));
    writeFileSync(join(root, 'b-bar.md'), [
      '---', 'source-file: src/b.ts', 'module: m', 'type: util',
      'features: []', 'called-by: []', 'hot-path: false', '---',
      '# bar',
      '',
      '[[a-foo]]',
    ].join('\n'));

    await resolveLinks({ inventory: [e1, e2], graph, slugByKey, docRoot: root });
    expect(readFileSync(join(root, 'a-foo.md'), 'utf8')).toContain('called-by: [[external-host]]');
    rmSync(root, { recursive: true });
  });
});
