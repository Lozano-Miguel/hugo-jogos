// The "Phase_Game" phase of the train plugin (Hugo.exe 0x419bd0) with the map strip
// (0x414870), the HUD (0x419a80) and the "tell lives" talking head (0x41dea0).
import { cdiv, isEven, oosAt, type TrainCtx } from './ctx';
import { Hugo } from './hugo';
import { Cell, type Level, ROW } from './level';
import type { GfxRole } from './resources';
import { TrackController } from './track';

export class TellLives {
  n = 0;
  i = 0;
  active = false;

  // 0x41e110
  start(ctx: TrainCtx): void {
    this.i = 0;
    this.active = true;
    this.n = 0;
    ctx.resync = true;
  }

  // 0x41dea0: false when the game-over line has finished
  update(ctx: TrainCtx): boolean {
    const { b } = ctx;
    ctx.speed = 0;
    this.n++;
    const finish = () => {
      this.active = false;
      ctx.speed = 1;
    };
    if (ctx.spare === -1) {
      if (this.n === 1) ctx.sound.play('syncsnd_gameover');
      const v = oosAt(ctx.syncs('sync_gameover'), this.i);
      if (v === 0) {
        finish();
        return false;
      }
      b.draw('hugo_tellonelife', v - 1);
      if (isEven(this.n)) this.i++;
      return true;
    }
    if (ctx.spare === 0) {
      if (this.n < 8) {
        b.draw('hugo_tellonelife', 11);
        if (isEven(cdiv(this.n, 2))) {
          b.setPosition('hugo_banke1', 15, 143);
          b.draw('hugo_banke1', 0);
          return true;
        }
        b.setPosition('hugo_banke2', 15, 138);
        b.draw('hugo_banke2', 0);
        if (this.n === 2 || this.n === 6) ctx.sound.play('snd_monitor');
        return true;
      }
      if (this.n === 8) ctx.sound.play('syncsnd_lastlife');
      const v = oosAt(ctx.syncs('sync_lastlife'), this.i);
      if (v === 0) {
        finish();
        return true;
      }
      b.draw('hugo_tellonelife', v - 1);
      b.setPosition('hugo_banke2', 15, 138);
      b.draw('hugo_banke2', 0);
      if (isEven(this.n)) this.i++;
      return true;
    }
    if (ctx.spare === 1) {
      if (this.n === 1) ctx.sound.play('syncsnd_onelife');
      const v = oosAt(ctx.syncs('sync_onelifeleft'), this.i);
      if (v === 0) {
        finish();
        return true;
      }
      b.draw('hugo_tellonelife', v - 1);
      if (isEven(this.n)) this.i++;
    }
    return true;
  }
}

export type GameNext = 'HugoHitBuffer' | 'HugoHitLocomotive' | 'PlayerSelect' | 'PhasePlayer';

export class TrainGame {
  readonly track: TrackController;
  readonly hugo: Hugo;
  readonly tell = new TellLives();
  ended = false; // reached the goal (+0x1f0)
  gameOver = false; // +0x1f1

  constructor(
    readonly ctx: TrainCtx,
    level: Level,
  ) {
    this.track = new TrackController(ctx, level);
    this.hugo = new Hugo(ctx, this.track);
  }

  // 0x419bd0: one logic tick
  update(): GameNext | null {
    const { ctx, track, hugo } = this;
    if (ROW * track.L - 168 <= ctx.S && hugo.lane === track.endLane) hugo.enterGoal();
    if (this.tell.active && ctx.resync) {
      ctx.S = Math.trunc(ctx.posf);
      track.update();
      ctx.resync = false;
    }
    track.drawBackground();
    let next: GameNext | null = null;
    if (!this.tell.active) {
      track.update();
      ctx.posf += ctx.speed;
      ctx.S = Math.trunc(ctx.posf);
      ctx.row = cdiv(ctx.S, ROW);
      hugo.tick();
      next = hugo.update();
      if (next === 'PlayerSelect') this.ended = true;
      if (ctx.trainOverlay) {
        ctx.trainOverlay.draw(ctx);
        ctx.trainOverlay = null;
      }
    } else if (!this.tell.update(ctx)) {
      next = 'PhasePlayer';
      this.gameOver = true;
    }
    this.drawMap();
    this.drawHud();
    return next;
  }

  // 0x414870
  private drawMap(): void {
    const { ctx, track, hugo } = this;
    const { b, S } = ctx;
    const tile = (role: GfxRole, x: number, y: number) => {
      b.setPosition(role, x, y);
      b.draw(role, 0);
    };
    for (let r = ctx.row - 2; r < ctx.row + 15; r++) {
      const y = 240 - Math.trunc((r - S / ROW + 2) * 16);
      const xs = [256, 280, 296];
      for (let lane = 0; lane < 3; lane++) {
        const x = xs[lane];
        const c = track.cellAt(lane, r);
        switch (c) {
          case Cell.Track:
            tile((['tm_track_straight_left', 'tm_track_straight_middle', 'tm_track_straight_right'] as const)[lane], x, y);
            break;
          case Cell.None:
            if (lane === 0) {
              tile('tm_grass_left', x, y);
              tile('tm_grass_middle', 264, y);
            } else if (lane === 1) {
              tile('tm_grass_middle', x, y);
            } else {
              tile('tm_grass_middle', x, y);
              tile('tm_grass_right', 312, y);
            }
            break;
          case Cell.BufEnd:
          case Cell.BufStart: {
            const side: GfxRole = c === Cell.BufEnd ? 'tm_stop_front_side' : 'tm_stop_back_side';
            const middle: GfxRole = c === Cell.BufEnd ? 'tm_stop_front_middle' : 'tm_stop_back_middle';
            if (lane === 0) {
              tile('tm_grass_left', x, y);
              tile(side, 260, y);
            } else if (lane === 1) {
              tile(middle, x, y);
            } else {
              tile('tm_grass_right', 312, y);
              tile(side, x - 4, y);
            }
            break;
          }
          default: {
            const role = (
              {
                [Cell.SwLeft]: 'tm_track_change_left_front',
                [Cell.JoinFromRight]: 'tm_track_change_left_back',
                [Cell.SwRight]: 'tm_track_change_right_front',
                [Cell.JoinFromLeft]: 'tm_track_change_right_back',
              } as Record<number, GfxRole>
            )[c];
            if (lane === 0) {
              tile('tm_grass_left', x, y);
              if (c === Cell.SwLeft) {
                // original bug: positions one sprite, draws another (never on a valid track)
                b.setPosition(role, 264, y);
                b.draw('tm_stop_back_side', 0);
              } else {
                tile(role, 264, y);
              }
            } else if (lane === 1) {
              tile(role, x, y);
            } else {
              tile(role, x, y);
              tile('tm_grass_right', 312, y);
            }
          }
        }
      }
    }
    for (const t of track.trains) {
      if (!(S - ROW * 2 < t.pos && t.pos < S + ROW * 15)) continue;
      const y = 240 - Math.trunc(((t.pos + 12 - S) / ROW + 2) * 16);
      const x = [266, 282, 298][t.mapLane];
      if (x === undefined) continue;
      if (!t.shifting) tile('tm_train_middle', x, y);
      else tile(t.shiftDir < 0 ? 'tm_train_left' : 'tm_train_right', x + t.mapSlide, y);
    }
    const hx = [264, 280, 296][hugo.mapLane] ?? 280;
    if (!hugo.mapSliding) {
      tile('tm_hugo_middle', hx, 208);
      return;
    }
    const half = cdiv(hugo.mapSlideT, 2);
    const slide = hugo.mapTarget === 2 || (hugo.mapTarget === 1 && hugo.mapLane === 0) ? half : -half;
    tile(slide >= 0 ? 'tm_hugo_right' : 'tm_hugo_left', hx + slide, 208);
  }

  // 0x419a80
  private drawHud(): void {
    const { b, score, spare } = this.ctx;
    for (let k = 0, x = 0; k < spare; k++, x += 38) {
      b.setPosition('hugo_live', x, 0);
      b.draw('hugo_live', 0);
    }
    const digits = [cdiv(score % 10000, 1000), cdiv(score % 1000, 100), cdiv(score % 100, 10), score % 10];
    digits.forEach((d, k) => {
      const x = 188 + 16 * k;
      b.setPosition('hugo_score', x - 19 * d - 1, 9);
      b.setClip('hugo_score', x, 10, x + 16, 34);
      b.draw('hugo_score', 0);
    });
  }
}
