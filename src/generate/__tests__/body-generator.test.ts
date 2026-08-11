import { describe, it, expect } from 'vitest';
import { buildBody } from '../body-generator.js';
import type { ClassifiedEntry } from '../../classify/index.js';

const entry: ClassifiedEntry = {
  name: 'doThing',
  file: 'src/utils/thing.ts',
  lineRange: '10-30',
  kind: 'named-export',
  signature: '(x: number) => string',
  module: 'visual',
  type: 'util',
  features: [],
  hotPath: false,
};

describe('buildBody', () => {
  it('emits H1 with name + file basename', () => {
    const body = buildBody({ entry, callerSlugs: [], calleeSlugs: [] });
    expect(body).toMatch(/^# `doThing` \(`thing\.ts`\)/);
  });

  it('includes Origin section with file:line', () => {
    const body = buildBody({ entry, callerSlugs: [], calleeSlugs: [] });
    expect(body).toContain('## 1. Origin');
    expect(body).toContain('`src/utils/thing.ts:10-30`');
  });

  it('Called by emits wikilinks for slugs and italic for sentinels', () => {
    const body = buildBody({
      entry,
      callerSlugs: ['real-slug', '[powerbi-host]'],
      calleeSlugs: [],
    });
    expect(body).toContain('- [[real-slug]]');
    expect(body).toContain('- _powerbi-host_');
  });

  it('emits _none_ when there are no callers/callees', () => {
    const body = buildBody({ entry, callerSlugs: [], calleeSlugs: [] });
    const callBy = body.split('## 4. Called by')[1].split('## 5. Calls')[0];
    expect(callBy).toContain('- _none_');
  });

  it('adds Related section when no wikilinks present (R3 guarantee)', () => {
    const body = buildBody({ entry, callerSlugs: [], calleeSlugs: [] });
    expect(body).toContain('## 6. Related');
    expect(body).toContain('[Source: src/utils/thing.ts](../src/utils/thing.ts)');
  });

  it('skips Related section when there is at least one wikilink', () => {
    const body = buildBody({ entry, callerSlugs: ['x-slug'], calleeSlugs: [] });
    expect(body).not.toContain('## 6. Related');
  });

  it('prepends hot-path warning when hotPath is true', () => {
    const body = buildBody({ entry: { ...entry, hotPath: true }, callerSlugs: [], calleeSlugs: [] });
    expect(body).toContain('⚠️ **HOT PATH**');
  });

  it('first non-skipped body line is fact-first (R1)', () => {
    const body = buildBody({ entry, callerSlugs: [], calleeSlugs: [] });
    // Mimic audit-quality.mjs R1 check.
    const FILLERS = /^(this|the following|here|in this|below|above|note that|please|simply|just|basically|essentially)\b/i;
    const firstPara = body.split('\n').find(l => l.trim() && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('---')) || '';
    const filler = FILLERS.test(firstPara.replace(/^[`*_>\s]+/, ''));
    expect(filler).toBe(false);
  });

  it('class-method origin renders parent class name', () => {
    const ce: ClassifiedEntry = { ...entry, kind: 'class-method', parent: 'Visual', name: 'Visual.update' };
    const body = buildBody({ entry: ce, callerSlugs: [], calleeSlugs: [] });
    expect(body).toContain('Visual class method');
  });
});
