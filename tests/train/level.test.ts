import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildLevel } from '../../src/train/level';
import { MsvcRand } from '../../src/train/rand';

interface Fixture {
  mode: 0 | 1;
  seed: number;
  string: string;
  length: number;
  endLane: number;
  cells: number[][];
  objects: Record<string, number>[];
  trains: { lane: number; pos: number; cmds: number[][]; target_lane?: number; meet?: number }[];
  retries: number;
  rngState: number;
}

const fixtures: Fixture[] = JSON.parse(readFileSync('tests/fixtures/levels.json', 'utf8'));

function build(mode: 'tv' | 'arcade', seed: number) {
  const rand = new MsvcRand(seed);
  return { level: buildLevel(mode, rand), rand };
}

describe('buildLevel matches the verified port of the original', () => {
  for (const f of fixtures) {
    const mode = f.mode === 0 ? 'tv' : 'arcade';
    it(`${mode} seed ${f.seed}`, () => {
      const { level, rand } = build(mode, f.seed);
      expect(level.string).toBe(f.string);
      expect(level.length).toBe(f.length);
      expect(level.endLane).toBe(f.endLane);
      expect(level.cells).toEqual(f.cells);
      expect(level.objects).toEqual(f.objects);
      expect(level.trains).toEqual(
        f.trains.map(({ target_lane, ...t }) => (target_lane === undefined ? t : { ...t, targetLane: target_lane })),
      );
      expect(level.retries).toBe(f.retries);
      expect(rand.state).toBe(f.rngState);
    });
  }
});

describe('known vectors from the original', () => {
  it('arcade seed 1', () => {
    const { level, rand } = build('arcade', 1);
    expect([level.length, level.endLane, level.trains.length, level.retries]).toEqual([77, 0, 10, 1]);
    expect(level.objects.filter((o) => o.type === 8)).toHaveLength(88);
    expect(level.objects.filter((o) => o.type === 1)).toHaveLength(151);
    expect(rand.state).toBe(0x367a2566);
  });

  it('arcade seed 2', () => {
    const { level, rand } = build('arcade', 2);
    expect([level.length, level.trains.length, level.retries]).toEqual([56, 5, 5]);
    expect(rand.state).toBe(0x60337272);
  });

  it('TV track', () => {
    const { level } = build('tv', 3);
    expect([level.length, level.endLane, level.trains.length]).toEqual([38, 1, 9]);
    expect(level.objects.filter((o) => o.type === 8 && o.lane === 0)).toHaveLength(19);
    expect(level.objects.filter((o) => o.type === 8 && o.lane === 2)).toHaveLength(19);
  });
});
