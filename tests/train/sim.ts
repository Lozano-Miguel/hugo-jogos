// Test harness: the train game logic with the original data, no browser.
import { decodeOos } from '../../src/formats/oos';
import { Blitter } from '../../src/train/blitter';
import { TrainCtx } from '../../src/train/ctx';
import { buildLevel, type Level } from '../../src/train/level';
import { MsvcRand } from '../../src/train/rand';
import { GFX, SYNCS } from '../../src/train/resources';
import { TrainGame } from '../../src/train/game';
import { readData, trainFrameCounts } from '../helpers';

const counts = trainFrameCounts(GFX);
const syncs = Object.fromEntries(Object.entries(SYNCS).map(([k, f]) => [k, decodeOos(readData(f))]));

export function makeSim(opts: { mode?: 'tv' | 'arcade'; seed?: number; trains?: boolean; level?: Level } = {}) {
  const level = opts.level ?? buildLevel(opts.mode ?? 'tv', new MsvcRand(opts.seed ?? 1));
  if (!opts.trains) level.trains = [];
  const sounds: string[] = [];
  const keys = { left: false, right: false, skip: false };
  const ctx = new TrainCtx(
    new Blitter(counts),
    { play: (n) => sounds.push(n), stop: (n) => sounds.push(`stop:${n}`) },
    { left: () => keys.left, right: () => keys.right, skip: () => keys.skip },
    (name) => syncs[name],
  );
  const game = new TrainGame(ctx, level);
  return {
    ctx,
    game,
    level,
    keys,
    sounds,
    step(): string | null {
      ctx.b.begin();
      return game.update();
    },
    run(ticks: number): string | null {
      for (let i = 0; i < ticks; i++) {
        const next = this.step();
        if (next) return next;
      }
      return null;
    },
    runUntil(pred: () => boolean, max = 5000): number {
      for (let i = 0; i < max; i++) {
        if (pred()) return i;
        const next = this.step();
        if (next) throw new Error(`phase changed to ${next} before condition`);
      }
      throw new Error('condition never met');
    },
    ops(role: string) {
      return ctx.b.ops.filter((o) => o.kind === 'sprite' && o.role === role);
    },
  };
}
