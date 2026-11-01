// The train plugin's phases and tick driver (Hugo.exe: PhaseIntro 0x41cf10,
// HugoHitBuffer 0x4135d0, HugoHitLocomotive 0x4138e0, PlayerSelect 0x41e340,
// Tick 0x418210, Esc/quit 0x413420).
import type { DrawOp } from './blitter';
import { isEven, oosAt, type TrainCtx } from './ctx';
import type { TrainGame } from './game';

export interface Phase {
  enter(): void;
  update(): string | null;
}

const f32 = Math.fround;

export class IntroPhase implements Phase {
  private talking = true;
  private i = 0;
  private n = 0;
  private x18 = 314;
  private x1c = -60;
  private n2 = 0;
  private v = 0;

  constructor(private readonly ctx: TrainCtx) {}

  get moveTicks(): number {
    return this.n2;
  }

  // 0x41cef0
  enter(): void {
    this.x18 = 314;
    this.i = 0;
    this.n = 0;
    this.x1c = -60;
    this.n2 = 0;
    this.v = 0;
    this.talking = true;
  }

  update(): string | null {
    const { ctx } = this;
    const { b } = ctx;
    this.n++;
    if (this.talking) {
      if (this.n === 7) ctx.sound.play('syncsnd_start');
      const v = oosAt(ctx.syncs('sync_intro'), this.i);
      if (v === 0) {
        this.talking = false;
      } else {
        b.setPosition('in_scroll', -Math.trunc(this.x18), 0);
        b.draw('in_scroll', 0);
        b.setPosition('in_vognanim', Math.trunc(this.x1c), 1);
        b.draw('in_vognanim', v - 1);
      }
      if (this.n > 7 && isEven(this.n)) this.i++;
      if (ctx.keys.skip()) {
        this.talking = false;
        ctx.sound.stop('syncsnd_start');
      }
      return null;
    }
    ctx.divider = this.x18 < 220 ? 2 : 4;
    if (this.n2 === 70) ctx.sound.play('snd_tog_loop', true);
    if (this.n2 > 9) this.x18 = f32(this.x18 - this.v * 1.25);
    const phase = this.n2 % 14;
    if (phase === 0) ctx.sound.play(this.x18 >= 220 ? 'snd_piiiv' : 'snd_skrab');
    else if (phase === 7) ctx.sound.play('snd_haandtag');
    else if (phase >= 8) {
      this.v = f32(this.v + 0.2);
      this.x18 = f32(this.x18 - this.v * f32(0.33333334));
    }
    this.x1c = f32(this.x1c - this.v);
    if (this.x18 < 0) {
      ctx.divider = ctx.baseDivider;
      return 'Phase_Game';
    }
    b.setPosition('in_scroll', -Math.trunc(this.x18), 0);
    b.draw('in_scroll', 0);
    if (this.n2 < 8) {
      b.setPosition('in_vognanim', Math.trunc(this.x1c), 1);
      b.draw('in_vognanim', this.n2 + 15);
    } else {
      b.setPosition('in_movevognanim', Math.trunc(this.x1c), 1);
      b.draw('in_movevognanim', (this.n2 % 14) + 15);
    }
    this.n2++;
    return null;
  }
}

export class HitBufferPhase implements Phase {
  private f = 0;
  private n = 0;
  private i = 0;

  constructor(
    private readonly ctx: TrainCtx,
    private readonly game: TrainGame,
  ) {}

  // 0x413590
  enter(): void {
    this.f = 0;
    this.n = 0;
    this.i = 0;
  }

  update(): string | null {
    const { ctx } = this;
    this.n++;
    if (this.f < 14) {
      if (this.n === 1) ctx.sound.play('syncsnd_hitbufffer');
      const v = oosAt(ctx.syncs('sync_crashstart'), this.i);
      if (v === 0) {
        this.f = 14;
        this.i = 0;
      } else {
        ctx.b.drawTil('bg_hugohitbuffer', v - 1);
      }
      if (isEven(this.n)) this.i++;
      if (ctx.keys.skip()) {
        this.f = 14;
        this.i = 0;
        ctx.sound.stop('syncsnd_hitbuffer'); // misspelt in the original, so the line keeps playing
      }
      return null;
    }
    if (this.f > 95) {
      ctx.spare--;
      ctx.divider = ctx.baseDivider;
      this.game.tell.start(ctx);
      return 'PlayerSelect';
    }
    ctx.divider = 4;
    const cue: Record<number, string> = {
      26: 'snd_woodsticks',
      58: 'snd_piiiv',
      71: 'snd_piiiv',
      64: 'snd_haandtag',
      78: 'snd_haandtag',
      91: 'snd_pivedyr',
    };
    if (cue[this.f]) ctx.sound.play(cue[this.f]);
    ctx.b.drawTil('bg_hugohitbuffer', this.f);
    this.f++;
    return null;
  }
}

export class HitLocoPhase implements Phase {
  private f = 0;
  private n = 0;
  private i = 0;
  private v = 0;
  private spoken = false;

  constructor(
    private readonly ctx: TrainCtx,
    private readonly game: TrainGame,
  ) {}

  // 0x413890
  enter(): void {
    this.ctx.divider = 1;
    this.f = 0;
    this.n = 0;
    this.i = 0;
    this.v = 0;
    this.spoken = false;
  }

  update(): string | null {
    const { ctx } = this;
    const { b } = ctx;
    this.n++;
    if (this.f > 104) {
      if (!this.spoken) {
        ctx.sound.play('syncsnd_buckettalk');
        this.spoken = true;
      }
      const u = oosAt(ctx.syncs('sync_buckettalk'), this.i);
      if (u !== 0) {
        b.setPosition('in_scroll', -Math.trunc(this.v), 0);
        b.draw('in_scroll', 0);
        b.setPosition('hugo_bucketsync', 0, 1);
        b.draw('hugo_bucketsync', u + 42);
        if (isEven(this.n)) this.i++;
        return null;
      }
      ctx.spare--;
      this.game.tell.start(ctx);
      return 'PlayerSelect';
    }
    if (this.f < 60) this.v = f32(this.v + (63 - this.f) * 0.08);
    b.setPosition('in_scroll', -Math.trunc(this.v), 0);
    b.draw('in_scroll', 0);
    b.setPosition('hugo_flyv', 0, 1);
    b.draw('hugo_flyv', this.f);
    if (this.f < 54 && isEven(this.n)) this.f++;
    if (this.f > 53) this.f++; // also on the tick it reaches 54, so frame 54 is never shown
    if (!isEven(this.n) && this.f < 54) return null;
    const cue: Record<number, string[]> = {
      20: ['snd_uuhva', 'snd_baathorn'],
      35: ['snd_ouhv', 'snd_skrid'],
      70: ['snd_grydelaag'],
      80: ['snd_syde'],
    };
    for (const s of cue[this.f] ?? []) ctx.sound.play(s);
    if (this.f >= 54) ctx.divider = ctx.baseDivider;
    return null;
  }
}

export class PlayerSelectPhase implements Phase {
  private entered = false;
  private players = [0, 2]; // 0 new, 1 playing, 2 out; one player only for now
  private cur = 0;

  constructor(private readonly game: TrainGame) {}

  enter(): void {}

  update(): string | null {
    if (!this.entered) {
      this.entered = true;
      if (this.game.gameOver || this.game.ended) this.players[this.cur] = 2;
      this.cur = (this.cur + 1) % 2;
      if (this.players[this.cur] === 2) {
        this.cur = (this.cur + 1) % 2;
        if (this.players[this.cur] === 2) return 'EndGamePlease';
      }
    }
    const s = this.players[this.cur];
    if (s === 0) {
      this.entered = false;
      this.players[this.cur] = 1;
      return 'PhaseIntro';
    }
    if (s !== 1) return null;
    this.entered = false;
    return 'Phase_Game';
  }
}

export class TrainPlugin {
  readonly phases: Record<string, Phase>;
  phaseName = 'PlayerSelect';
  result: { score: number } | null = null;
  lastOps: DrawOp[] = []; // a tick that draws nothing keeps the previous picture
  private current: Phase;
  private entering = true;
  private counter = 0;
  private quitting = false;
  private quitTicks = 0;

  constructor(
    readonly ctx: TrainCtx,
    readonly game: TrainGame,
  ) {
    this.phases = {
      PlayerSelect: new PlayerSelectPhase(game),
      PhaseIntro: new IntroPhase(ctx),
      Phase_Game: { enter() {}, update: () => game.update() },
      HugoHitBuffer: new HitBufferPhase(ctx, game),
      HugoHitLocomotive: new HitLocoPhase(ctx, game),
    };
    this.current = this.phases.PlayerSelect;
  }

  // Esc: a 20-tick fade, then back to the menu with no score (0x413420)
  quit(): void {
    if (!this.quitting) {
      this.quitting = true;
      this.quitTicks = 0;
    }
  }

  get fade(): number {
    return this.quitting ? Math.min(1, this.quitTicks / 20) : 0;
  }

  // 0x418210: one engine tick (~21 ms); a logic tick every `divider` engine ticks
  engineTick(): void {
    if (this.result) return;
    if (++this.counter < this.ctx.divider) return;
    this.counter = 0;
    if (this.quitting && ++this.quitTicks > 19) {
      this.result = { score: 0 };
      return;
    }
    this.ctx.b.begin();
    if (this.entering) {
      this.current.enter();
      this.entering = false;
    }
    const next = this.current.update();
    if (this.ctx.b.ops.length > 0) this.lastOps = this.ctx.b.ops;
    if (!next) return;
    const phase = this.phases[next];
    if (phase) {
      this.current = phase;
      this.phaseName = next;
      this.entering = true;
    } else {
      this.result = { score: this.ctx.score };
    }
  }
}
