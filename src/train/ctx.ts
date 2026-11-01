// Shared state of the train plugin (the object at DAT_00481dc8 in Hugo.exe).
import type { Blitter } from './blitter';
import type { Train } from './track';

export interface Sounds {
  play(name: string, loop?: boolean): void;
  stop(name: string): void;
}

export interface Keys {
  left(): boolean;
  right(): boolean;
  skip(): boolean; // Space: skips the intro and buffer-crash speeches
}

export class TrainCtx {
  S = 0; // scroll position (+0x70)
  posf = 0; // float scroll (+0x78)
  row = 0; // S / 48 (+0x74)
  speed = 0; // units per tick (+0x80)
  score = 0;
  spare = 2; // spare lives shown as heads (lives - 1)
  baseDivider = 3; // engine ticks per logic tick (+0x20)
  divider = 3; // current divider (+0x24)
  trainOverlay: Train | null = null; // middle-lane train redrawn over Hugo (TrainGame+0x1c)
  resync = false; // +0x1e4: resync scroll after a crash

  constructor(
    readonly b: Blitter,
    readonly sound: Sounds,
    readonly keys: Keys,
    readonly syncs: (name: string) => number[],
  ) {}
}

// OOS step lookup as FUN_00438430: the byte at `step`, or 0 ("done") past the end.
export function oosAt(sync: number[], step: number): number {
  return step >= 0 && step < sync.length ? sync[step] & 0xff : 0;
}

// C semantics used throughout the original.
export const cdiv = (a: number, b: number) => Math.trunc(a / b);
export const cmod = (a: number, b: number) => a % b; // JS % already truncates toward zero
export const isEven = (n: number) => n % 2 === 0;
