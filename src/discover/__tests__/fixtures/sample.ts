// Fixture for ast-scanner tests. Mixes every supported function shape.

export function topLevelFn(a: number): string {
  return String(a);
}

export const arrowFn = (b: string) => b.length;

export default function defaultFn(): void {
  /* default-exported */
}

const localArrow = () => 42;

function privateFn() {
  return localArrow();
}

export class Foo {
  constructor(public x: number) {
    /* ctor body */
  }

  method(): number {
    const nested = (k: number): number => this.x + k;
    return nested(1);
  }

  get y(): number {
    return this.x;
  }
}

export const factory = (config: { id: string }) => {
  const inner = () => config.id.length;
  return inner;
};
