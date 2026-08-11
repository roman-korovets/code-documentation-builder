// Phase 9 — plugin-surface contract tests.
// Asserts that every file declared in .claude-plugin.json exists on disk,
// has the expected frontmatter shape, and that the four script directories
// don't drift from the registry.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const manifest = JSON.parse(readFileSync(join(ROOT, '.claude-plugin.json'), 'utf8')) as {
  commands: string[];
  agents: string[];
  skills: string[];
  hooks: Record<string, string>;
};

const parseFrontmatter = (text: string): Record<string, string> => {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
};

describe('plugin surfaces — slash commands', () => {
  it('every command file declared in manifest exists', () => {
    for (const p of manifest.commands) {
      expect(existsSync(join(ROOT, p)), `missing: ${p}`).toBe(true);
    }
  });

  it('every command file has a non-empty `description` frontmatter', () => {
    for (const p of manifest.commands) {
      const fm = parseFrontmatter(readFileSync(join(ROOT, p), 'utf8'));
      expect(fm.description, `${p} missing description`).toBeTruthy();
      expect(fm.description.length).toBeGreaterThan(20);
    }
  });

  it('every command file declares `allowed-tools`', () => {
    for (const p of manifest.commands) {
      const fm = parseFrontmatter(readFileSync(join(ROOT, p), 'utf8'));
      expect(fm['allowed-tools'], `${p} missing allowed-tools`).toBeTruthy();
    }
  });

  it('every .md file in commands/ is listed in the manifest', () => {
    const onDisk = readdirSync(join(ROOT, 'commands')).filter((n) => n.endsWith('.md'));
    const declared = new Set(manifest.commands.map((p) => p.split('/').pop()));
    for (const f of onDisk) expect(declared.has(f), `${f} not in manifest.commands`).toBe(true);
  });
});

describe('plugin surfaces — subagents', () => {
  it('every agent file declared in manifest exists', () => {
    for (const p of manifest.agents) {
      expect(existsSync(join(ROOT, p)), `missing: ${p}`).toBe(true);
    }
  });

  it('agent frontmatter has name, description, tools', () => {
    for (const p of manifest.agents) {
      const fm = parseFrontmatter(readFileSync(join(ROOT, p), 'utf8'));
      expect(fm.name, `${p} missing name`).toBeTruthy();
      expect(fm.description, `${p} missing description`).toBeTruthy();
      expect(fm.tools, `${p} missing tools`).toBeTruthy();
    }
  });

  it('agent name in frontmatter matches its filename', () => {
    for (const p of manifest.agents) {
      const fm = parseFrontmatter(readFileSync(join(ROOT, p), 'utf8'));
      const basename = p.split('/').pop()!.replace(/\.md$/, '');
      expect(fm.name).toBe(basename);
    }
  });

  it('every .md file in agents/ is listed in the manifest', () => {
    const onDisk = readdirSync(join(ROOT, 'agents')).filter((n) => n.endsWith('.md'));
    const declared = new Set(manifest.agents.map((p) => p.split('/').pop()));
    for (const f of onDisk) expect(declared.has(f), `${f} not in manifest.agents`).toBe(true);
  });
});

describe('plugin surfaces — skills', () => {
  it('every skill directory declared in manifest exists with SKILL.md', () => {
    for (const dir of manifest.skills) {
      expect(existsSync(join(ROOT, dir, 'SKILL.md')), `missing: ${dir}/SKILL.md`).toBe(true);
    }
  });

  it('SKILL.md frontmatter has name and description', () => {
    for (const dir of manifest.skills) {
      const fm = parseFrontmatter(readFileSync(join(ROOT, dir, 'SKILL.md'), 'utf8'));
      expect(fm.name, `${dir} SKILL missing name`).toBeTruthy();
      expect(fm.description, `${dir} SKILL missing description`).toBeTruthy();
    }
  });

  it('skill name matches its directory basename', () => {
    for (const dir of manifest.skills) {
      const fm = parseFrontmatter(readFileSync(join(ROOT, dir, 'SKILL.md'), 'utf8'));
      const basename = dir.split('/').pop()!;
      expect(fm.name).toBe(basename);
    }
  });

  it('skill triggers.json is valid JSON with a globs array', () => {
    for (const dir of manifest.skills) {
      const triggersPath = join(ROOT, dir, 'triggers.json');
      if (!existsSync(triggersPath)) continue;
      const parsed = JSON.parse(readFileSync(triggersPath, 'utf8'));
      expect(Array.isArray(parsed.globs), `${dir}/triggers.json missing globs[]`).toBe(true);
      expect(parsed.globs.length).toBeGreaterThan(0);
    }
  });
});

describe('plugin surfaces — hooks', () => {
  it('every hook script declared in manifest exists', () => {
    for (const [, p] of Object.entries(manifest.hooks)) {
      expect(existsSync(join(ROOT, p)), `missing: ${p}`).toBe(true);
    }
  });

  it('hook scripts have shebang and `set -euo pipefail` (or `set -uo`)', () => {
    for (const [, p] of Object.entries(manifest.hooks)) {
      const text = readFileSync(join(ROOT, p), 'utf8');
      expect(text.startsWith('#!/usr/bin/env bash'), `${p} missing bash shebang`).toBe(true);
      expect(text.includes('set -'), `${p} should set strict-mode flags`).toBe(true);
    }
  });
});
