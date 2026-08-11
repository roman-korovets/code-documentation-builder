// Type classifier — heuristic ladder for the `type:` frontmatter field.
//
// Ladder order matters: earlier rules dominate. Stop on first match.

import type { InventoryEntry } from '../discover/index.js';
import type { FunctionType } from './index.js';

export interface TypeClassifyOptions {
  sourceText?: string;
}

export function classifyType(entry: InventoryEntry, _opts: TypeClassifyOptions = {}): FunctionType {
  const file = entry.file.replace(/\\/g, '/');
  const localName = entry.name.includes('.') ? entry.name.split('.').pop()! : entry.name;
  const sig = entry.signature;

  // 1. Callbacks folder — Syncfusion event handlers, PDF callbacks.
  if (file.includes('/callbacks/')) return 'callback';

  // 2. React hooks: name starts with `use<UpperCase>` and lives in a hooks-shaped path.
  if (/^use[A-Z]/.test(localName)) {
    if (file.includes('/hooks/') || /hook/i.test(file)) return 'hook';
  }

  // 3. Utility files / folders — checked EARLY so they win over service-folder rules
  //    for helpers that happen to live next to a service entry point.
  if (
    file.includes('/utils/') ||
    file.endsWith('/utils.ts') ||
    file.endsWith('/util.ts') ||
    file.endsWith('/utils.tsx') ||
    file.startsWith('src/utils/')
  ) {
    return 'util';
  }

  // 4. Conventional service file (one of the host's patterns: `service.ts`).
  if (file.endsWith('/service.ts')) return 'service';

  // 5. Export pipelines (excel / pdf services).
  if (file.includes('/excel-service/') || file.includes('/pdf-service/')) return 'export';

  // 6. Render-side services / dynamic stylesheet.
  if (file.includes('/render-service/') || file.includes('/modify-stylesheet/')) return 'render';

  // 7. Visual class methods on the root `src/visual.ts` are orchestrators of render.
  if (file === 'src/visual.ts' && entry.kind === 'class-method') return 'render';

  // 8. React components: PascalCase top-level declaration in a .tsx file.
  if (
    file.endsWith('.tsx') &&
    /^[A-Z]/.test(localName) &&
    (entry.kind === 'named-export' || entry.kind === 'arrow-const' || entry.kind === 'default')
  ) {
    return 'component';
  }
  if (/\b(?:JSX\.Element|ReactElement|ReactNode|FunctionComponent|FC<)\b/.test(sig)) return 'component';

  // 9. Service class methods inside src/services/.
  if (file.includes('/services/') && entry.kind === 'class-method') return 'service';

  // 10. Settings classes — model declarations, treated as service-like.
  if (file.startsWith('src/settings/') || file.startsWith('src/settings-interfaces/')) {
    if (entry.kind === 'class-method' || entry.kind === 'named-export') return 'service';
  }

  // 11. Fallback.
  return 'transform';
}
