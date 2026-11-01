import { describe, expect, it } from 'vitest';
import { makeSim } from './sim';

describe('riding the TV track (no trains)', () => {
  it('rides straight at one unit per tick without input', () => {
    const sim = makeSim();
    expect(sim.run(600)).toBeNull();
    expect(sim.ctx.S).toBe(600);
    expect(sim.game.hugo.lane).toBe(1);
  });

  it('shows the grey 4 prompt only while the left switch at P=190 is in its window', () => {
    const sim = makeSim();
    sim.runUntil(() => sim.ctx.S === 100);
    sim.step(); // S = 101
    expect(sim.ops('hugo_pile')).toEqual([
      { kind: 'sprite', role: 'hugo_pile', frame: 0, dx: 77, dy: 44, clip: [78, 45, 110, 78] },
    ]);
    sim.runUntil(() => sim.ctx.S === 157);
    sim.step(); // S = 158, P - S = 32: the 4 window is closed (the next switch, a 6 at P=243, is now shown)
    expect(sim.ops('hugo_pile').map((o) => (o.kind === 'sprite' ? o.dx : null))).toEqual([104]);
  });

  it('takes the left switch when 4 is held during the window', () => {
    const sim = makeSim();
    sim.keys.left = true;
    sim.runUntil(() => sim.game.hugo.state === 1);
    expect(sim.ctx.S).toBe(190 - 18);
    expect(sim.sounds).toContain('snd_flyby');
    sim.keys.left = false;
    sim.runUntil(() => sim.game.hugo.state === 2);
    expect(sim.game.hugo.lane).toBe(0);
    sim.runUntil(() => sim.game.hugo.state === 0);
    expect(sim.game.hugo.lane).toBe(0);
  });

  it('ignores 6 at a switch that only goes left', () => {
    const sim = makeSim();
    sim.keys.right = true;
    sim.run(200);
    expect(sim.game.hugo.lane).toBe(1);
  });

  it('grabs the first lane-0 sack automatically and scores by its kind', () => {
    const sim = makeSim();
    sim.keys.left = true;
    sim.runUntil(() => sim.game.hugo.lane === 0);
    sim.keys.left = false;
    const sack = sim.level.objects.find((o) => o.type === 8 && o.lane === 0 && o.pos === 246)!;
    sim.runUntil(() => sim.game.hugo.state === 3);
    expect(sim.ctx.S).toBe(240);
    sim.runUntil(() => sim.ctx.score > 0);
    expect(sim.ctx.score).toBe(sack.kind === 2 ? 100 : 50);
    expect(sim.sounds).toContain(['snd_saek', 'snd_saek_ond', 'snd_saek_super'][sack.kind!]);
  });

  it('crashes into the lane-0 buffer at 516 and goes to the buffer scene', () => {
    const sim = makeSim();
    sim.keys.left = true;
    sim.runUntil(() => sim.game.hugo.lane === 0);
    sim.keys.left = false;
    sim.runUntil(() => sim.game.hugo.state === 5);
    expect(sim.ctx.S).toBe(510);
    expect(sim.ctx.speed).toBe(0);
    expect(sim.run(40)).toBe('HugoHitBuffer');
    expect(sim.sounds).toContain('snd_skramle');
    expect(sim.sounds).toContain('stop:snd_tog_loop');
  });

  it('reaches the goal on the middle lane and ends after the last line', () => {
    const sim = makeSim();
    sim.ctx.posf = 1640;
    sim.ctx.S = 1640;
    sim.runUntil(() => sim.game.hugo.state === 7);
    expect(sim.ctx.S).toBe(1657); // checked against 48*38-168 = 1656 at the start of the tick
    const next = sim.run(300);
    expect(next).toBe('PlayerSelect');
    expect(sim.sounds).toContain('syncsnd_reachedend');
    expect(sim.game.ended).toBe(true);
  });
});
