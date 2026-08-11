// Module classifier — pure path-based mapping from source file to module slug.
//
// Order: explicit moduleMap (longest prefix wins) → auto-derive from
// `src/modules/<X>/`, `src/services/<X>/`, `src/utils/`, `src/components/` →
// special-case root `src/visual.ts` / `src/App.tsx` → 'unknown'.

export interface ModuleClassifyOptions {
  moduleMap?: Record<string, string>;
}

const ROOT_VISUAL_FILES = new Set([
  'src/visual.ts',
  'src/App.tsx',
  'src/SimpleApp.tsx',
  'src/objectEnumerationUtility.ts',
]);

export function classifyModule(filePath: string, opts: ModuleClassifyOptions = {}): string {
  const path = filePath.replace(/\\/g, '/');

  if (opts.moduleMap) {
    const sorted = Object.keys(opts.moduleMap).sort((a, b) => b.length - a.length);
    for (const prefix of sorted) {
      if (path.startsWith(prefix)) return opts.moduleMap[prefix];
    }
  }

  if (ROOT_VISUAL_FILES.has(path)) return 'visual';

  const moduleMatch = path.match(/^src\/modules\/([^/]+)\//);
  if (moduleMatch) return moduleMatch[1];

  const serviceMatch = path.match(/^src\/services\/([^/]+)\//);
  if (serviceMatch) return `services/${serviceMatch[1]}`;

  if (path.startsWith('src/utils/')) return 'utils';
  if (path.startsWith('src/components/')) return 'components';
  if (path.startsWith('src/hooks/')) return 'hooks';
  if (path.startsWith('src/settings/') || path.startsWith('src/settings-interfaces/')) return 'settings';

  const segments = path.split('/');
  if (segments[0] === 'src' && segments.length === 2) return 'visual';

  return 'unknown';
}
