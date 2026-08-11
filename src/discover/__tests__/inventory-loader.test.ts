import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadInventory } from '../inventory-loader.js';

const tmp = (ext: string, content: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'inv-'));
  const path = join(dir, `inventory.${ext}`);
  writeFileSync(path, content, 'utf8');
  return path;
};

describe('inventory-loader', () => {
  it('parses a valid JSON inventory', async () => {
    const path = tmp(
      'json',
      JSON.stringify([
        { name: 'foo', file: 'src/a.ts', lineRange: '1-5', kind: 'named-export', signature: '()' },
        { name: 'bar', file: 'src/b.ts', lineRange: '7-9', kind: 'arrow-const', signature: '()', exported: true },
      ]),
    );
    const entries = await loadInventory(path);
    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe('foo');
    expect(entries[1].exported).toBe(true);
  });

  it('rejects JSON that is not an array', async () => {
    const path = tmp('json', '{"name":"foo"}');
    await expect(loadInventory(path)).rejects.toThrow(/must be an array/);
  });

  it('rejects entries missing required fields', async () => {
    const path = tmp('json', JSON.stringify([{ name: 'foo' }]));
    await expect(loadInventory(path)).rejects.toThrow(/missing required field/);
  });

  it('rejects entries with invalid kind', async () => {
    const path = tmp(
      'json',
      JSON.stringify([{ name: 'foo', file: 'a.ts', lineRange: '1-1', kind: 'mystery', signature: '()' }]),
    );
    await expect(loadInventory(path)).rejects.toThrow(/invalid kind/);
  });

  it('parses CSV with header row', async () => {
    const csv = [
      'name,file,lineRange,kind,signature',
      'foo,src/a.ts,1-5,named-export,()',
      'bar,src/b.ts,7-9,arrow-const,()',
    ].join('\n');
    const path = tmp('csv', csv);
    const entries = await loadInventory(path);
    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe('foo');
    expect(entries[1].kind).toBe('arrow-const');
  });

  it('rejects unsupported extension', async () => {
    const path = tmp('yaml', 'name: foo');
    await expect(loadInventory(path)).rejects.toThrow(/Unsupported inventory file extension/);
  });
});
