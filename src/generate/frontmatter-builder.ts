// Frontmatter builder — Phase 4.1.
// Emits YAML frontmatter for one function doc. Key order matches the reference
// vault: source-file, module, type, features, called-by, hot-path.

import type { ClassifiedEntry } from '../classify/index.js';

export interface FrontmatterInput {
  entry: ClassifiedEntry;
  calledBy: string[]; // mix of slugs and `[sentinel]` tokens
}

export function buildFrontmatter(input: FrontmatterInput): string {
  const { entry, calledBy } = input;
  const features = `[${entry.features.join(', ')}]`;
  const callers = `[${calledBy.join(', ')}]`;
  return [
    '---',
    `source-file: ${entry.file}`,
    `module: ${entry.module}`,
    `type: ${entry.type}`,
    `features: ${features}`,
    `called-by: ${callers}`,
    `hot-path: ${entry.hotPath}`,
    '---',
  ].join('\n');
}
