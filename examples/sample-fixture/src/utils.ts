// String + array helpers.

export function isBlank(s: string | undefined | null): boolean {
  return !s || s.trim().length === 0;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
