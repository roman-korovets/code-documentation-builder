// Slug resolver — Phase 4.2.
// Maps each ClassifiedEntry to a unique kebab-case slug used as the .md filename.
// Default ladder mirrors reference vault conventions; project overrides can
// supply additional prefix rules. Collisions are resolved by appending
// `-<line-start>`.

import { basename, extname } from 'node:path';
import type { ClassifiedEntry, ClassifiedInventory } from '../classify/index.js';
import { entryKey } from '../graph/index.js';

export interface SlugPrefixRule {
  filePattern?: RegExp;
  namePattern?: RegExp;
  kindPattern?: ClassifiedEntry['kind'][];
  prefix: string;
}

export interface SlugOptions {
  prefixRules?: SlugPrefixRule[];
}

export const DEFAULT_PREFIX_RULES: SlugPrefixRule[] = [
  { filePattern: /\/callbacks\//, prefix: 'gantt-callback' },
  { filePattern: /\/hooks\//, prefix: 'gantt-hook' },
];

export function kebabCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function localName(name: string): string {
  return name.includes('.') ? name.split('.').pop()! : name;
}

function fileBaseSlug(file: string): string {
  return kebabCase(basename(file, extname(file)));
}

function pickPrefix(entry: ClassifiedEntry, rules: SlugPrefixRule[]): string | null {
  for (const r of rules) {
    if (r.filePattern && !r.filePattern.test(entry.file)) continue;
    if (r.namePattern && !r.namePattern.test(entry.name)) continue;
    if (r.kindPattern && !r.kindPattern.includes(entry.kind)) continue;
    return r.prefix;
  }
  return null;
}

export function deriveSlug(entry: ClassifiedEntry, opts: SlugOptions = {}): string {
  const rules = opts.prefixRules ?? DEFAULT_PREFIX_RULES;
  const nameSlug = kebabCase(localName(entry.name));

  // Visual class methods → visual-<method>
  if (entry.file === 'src/visual.ts' && entry.kind === 'class-method') {
    return `visual-${nameSlug}`;
  }

  // Locals nested in a Visual.<method> — visual-<method>-<name>
  if (entry.kind === 'local' && entry.parent?.startsWith('Visual.')) {
    const methodKebab = kebabCase(entry.parent.split('.')[1]);
    return `visual-${methodKebab}-${nameSlug}`;
  }

  const fileSlug = fileBaseSlug(entry.file);

  // Locals nested in another function in the same file → <file>-<parent>-<name>
  if (entry.kind === 'local' && entry.parent) {
    const parentKebab = kebabCase(localName(entry.parent));
    if (parentKebab === fileSlug) return `${fileSlug}-${nameSlug}`;
    return `${fileSlug}-${parentKebab}-${nameSlug}`;
  }

  // Prefix rule (callbacks, hooks, etc.) replaces file segment.
  const prefix = pickPrefix(entry, rules);
  if (prefix) {
    if (nameSlug === fileSlug) return `${prefix}-${nameSlug}`;
    if (fileSlug.startsWith(prefix + '-') || fileSlug === prefix) return `${fileSlug}-${nameSlug}`;
    return `${prefix}-${nameSlug}`;
  }

  // Component or default-export named after its file → just the file slug.
  if (nameSlug === fileSlug) return fileSlug;

  return `${fileSlug}-${nameSlug}`;
}

export interface ResolvedSlugs {
  /** Parallel to inventory — slugs[i] is the slug for inventory[i]. */
  slugs: string[];
  /** Lookup by `entryKey(file, name)` (last-write-wins on duplicate keys). */
  byKey: Map<string, string>;
}

export function resolveSlugs(
  inventory: ClassifiedInventory,
  opts: SlugOptions = {},
): ResolvedSlugs {
  const used = new Map<string, ClassifiedEntry>();
  const slugs: string[] = new Array(inventory.length);
  const byKey = new Map<string, string>();

  for (let i = 0; i < inventory.length; i++) {
    const e = inventory[i];
    let slug = deriveSlug(e, opts);
    if (used.has(slug)) {
      const lineStart = e.lineRange.split('-')[0];
      slug = `${slug}-${lineStart}`;
      if (used.has(slug)) {
        const fileKebab = kebabCase(e.file.replace(/[\/\\]/g, '-').replace(/\.tsx?$/, ''));
        slug = `${fileKebab}-${lineStart}`;
      }
    }
    used.set(slug, e);
    slugs[i] = slug;
    byKey.set(entryKey(e.file, e.name), slug);
  }
  return { slugs, byKey };
}
