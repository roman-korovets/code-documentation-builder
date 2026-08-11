import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scaffoldGuides, DEFAULT_SECTIONS } from '../guide-scaffolder.js';

describe('scaffoldGuides', () => {
  it('creates the six default sections + three top-level hubs on a fresh vault', async () => {
    const root = mkdtempSync(join(tmpdir(), 'scaffold-'));
    const result = await scaffoldGuides({ outputRoot: root });

    const guidesDir = join(root, 'guides');
    expect(existsSync(join(guidesDir, '_guides-index.md'))).toBe(true);
    expect(existsSync(join(guidesDir, '_personas.md'))).toBe(true);
    expect(existsSync(join(guidesDir, '_glossary.md'))).toBe(true);
    expect(existsSync(join(guidesDir, 'assets', 'screenshots'))).toBe(true);
    for (const s of DEFAULT_SECTIONS) {
      expect(existsSync(join(guidesDir, s.slug, '_section-index.md')), `${s.slug}/_section-index.md missing`).toBe(true);
    }
    expect(result.created.length).toBe(3 + 1 + DEFAULT_SECTIONS.length); // 3 top-level + .gitkeep + 6 section indexes
    expect(result.skipped).toHaveLength(0);
    rmSync(root, { recursive: true });
  });

  it('NEVER overwrites an existing file — guides are human-written', async () => {
    const root = mkdtempSync(join(tmpdir(), 'scaffold-preserve-'));
    const guidesDir = join(root, 'guides');
    mkdirSync(join(guidesDir, 'how-to'), { recursive: true });
    const customContent = '---\ntype: index\n---\n# CUSTOM USER CONTENT — must not be overwritten\n';
    writeFileSync(join(guidesDir, 'how-to', '_section-index.md'), customContent);

    const result = await scaffoldGuides({ outputRoot: root });
    expect(readFileSync(join(guidesDir, 'how-to', '_section-index.md'), 'utf8')).toBe(customContent);
    expect(result.skipped).toContain('how-to/_section-index.md');
    rmSync(root, { recursive: true });
  });

  it('is idempotent — second run reports everything as skipped', async () => {
    const root = mkdtempSync(join(tmpdir(), 'scaffold-idempotent-'));
    const first = await scaffoldGuides({ outputRoot: root });
    const second = await scaffoldGuides({ outputRoot: root });
    expect(first.created.length).toBeGreaterThan(0);
    expect(second.created).toHaveLength(0);
    expect(second.skipped.length).toBe(first.created.length);
    rmSync(root, { recursive: true });
  });

  it('honours custom sections', async () => {
    const root = mkdtempSync(join(tmpdir(), 'scaffold-custom-'));
    const customSections = [
      { slug: 'quickstart', displayName: 'Quickstart', description: 'Two-minute intro.' },
      { slug: 'recipes', displayName: 'Recipes', description: 'Task-oriented walkthroughs.' },
    ];
    const result = await scaffoldGuides({ outputRoot: root, sections: customSections });
    expect(existsSync(join(root, 'guides', 'quickstart', '_section-index.md'))).toBe(true);
    expect(existsSync(join(root, 'guides', 'recipes', '_section-index.md'))).toBe(true);
    expect(existsSync(join(root, 'guides', 'how-to'))).toBe(false);
    expect(result.created).toContain('quickstart/_section-index.md');
    rmSync(root, { recursive: true });
  });

  it('respects write: false (dry-run)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'scaffold-dry-'));
    const result = await scaffoldGuides({ outputRoot: root, write: false });
    expect(existsSync(join(root, 'guides', '_guides-index.md'))).toBe(false);
    expect(result.created.length).toBeGreaterThan(0); // would have been created
    rmSync(root, { recursive: true });
  });

  it('_guides-index links to every section', async () => {
    const root = mkdtempSync(join(tmpdir(), 'scaffold-links-'));
    await scaffoldGuides({ outputRoot: root, projectName: 'My Tool' });
    const indexText = readFileSync(join(root, 'guides', '_guides-index.md'), 'utf8');
    expect(indexText).toContain('My Tool');
    for (const s of DEFAULT_SECTIONS) {
      expect(indexText).toContain(`[[guides/${s.slug}/_section-index]]`);
    }
    rmSync(root, { recursive: true });
  });
});
