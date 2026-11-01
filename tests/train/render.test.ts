import { describe, expect, it } from 'vitest';
import type { DrawOp } from '../../src/train/blitter';
import { renderOps } from '../../src/train/render';
import type { TrainRes } from '../../src/train/resources';
import { makeSim } from './sim';

describe('what the game draws (TV track)', () => {
  it('starts on the middle-only background frame', () => {
    const sim = makeSim();
    sim.step();
    expect(sim.ctx.b.ops[0]).toEqual({ kind: 'til', role: 'bg_tracks', frame: 8 });
  });

  it('uses the three-lane frames where every lane continues', () => {
    const sim = makeSim();
    sim.ctx.S = sim.ctx.posf = 30 * 48 + 3;
    sim.ctx.row = 30;
    sim.step();
    expect(sim.ctx.b.ops[0]).toEqual({ kind: 'til', role: 'bg_tracks', frame: 48 + 3 });
  });

  it('lowers a sack on its post as it comes close', () => {
    const sim = makeSim();
    sim.ctx.S = sim.ctx.posf = 294; // lane-2 sack at P=294 is at the camera: f = 119
    sim.ctx.row = 6;
    sim.step();
    const post = sim.ops('sack_uppost_right').find((o) => o.kind === 'sprite' && o.frame === 119);
    expect(post).toMatchObject({ dx: 0, dy: 25 });
  });

  it('puts the map marker and score digits where the footage shows them', () => {
    const sim = makeSim();
    sim.step();
    expect(sim.ops('tm_hugo_middle')).toEqual([
      { kind: 'sprite', role: 'tm_hugo_middle', frame: 0, dx: 280, dy: 208, clip: null },
    ]);
    expect(sim.ops('hugo_score').map((o) => (o.kind === 'sprite' ? [o.dx, o.clip] : null))).toEqual([
      [187, [188, 10, 204, 34]],
      [203, [204, 10, 220, 34]],
      [219, [220, 10, 236, 34]],
      [235, [236, 10, 252, 34]],
    ]);
    expect(sim.ops('hugo_live').map((o) => (o.kind === 'sprite' ? o.dx : null))).toEqual([0, 38]);
  });
});

describe('renderOps', () => {
  function fakeCanvas() {
    const calls: unknown[][] = [];
    const rec =
      (name: string) =>
      (...args: unknown[]) =>
        calls.push([name, ...args]);
    const ctx = {
      drawImage: rec('drawImage'),
      save: rec('save'),
      restore: rec('restore'),
      beginPath: rec('beginPath'),
      rect: rec('rect'),
      clip: rec('clip'),
    };
    return { calls, screen: { ctx } as never };
  }
  const img = (name: string) => ({ name }) as never;
  const res = {
    sprite: () => ({ frames: [{ x: 10, y: 20, w: 5, h: 5, image: img('spr') }, { x: 0, y: 0, w: 0, h: 0, image: null }] }),
    til: () => [img('til0')],
    sync: () => [],
  } as unknown as TrainRes;

  it('draws full-screen frames and sprites at baked position plus offset, clipping when asked', () => {
    const { calls, screen } = fakeCanvas();
    const ops: DrawOp[] = [
      { kind: 'til', role: 'bg_tracks', frame: 0 },
      { kind: 'sprite', role: 'hugo_pump', frame: 0, dx: 3, dy: -4, clip: null },
      { kind: 'sprite', role: 'hugo_pile', frame: 0, dx: 77, dy: 44, clip: [78, 45, 110, 78] },
      { kind: 'sprite', role: 'hugo_pump', frame: 1, dx: 0, dy: 0, clip: null },
    ];
    renderOps(screen, res, ops);
    expect(calls).toEqual([
      ['drawImage', { name: 'til0' }, 0, 0],
      ['drawImage', { name: 'spr' }, 13, 16],
      ['save'],
      ['beginPath'],
      ['rect', 78, 45, 32, 33],
      ['clip'],
      ['drawImage', { name: 'spr' }, 87, 64],
      ['restore'],
    ]);
  });
});
