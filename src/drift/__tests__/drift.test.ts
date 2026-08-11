import { describe, it, expect } from 'vitest';
import { diffInventories, entriesEquivalent } from '../compare-inventories.js';
import { detectRenames } from '../rename-detector.js';
import { detectMoves } from '../move-detector.js';
import { detectDrift } from '../index.js';
import type { InventoryEntry } from '../../discover/index.js';

const e = (over: Partial<InventoryEntry>): InventoryEntry => ({
  name: 'fn', file: 'src/a.ts', lineRange: '1-5', kind: 'named-export', signature: '()',
  ...over,
});

describe('diffInventories', () => {
  it('identifies added / removed / kept by (file, name)', () => {
    const old = [e({ name: 'a' }), e({ name: 'b' })];
    const next = [e({ name: 'a' }), e({ name: 'c' })];
    const out = diffInventories(old, next);
    expect(out.added.map((x) => x.name)).toEqual(['c']);
    expect(out.removed.map((x) => x.name)).toEqual(['b']);
    expect(out.kept.map((p) => p.newEntry.name)).toEqual(['a']);
  });

  it('returns empty arrays for identical inventories', () => {
    const inv = [e({ name: 'a' }), e({ name: 'b' })];
    const out = diffInventories(inv, inv);
    expect(out.added).toHaveLength(0);
    expect(out.removed).toHaveLength(0);
    expect(out.kept).toHaveLength(2);
  });
});

describe('entriesEquivalent', () => {
  it('matches on signature + lineRange + kind', () => {
    expect(entriesEquivalent(e({}), e({}))).toBe(true);
  });
  it('rejects when signature differs', () => {
    expect(entriesEquivalent(e({ signature: '()' }), e({ signature: '(x: number)' }))).toBe(false);
  });
  it('rejects when lineRange shifted', () => {
    expect(entriesEquivalent(e({ lineRange: '1-5' }), e({ lineRange: '10-15' }))).toBe(false);
  });
});

describe('detectRenames', () => {
  it('pairs entries with same file + signature + kind, different name', () => {
    const removed = [e({ name: 'foo', signature: '(x: T) => T' })];
    const added = [e({ name: 'bar', signature: '(x: T) => T' })];
    const out = detectRenames(removed, added);
    expect(out.renames).toHaveLength(1);
    expect(out.renames[0].removed.name).toBe('foo');
    expect(out.renames[0].added.name).toBe('bar');
    expect(out.remainingRemoved).toHaveLength(0);
    expect(out.remainingAdded).toHaveLength(0);
  });

  it('leaves unmatched entries in remaining arrays', () => {
    const removed = [e({ name: 'foo', signature: '(x: T) => T' })];
    const added = [e({ name: 'bar', signature: '(y: T) => void' })];
    const out = detectRenames(removed, added);
    expect(out.renames).toHaveLength(0);
    expect(out.remainingRemoved).toHaveLength(1);
    expect(out.remainingAdded).toHaveLength(1);
  });
});

describe('detectMoves', () => {
  it('pairs entries with same name + signature + kind in different files', () => {
    const removed = [e({ name: 'foo', file: 'src/a.ts' })];
    const added = [e({ name: 'foo', file: 'src/b.ts' })];
    const out = detectMoves(removed, added);
    expect(out.moves).toHaveLength(1);
    expect(out.moves[0].removed.file).toBe('src/a.ts');
    expect(out.moves[0].added.file).toBe('src/b.ts');
  });

  it('does not match when both file and name changed (that is a rename + move; ambiguous)', () => {
    const removed = [e({ name: 'foo', file: 'src/a.ts' })];
    const added = [e({ name: 'bar', file: 'src/b.ts' })];
    const out = detectMoves(removed, added);
    expect(out.moves).toHaveLength(0);
  });
});

describe('detectDrift composer', () => {
  it('classifies all six delta kinds correctly', async () => {
    const old = [
      e({ name: 'unchanged-1', file: 'src/a.ts', signature: '(x: A)' }),
      e({ name: 'updated-1', file: 'src/a.ts', signature: '(x: number)' }),
      e({ name: 'will-be-removed', file: 'src/a.ts', signature: '(r: Removed)' }),
      e({ name: 'old-name', file: 'src/a.ts', signature: '() => void' }),
      e({ name: 'will-be-moved', file: 'src/a.ts', signature: '(m: Mover)' }),
    ];
    const next = [
      e({ name: 'unchanged-1', file: 'src/a.ts', signature: '(x: A)' }),
      e({ name: 'updated-1', file: 'src/a.ts', signature: '(x: string)' }),
      e({ name: 'fresh-addition', file: 'src/a.ts', signature: '(z: Added)' }),
      e({ name: 'new-name', file: 'src/a.ts', signature: '() => void' }), // rename of old-name
      e({ name: 'will-be-moved', file: 'src/b.ts', signature: '(m: Mover)' }), // moved
    ];
    const { counts } = await detectDrift({ oldInventory: old, newInventory: next });
    expect(counts.added).toBe(1);
    expect(counts.removed).toBe(1);
    expect(counts.renamed).toBe(1);
    expect(counts.moved).toBe(1);
    expect(counts.updated).toBe(1);
    expect(counts.unchanged).toBe(1);
  });

  it('returns all-unchanged when no changes', async () => {
    const inv = [e({ name: 'a' }), e({ name: 'b' })];
    const { counts } = await detectDrift({ oldInventory: inv, newInventory: inv });
    expect(counts.unchanged).toBe(2);
    expect(counts.added + counts.removed + counts.renamed + counts.moved + counts.updated).toBe(0);
  });
});
