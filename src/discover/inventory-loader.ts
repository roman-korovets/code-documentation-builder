// Inventory loader — alternate path to the AST scanner.
// Accepts JSON (array of InventoryEntry) or CSV (header row + data rows).

import { readFileSync } from 'node:fs';
import type { InventoryEntry } from './index.js';

const REQUIRED = ['name', 'file', 'lineRange', 'kind', 'signature'] as const;
const VALID_KINDS = new Set(['named-export', 'default', 'class-method', 'local', 'arrow-const']);

export async function loadInventory(path: string): Promise<InventoryEntry[]> {
  const text = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) return parseJson(text, path);
  if (path.endsWith('.csv')) return parseCsv(text, path);
  throw new Error(`Unsupported inventory file extension: ${path} (expected .json or .csv)`);
}

function parseJson(text: string, path: string): InventoryEntry[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON in ${path}: ${(e as Error).message}`);
  }
  if (!Array.isArray(data)) throw new Error(`Inventory JSON must be an array, got ${typeof data}`);
  return data.map((row, i) => validate(row, i));
}

function parseCsv(text: string, path: string): InventoryEntry[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error(`CSV in ${path} needs at least a header row + 1 data row`);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line, i) => {
    const fields = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = fields[idx] ?? '';
    });
    return validate(row, i + 1);
  });
}

function splitCsvLine(line: string): string[] {
  // Minimal CSV: comma-separated, optional double-quoted fields. No embedded newlines.
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQuote = false;
      else cur += ch;
    } else if (ch === '"') inQuote = true;
    else if (ch === ',') {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function validate(row: unknown, idx: number): InventoryEntry {
  if (!row || typeof row !== 'object') throw new Error(`Entry ${idx} is not an object`);
  const r = row as Record<string, unknown>;
  for (const k of REQUIRED) {
    if (!(k in r) || r[k] === undefined || r[k] === '') {
      throw new Error(`Entry ${idx} missing required field '${k}'`);
    }
  }
  if (!VALID_KINDS.has(String(r.kind))) {
    throw new Error(`Entry ${idx} has invalid kind '${r.kind}'; expected one of ${[...VALID_KINDS].join(', ')}`);
  }
  const entry: InventoryEntry = {
    name: String(r.name),
    file: String(r.file),
    lineRange: String(r.lineRange),
    kind: r.kind as InventoryEntry['kind'],
    signature: String(r.signature),
  };
  if (r.parent !== undefined && r.parent !== '') entry.parent = String(r.parent);
  if (r.exported === true || r.exported === 'true') entry.exported = true;
  return entry;
}
