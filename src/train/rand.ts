// MSVC rand()/srand() as used by Hugo.exe (FUN_0043f530 / FUN_0043f520).
export class MsvcRand {
  state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (Math.imul(this.state, 214013) + 2531011) >>> 0;
    return (this.state >>> 16) & 0x7fff;
  }
}

// (rand() * n) >> 15: uniform integer in [0, n).
export function scale(r: number, n: number): number {
  return (r * n) >> 15;
}
