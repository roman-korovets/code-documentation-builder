// Phase 10 orchestrator gate test.
// Builds a tiny fixture project on disk, runs build() twice, asserts zero
// file diffs on the second run.

import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, statSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { build } from '../orchestrator.js';

const FIXTURE = `
export function alpha(x: number): number {
  return x * 2;
}

export function beta(s: string): string {
  return s + alpha(s.length).toString();
}

export const gamma = (): void => {
  alpha(1);
  beta('x');
};
`.trim();

function makeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'orch-test-'));
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src', 'index.ts'), FIXTURE, 'utf8');
  // Minimal tsconfig + package.json so discover() doesn't choke.
  writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext' } }), 'utf8');
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fixture', type: 'module' }), 'utf8');
  return root;
}

function hashDir(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (name.endsWith('.md')) {
        const h = createHash('sha256').update(readFileSync(p)).digest('hex');
        out.set(p.slice(dir.length).replace(/\\/g, '/'), h);
      }
    }
  };
  walk(dir);
  return out;
}

describe('orchestrator.build() — idempotency gate', () => {
  it('produces zero file-content diffs across two consecutive builds', async () => {
    const root = makeFixture();
    const outputRoot = join(root, 'documentation');

    await build({ projectRoot: root, outputRoot, skipAudit: true });
    const hashesA = hashDir(outputRoot);

    await build({ projectRoot: root, outputRoot, skipAudit: true });
    const hashesB = hashDir(outputRoot);

    expect(hashesA.size).toBeGreaterThan(0);
    expect([...hashesA.keys()].sort()).toEqual([...hashesB.keys()].sort());
    for (const [path, hashA] of hashesA) {
      expect(hashesB.get(path), `content drift in ${path}`).toBe(hashA);
    }

    rmSync(root, { recursive: true });
  });

  it('second build reports skippedUnchanged === inventory size and rewritten === 0', async () => {
    const root = makeFixture();
    const outputRoot = join(root, 'documentation');

    const first = await build({ projectRoot: root, outputRoot, skipAudit: true });
    expect(first.generate.written).toBeGreaterThan(0);

    const second = await build({ projectRoot: root, outputRoot, skipAudit: true });
    expect(second.generate.written).toBe(0);
    expect(second.generate.skippedUnchanged).toBe(first.generate.skippedUnchanged + first.generate.written);
    expect(second.link.rewritten).toBe(0);
    expect(second.drift.counts.unchanged).toBeGreaterThan(0);
    expect(second.drift.counts.added).toBe(0);
    expect(second.drift.counts.removed).toBe(0);

    rmSync(root, { recursive: true });
  });

  it('--plan mode prints deltas without writing or persisting cache', async () => {
    const root = makeFixture();
    const outputRoot = join(root, 'documentation');

    const result = await build({ projectRoot: root, outputRoot, plan: true, skipAudit: true });
    expect(result.drift.counts.added).toBeGreaterThan(0);
    expect(existsSync(outputRoot)).toBe(false);
    expect(existsSync(join(root, '.code-doc-builder', 'inventory.json'))).toBe(false);

    rmSync(root, { recursive: true });
  });

  it('handles a removed function — deletes its doc on the next run', async () => {
    const root = makeFixture();
    const outputRoot = join(root, 'documentation');
    await build({ projectRoot: root, outputRoot, skipAudit: true });

    // Mutate source: drop `gamma`.
    writeFileSync(join(root, 'src', 'index.ts'), FIXTURE.replace(/export const gamma[\s\S]*?\};/m, ''), 'utf8');

    const second = await build({ projectRoot: root, outputRoot, skipAudit: true });
    expect(second.drift.counts.removed).toBe(1);
    expect(second.removed.some((p) => p.includes('gamma'))).toBe(true);

    rmSync(root, { recursive: true });
  });

  it('handles a renamed function — deletes old doc, generates new one', async () => {
    const root = makeFixture();
    const outputRoot = join(root, 'documentation');
    await build({ projectRoot: root, outputRoot, skipAudit: true });

    const renamed = FIXTURE.replace(/\balpha\b/g, 'doubled');
    writeFileSync(join(root, 'src', 'index.ts'), renamed, 'utf8');

    const second = await build({ projectRoot: root, outputRoot, skipAudit: true });
    expect(second.drift.counts.renamed).toBeGreaterThanOrEqual(1);
    // Old slug file must be gone.
    const md = readdirSync(outputRoot).filter((f) => f.endsWith('.md'));
    expect(md.some((f) => f.startsWith('index-alpha'))).toBe(false);
    expect(md.some((f) => f.startsWith('index-doubled'))).toBe(true);

    rmSync(root, { recursive: true });
  });

  // Suppress the resolve import lint
  void resolve;
});
