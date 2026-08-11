// Hot-path detector — flags functions that run O(rows × cols) every render.
//
// Defaults cover the canonical Syncfusion / Power BI Gantt hot callbacks; any
// project can extend via config.

import type { InventoryEntry } from '../discover/index.js';

// camelCase identifiers don't have `\b` boundaries between letters, so plain
// substring matching with the case-insensitive flag is more reliable.
// `pdfQuery[A-Z]` keeps the `[A-Z]` literal to require a CamelCase boundary.
export const DEFAULT_HOT_PATH_PATTERNS: RegExp[] = [
  /queryCellInfo/i,
  /taskbarInfo/i,
  /rowDataBound/i,
  /headerCellInfo/i,
  /pdfQuery[A-Z]/,
  /applyConditionalFormattingToRow/i,
  /applyCfClassesToTaskbar/i,
  /applyGroupedChartRowClasses/i,
  /syncTaskLabelSpans/i,
];

export function detectHotPath(entry: InventoryEntry, customPatterns?: RegExp[]): boolean {
  const patterns = customPatterns ?? DEFAULT_HOT_PATH_PATTERNS;
  const localName = entry.name.includes('.') ? entry.name.split('.').pop()! : entry.name;
  return patterns.some((p) => p.test(entry.name) || p.test(localName));
}
