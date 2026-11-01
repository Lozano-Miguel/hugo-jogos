import { describe, expect, it } from 'vitest';
import { TrainCtx } from '../../src/train/ctx';
import { Train, type TrackController } from '../../src/train/track';
import { makeSim } from './sim';

describe('trains on the TV track', () => {
  it('TV train 2 starts driving once the scroll reaches 96', () => {
    const sim = makeSim({ trains: true });
    const t2 = sim.game.track.trains.find((t) => t.lane === 1 && t.pos === 480)!;
    sim.runUntil(() => sim.ctx.S === 96);
    expect(t2.driving).toBe(false); // trains see the previous tick's scroll
    sim.step();
    expect(t2.driving).toBe(true);
    const pos = t2.pos;
    sim.step();
    expect(t2.pos).toBe(pos - 1);
  });

  it('hits Hugo on the middle lane, pushes him back and goes to the flight scene', () => {
    const sim = makeSim({ trains: true });
    sim.runUntil(() => sim.game.hugo.state === 6);
    const hitAt = sim.ctx.S;
    const t = sim.game.hugo.train!;
    expect(t.P() - hitAt).toBeGreaterThan(44);
    expect(t.P() - hitAt).toBeLessThan(50);
    let minS = hitAt;
    let maxS = hitAt; // Hugo gasps for 20 ticks, then is pushed back from there
    let next: string | null = null;
    for (let k = 0; k < 400 && !next; k++) {
      next = sim.step();
      minS = Math.min(minS, sim.ctx.S);
      maxS = Math.max(maxS, sim.ctx.S);
    }
    expect(next).toBe('HugoHitLocomotive');
    expect(sim.sounds).toContain('syncsnd_hittrain');
    expect(sim.sounds).toContain('snd_tude');
    expect(maxS - hitAt).toBeGreaterThan(10); // still rolling while he gasps
    expect(maxS - minS).toBeGreaterThanOrEqual(43);
    expect(maxS - minS).toBeLessThanOrEqual(48);
    expect(sim.game.track.trains).not.toContain(t);
  });
});

describe('respawn after a buffer crash', () => {
  it('moves Hugo from the dead-end left lane back to the middle', () => {
    const sim = makeSim();
    sim.keys.left = true;
    sim.runUntil(() => sim.game.hugo.lane === 0);
    sim.keys.left = false;
    expect(sim.run(400)).toBe('HugoHitBuffer');
    expect(sim.game.hugo.lane).toBe(1);
    expect(sim.game.hugo.target).toBe(1);
  });
});

describe('the lives talking head', () => {
  function tell(spare: number) {
    const sim = makeSim();
    sim.ctx.spare = spare;
    sim.game.tell.start(sim.ctx);
    const results: (string | null)[] = [];
    for (let k = 0; k < 200 && sim.game.tell.active; k++) results.push(sim.step());
    return { sim, results };
  }

  it('says "one life left" and then rides on', () => {
    const { sim } = tell(1);
    expect(sim.sounds).toContain('syncsnd_onelife');
    expect(sim.game.tell.active).toBe(false);
    expect(sim.ctx.speed).toBe(1);
  });

  it('knocks on the screen twice before the last-life line', () => {
    const { sim } = tell(0);
    expect(sim.sounds.slice(0, 3)).toEqual(['snd_monitor', 'snd_monitor', 'syncsnd_lastlife']);
  });

  it('ends the game after the game-over line', () => {
    const { sim, results } = tell(-1);
    expect(sim.sounds).toContain('syncsnd_gameover');
    expect(results.at(-1)).toBe('PhasePlayer');
    expect(sim.game.gameOver).toBe(true);
  });
});

describe('random trains', () => {
  const fakeTrack = { cellAt: () => 0 } as unknown as TrackController;
  const ctx = (S: number) => {
    const c = new TrainCtx({} as never, { play() {}, stop() {} }, {} as never, () => []);
    c.S = S;
    c.speed = 1;
    return c;
  };

  it('wait until the meeting point is as close as the train is to it, then drive', () => {
    const t = new Train(fakeTrack, { lane: 1, pos: 1200, cmds: [], targetLane: 1, meet: 800 });
    t.update(ctx(480)); // 800-480 = 320 > 1200-800-56 = 344? no: 320 <= 344 -> drives
    expect(t.driving).toBe(true);
    const u = new Train(fakeTrack, { lane: 1, pos: 1200, cmds: [], targetLane: 1, meet: 900 });
    u.update(ctx(480)); // 420 > 1200-900-56 = 244 -> waits
    expect(u.driving).toBe(false);
  });

  it('only decide on row boundaries', () => {
    const t = new Train(fakeTrack, { lane: 1, pos: 1200, cmds: [], targetLane: 1, meet: 800 });
    t.update(ctx(481));
    expect(t.driving).toBe(false);
  });

  it('stop before a track start when on the lane numbered by the meeting field, like the original (+0x60)', () => {
    const track = { cellAt: (_lane: number, row: number) => (row === 20 ? 3 : 0) } as unknown as TrackController;
    const t = new Train(track, { lane: 1, pos: 1000, cmds: [], targetLane: 0, meet: 1 });
    t.driving = true;
    t.update(ctx(501)); // pos 999: (999-24)/48 = row 20 is a track start, far from Hugo
    expect(t.driving).toBe(false);
  });
});
