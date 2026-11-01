import { describe, expect, it } from 'vitest';
import { HitBufferPhase, HitLocoPhase, IntroPhase, TrainPlugin } from '../../src/train/phases';
import { makeSim } from './sim';

function runPhase(sim: ReturnType<typeof makeSim>, phase: { enter(): void; update(): string | null }, max = 2000) {
  phase.enter();
  const frames: { til: number[]; sprites: [string, number][] }[] = [];
  const dividers: number[] = [];
  for (let k = 0; k < max; k++) {
    sim.ctx.b.begin();
    const next = phase.update();
    frames.push({
      til: sim.ctx.b.ops.flatMap((o) => (o.kind === 'til' ? [o.frame] : [])),
      sprites: sim.ctx.b.ops.flatMap((o) => (o.kind === 'sprite' ? [[o.role, o.frame] as [string, number]] : [])),
    });
    dividers.push(sim.ctx.divider);
    if (next) return { next, frames, dividers, ticks: k + 1 };
  }
  throw new Error('phase never ended');
}

describe('PhaseIntro', () => {
  it('talks, then pumps the cart off screen and starts the game', () => {
    const sim = makeSim();
    const intro = new IntroPhase(sim.ctx);
    const r = runPhase(sim, intro);
    expect(r.next).toBe('Phase_Game');
    expect(sim.sounds[0]).toBe('syncsnd_start');
    expect(sim.sounds).toContain('snd_tog_loop');
    expect(intro.moveTicks).toBeGreaterThanOrEqual(75);
    expect(intro.moveTicks).toBeLessThanOrEqual(79);
    expect(r.dividers).toContain(4);
    expect(r.dividers).toContain(2);
    expect(r.dividers.at(-1)).toBe(3);
  });

  it('skips the speech when Space is held', () => {
    const sim = makeSim();
    sim.keys.skip = true;
    const r = runPhase(sim, new IntroPhase(sim.ctx));
    expect(sim.sounds).toContain('stop:syncsnd_start');
    expect(r.ticks).toBeLessThan(100);
  });
});

describe('HugoHitBuffer', () => {
  it('plays the side scene with its sound cues and takes a life', () => {
    const sim = makeSim();
    const r = runPhase(sim, new HitBufferPhase(sim.ctx, sim.game));
    expect(r.next).toBe('PlayerSelect');
    const shown = r.frames.flatMap((f) => f.til).filter((f) => f >= 14);
    expect(shown).toEqual(Array.from({ length: 82 }, (_, k) => k + 14));
    expect(sim.sounds).toEqual([
      'syncsnd_hitbufffer',
      'snd_woodsticks',
      'snd_piiiv',
      'snd_haandtag',
      'snd_piiiv',
      'snd_haandtag',
      'snd_pivedyr',
    ]);
    expect(sim.ctx.spare).toBe(1);
    expect(sim.game.tell.active).toBe(true);
  });
});

describe('HugoHitLocomotive', () => {
  it('flies Hugo across the sky, then the bucket talk, and takes a life', () => {
    const sim = makeSim();
    const r = runPhase(sim, new HitLocoPhase(sim.ctx, sim.game));
    expect(r.next).toBe('PlayerSelect');
    const flight = r.frames.flatMap((f) => f.sprites.filter(([role]) => role === 'hugo_flyv').map(([, fr]) => fr));
    expect(flight.slice(0, 4)).toEqual([0, 0, 1, 1]);
    expect(flight.at(-1)).toBe(104);
    expect(new Set(flight).size).toBe(104); // frame 54 is skipped by the original's double increment
    expect(flight).not.toContain(54);
    expect(sim.sounds).toEqual([
      'snd_uuhva',
      'snd_baathorn',
      'snd_ouhv',
      'snd_skrid',
      'snd_grydelaag',
      'snd_syde',
      'syncsnd_buckettalk',
    ]);
    expect(sim.ctx.spare).toBe(1);
  });
});

describe('TrainPlugin', () => {
  it('plays a whole TV game without input until game over', () => {
    const sim = makeSim({ trains: true });
    const plugin = new TrainPlugin(sim.ctx, sim.game);
    const seen = new Set<string>();
    for (let k = 0; k < 60000 && !plugin.result; k++) {
      plugin.engineTick();
      seen.add(plugin.phaseName);
    }
    expect(plugin.result).not.toBeNull();
    expect(sim.game.gameOver).toBe(true);
    expect([...seen]).toEqual(expect.arrayContaining(['PlayerSelect', 'PhaseIntro', 'Phase_Game']));
    expect(seen.has('HugoHitBuffer') || seen.has('HugoHitLocomotive')).toBe(true);
    expect(sim.sounds).toContain('syncsnd_gameover');
  });

  it('quits after a 20-tick fade with score 0 when Esc is pressed', () => {
    const sim = makeSim();
    const plugin = new TrainPlugin(sim.ctx, sim.game);
    for (let k = 0; k < 600; k++) plugin.engineTick();
    sim.ctx.score = 150;
    plugin.quit();
    let ticks = 0;
    while (!plugin.result && ticks < 1000) {
      plugin.engineTick();
      ticks++;
    }
    expect(plugin.result).toEqual({ score: 0 });
    expect(ticks).toBeGreaterThanOrEqual(20 * 3 - 3);
    expect(ticks).toBeLessThanOrEqual(21 * 4);
  });

  it('plays random Arcade games to the end without errors', () => {
    for (const seed of [1, 2, 3, 4, 5, 1234567]) {
      const sim = makeSim({ mode: 'arcade', seed, trains: true });
      const plugin = new TrainPlugin(sim.ctx, sim.game);
      for (let k = 0; k < 100000 && !plugin.result; k++) plugin.engineTick();
      expect(plugin.result, `seed ${seed}`).not.toBeNull();
    }
  });

  it('can reach the goal: holding the key of every prompt still ends the game cleanly', () => {
    const sim = makeSim({ trains: true });
    const plugin = new TrainPlugin(sim.ctx, sim.game);
    for (let k = 0; k < 100000 && !plugin.result; k++) {
      const pile = sim.ctx.b.ops.find((o) => o.kind === 'sprite' && o.role === 'hugo_pile');
      sim.keys.left = !!pile && pile.kind === 'sprite' && pile.dx === 77;
      sim.keys.right = !!pile && pile.kind === 'sprite' && pile.dx === 104;
      plugin.engineTick();
    }
    expect(plugin.result).not.toBeNull();
    expect(sim.game.ended || sim.game.gameOver).toBe(true);
  });
});
