// External-caller sentinels.
//
// After the forward call graph is built, every entry with an empty `calledBy`
// array is tested against the sentinel rules. If a rule matches, its sentinel
// string is prepended to `calledBy`. This preserves the property that hot
// entry points (Visual.update, Syncfusion callbacks, React roots) are never
// orphaned — they get a `[<sentinel>]` token instead.

import type { ClassifiedEntry } from '../classify/index.js';

export interface ExternalCallerRule {
  filePattern?: RegExp;
  namePattern?: RegExp;
  kindPattern?: ClassifiedEntry['kind'][];
  hotPathOnly?: boolean;
  sentinel: string;
}

export const DEFAULT_EXTERNAL_CALLER_RULES: ExternalCallerRule[] = [
  // Power BI IVisual lifecycle methods.
  {
    filePattern: /^src\/visual\.ts$/,
    namePattern: /^Visual\.(constructor|update|destroy|getFormattingModel|getColumns)$/,
    sentinel: '[powerbi-host-ivisual-update]',
  },
  // Any Syncfusion Gantt callback — they sit in `**/callbacks/` and are passed
  // as props to <GanttComponent>.
  {
    filePattern: /\/callbacks\//,
    sentinel: '[syncfusion-gantt-internal]',
  },
  // PDF / Excel hot callbacks invoked inside Syncfusion's export pipeline.
  {
    namePattern: /^(pdfQuery|pdfColumnHeaderQuery|pdfTimelineCell)/,
    sentinel: '[syncfusion-gantt-internal]',
  },
  // Hot CF helpers stamped onto rows during Syncfusion render.
  {
    namePattern: /^(applyCfClassesToTaskbar|applyGroupedChartRowClasses|syncTaskLabelSpans|queryTaskbarInfo)$/,
    sentinel: '[syncfusion-gantt-internal]',
  },
  // Root React component(s).
  {
    filePattern: /^src\/(App|SimpleApp)\.tsx$/,
    namePattern: /^(App|SimpleApp)$/,
    sentinel: '[react-render]',
  },
];

export function pickSentinel(entry: ClassifiedEntry, rules: ExternalCallerRule[]): string | null {
  for (const rule of rules) {
    if (rule.filePattern && !rule.filePattern.test(entry.file)) continue;
    if (rule.namePattern && !rule.namePattern.test(entry.name)) continue;
    if (rule.kindPattern && !rule.kindPattern.includes(entry.kind)) continue;
    if (rule.hotPathOnly && !entry.hotPath) continue;
    return rule.sentinel;
  }
  return null;
}
