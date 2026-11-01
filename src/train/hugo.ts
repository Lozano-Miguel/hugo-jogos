// Hugo on the handcar (Hugo.exe 0x41b6a0–0x41ce60). Logic and drawing are interleaved
// exactly like the original; field comments give the original offsets.
import { isEven, oosAt, type TrainCtx } from './ctx';
import { Cell } from './level';
import type { GfxRole } from './resources';
import type { StaticObj, TrackController, Train } from './track';

// Lane-change x tables (0x478590–0x478740)
const T590 = [0, 4, 9, 15, 23, 30, 37, 45, 52, 58, 67, 75, 81, 89, 97, 104];
const T5D0 = [0, -6, -11, -17, -25, -32, -39, -47, -54, -60, -69, -77, -83, -91, -99, -106];
const T610 = [0, 5, 12, 19, 27, 35, 41, 49, 54, 62, 69, 77, 85, 94];
const T648 = [0, -9, -17, -24, -31, -38, -47, -53, -61, -68, -76, -83, -90, -97];
const T680 = [0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 0, 0, 0];
const T6C0 = [3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 4, 4, 4, 3, 3];
const T708 = [0, 0, 1, 1, 1, 2, 2, 2, 1, 1, 1, 0, 0, 0];
const T740 = [3, 3, 4, 4, 4, 5, 5, 5, 5, 4, 4, 4, 3, 3];

const CART: GfxRole[] = ['hugo_cart_left', 'hugo_cart_middle', 'hugo_cart_right'];
const SCART: GfxRole[] = ['hugo_scart_left', 'hugo_scart_middle', 'hugo_scart_right'];
const CART_X = [-51, -38, -24];

export type HugoPhase = 'HugoHitBuffer' | 'HugoHitLocomotive' | 'PlayerSelect';

export class Hugo {
  lane = 1; // +4
  mapLane = 1; // +8
  cartToggle = 0; // +0xc
  bobCounter = 5; // +0x10
  bob = 0; // +0x14
  endStep = 0; // +0x18
  pump = 1; // +0x1c
  t = 0; // +0x20 ticks in the state machine
  f = 0; // +0x24 frame counter of the current action
  i = 0; // +0x28 lane-change step
  w = 0; // +0x30 squash wobble
  piiivToggle = 0; // +0x34
  pumpCounter = 0; // +0x38
  pumping = true; // +0x3c
  moving = true; // +0x40
  togOn = true; // +0x41 (the intro already started the loop)
  mapSliding = false; // +0x42
  closeAhead = false; // +0x43
  mapSlideT = 0; // +0x44
  sackPhase = 0; // +0x48
  state = 0; // +0x4c
  leftHighlight = 0; // +0x58
  rightHighlight = 0; // +0x5c
  target = 1; // +0x60
  hitDeferred = false; // +0x64
  hitHandled = false; // +0x65
  hitBase = 0; // +0x68
  mapTarget = 1; // +0x6c
  switchP = 0; // +0x74
  sack: StaticObj | null = null; // +0x78
  train: Train | null = null; // +0x7c

  constructor(
    readonly ctx: TrainCtx,
    readonly track: TrackController,
  ) {
    this.reset();
    ctx.speed = 1;
  }

  // 0x41bb90
  reset(): void {
    this.state = 0;
    this.rightHighlight = 0;
    this.leftHighlight = 0;
    this.pump = 1;
    this.moving = true;
    this.f = 0;
  }

  // 0x41ce60
  enterGoal(): void {
    if (this.state !== 7) {
      this.state = 7;
      this.f = 14;
      this.moving = false;
    }
  }

  // 0x41b750: per-tick logic (lane-change trigger, pumping, detection)
  tick(): void {
    const { ctx } = this;
    if (!this.togOn && this.state !== 7) {
      this.togOn = true;
      ctx.sound.play('snd_tog_loop', true);
    }
    this.closeAhead = false;
    if (this.state === 0 || this.state === 2) this.detectSack();
    if (this.target !== this.lane && this.state !== 5 && this.state !== 6) {
      const d = this.switchP - ctx.S;
      if (d < 40) this.closeAhead = true;
      const from = this.lane;
      const to = this.target;
      if (
        (from === 1 && to === 2 && d === 19) ||
        (from === 2 && to === 1 && d === 21) ||
        (from === 1 && to === 0 && d === 18) ||
        (from === 0 && to === 1 && d === 22)
      ) {
        this.closeAhead = false;
        ctx.sound.play('snd_flyby');
        this.state = 1;
        this.mapLane = this.lane;
        this.mapTarget = this.target;
        this.mapSliding = true;
        this.mapSlideT = 0;
        this.i = 0;
      }
    }
    if (this.state === 0) this.updatePumping();
    if (this.state !== 5 && this.state !== 6) this.detectCollisions();
  }

  private updatePumping(): void {
    if (!this.pumping) {
      this.pumpCounter -= 2;
      if (this.pumpCounter < 1) this.pumping = true;
      return;
    }
    const before = this.pumpCounter;
    this.moving = true;
    this.pumpCounter++;
    if (this.pumpCounter < 121 || this.pump !== 2) {
      if (isEven(this.ctx.S)) {
        if (this.pump === 2) {
          if (this.closeAhead) {
            this.pumping = false;
            this.pumpCounter = before + 26;
            this.moving = false;
          }
          if (!this.moving) return;
          this.ctx.sound.play(this.piiivToggle === 0 ? 'snd_piiiv2' : 'snd_piiiv');
          this.piiivToggle = this.piiivToggle === 0 ? 1 : 0;
        }
        if (this.moving && ++this.pump > 3) this.pump = 0;
      }
    } else {
      this.moving = false;
      this.pumping = false;
    }
  }

  // 0x41bbb0
  private detectSack(): void {
    if (this.lane === 1) return;
    this.sack = this.track.findSack(this.lane);
    if (!this.sack) return;
    const d = this.sack.pos - this.ctx.S;
    if (d < 16) this.closeAhead = true;
    if (d === 6) {
      this.closeAhead = false;
      this.state = 3;
      this.f = 0;
      this.sackPhase = 0;
    }
  }

  // 0x41bc20
  private detectCollisions(): void {
    const S = this.ctx.S;
    const buf = this.track.findBuffer(this.lane) - S;
    if (buf < 24) this.closeAhead = true;
    if (buf === 6) {
      this.moving = true;
      this.closeAhead = false;
      this.f = 0;
      this.pump = 0;
      this.state = 5;
      return;
    }
    this.train = this.track.findTrain(this.state === 1 ? this.target : this.lane);
    if (!this.train) return;
    const d = this.train.P() - S;
    if (d < 70) this.closeAhead = true;
    if (d > 44 && d < 50) {
      this.closeAhead = false;
      this.f = S - this.train.P() + 48;
      if (this.state !== 1) {
        this.state = 6;
        this.hitHandled = false;
        return;
      }
      this.hitDeferred = true;
      this.hitHandled = false;
    }
  }

  // 0x41b930: the 4/6 prompt and the choice. The original also draws a highlighted
  // arrow for 20 ticks after a press; the 1998 PT footage never shows it, so we don't.
  private prompt(): void {
    const { b } = this.ctx;
    const sw = this.track.findSwitch(this.lane);
    let leftAvail = false;
    let rightAvail = false;
    if (sw) {
      if ((sw.type === 2 && this.lane === 0) || (sw.type === 3 && this.lane === 1)) rightAvail = true;
      if ((sw.type === 4 && this.lane === 2) || (sw.type === 5 && this.lane === 1)) leftAvail = true;
    }
    if (leftAvail || this.leftHighlight !== 0) {
      if (this.leftHighlight === 0) {
        if (leftAvail && this.lane === this.target) {
          b.setPosition('hugo_pile', 77, 44);
          b.setClip('hugo_pile', 78, 45, 110, 78);
          if (this.ctx.keys.left()) {
            this.target = Math.max(0, this.lane - 1);
            this.leftHighlight = 20;
            this.switchP = sw!.pos;
          } else {
            b.draw('hugo_pile', 0);
          }
        }
      } else {
        this.leftHighlight--;
      }
    }
    if (rightAvail || this.rightHighlight !== 0) {
      if (this.rightHighlight !== 0) {
        this.rightHighlight--;
        return;
      }
      if (rightAvail && this.lane === this.target) {
        b.setPosition('hugo_pile', 104, 44);
        b.setClip('hugo_pile', 140, 45, 172, 78);
        if (this.ctx.keys.right()) {
          this.target = Math.min(2, this.lane + 1);
          this.rightHighlight = 20;
          this.switchP = sw!.pos;
        } else {
          b.draw('hugo_pile', 0);
        }
      }
    }
  }

  // 0x41bd20: the cart
  private drawCart(): void {
    const { b, speed } = this.ctx;
    if (speed > 0) {
      this.bobCounter--;
      if (this.bobCounter === 0) {
        this.bob = this.bob === 0 ? 1 : 0;
        this.bobCounter = this.bob !== 0 ? 8 : 2;
      }
    }
    if (this.lane < 0 || this.lane > 2) return;
    if (this.moving) {
      const role = CART[this.lane];
      b.setPosition(role, CART_X[this.lane], this.bob + 40);
      b.draw(role, (this.pump + 2) % 4);
      return;
    }
    const role = SCART[this.lane];
    b.setPosition(role, CART_X[this.lane], this.bob + 40);
    b.draw(role, this.cartToggle);
    if (speed > 0) this.cartToggle = this.cartToggle === 0 ? 1 : 0;
  }

  // 0x41bed0: Hugo pumping
  private drawPump(dx: number): void {
    const x = this.lane === 0 ? dx - 5 : this.lane === 1 ? dx : dx + 6;
    this.ctx.b.setPosition('hugo_pump', x, this.bob + 16);
    this.ctx.b.draw('hugo_pump', this.pump + (2 - this.lane) * 4);
  }

  // 0x41bf60: Hugo gasping at the oncoming train
  private drawGasp(dx: number, k: number): void {
    const base = this.lane === 0 ? 6 : this.lane === 1 ? 3 : 0;
    if (this.lane >= 0 && this.lane <= 2) {
      this.ctx.b.setPosition('hugo_hitloco', this.lane === 0 ? dx - 6 : this.lane === 2 ? dx + 6 : dx, 16);
    }
    this.ctx.b.draw('hugo_hitloco', k > 2 ? base + 2 : base + k);
  }

  // 0x41c290: state machine (also draws Hugo); returns the next phase or null
  update(): HugoPhase | null {
    const { ctx } = this;
    if (this.mapSliding && ++this.mapSlideT > 31) {
      this.mapSliding = false;
      this.mapLane = this.lane;
    }
    if (this.train !== null && (this.hitDeferred || this.state === 6)) {
      if (isEven(this.t)) this.f++;
      this.hitBase = -6 - Math.trunc((58 - (this.train.lane === 1 ? 5 : 0) - this.train.N) * 0.5 * -1.5);
      if (this.f === this.hitBase && !isEven(this.t)) ctx.sound.play('syncsnd_hittrain');
      if (this.hitDeferred && this.f - this.hitBase === 6) {
        this.state = 6;
        this.hitDeferred = false;
      }
    }
    if (this.state !== 6) this.prompt();
    if (this.state !== 1 && this.state !== 6) this.drawCart();

    switch (this.state) {
      case 0:
        this.drawPump(0);
        this.t++;
        return null;
      case 1:
        return this.laneChangeStep();
      case 2:
        this.settleStep();
        return null;
      case 3:
        this.grabStep();
        return null;
      case 4:
        this.stowStep();
        return null;
      case 5:
        return this.hitBufferStep();
      case 6:
        return this.hitTrainStep();
      case 7:
        return this.goalStep();
    }
    this.t++;
    return null;
  }

  private laneChangeStep(): null {
    const { b } = this.ctx;
    const k = this.i;
    this.cartToggle = this.cartToggle === 0 ? 1 : 0;
    const done = (lane: number, last: number) => {
      if (++this.i > last) {
        this.lane = lane;
        this.i = 0;
        this.t++;
        this.state = 2;
        return true;
      }
      return false;
    };
    if (this.target === 0) {
      b.setPosition('hugo_scart_right', T648[k] - 146, 40);
      b.draw('hugo_scart_right', this.cartToggle);
      b.setPosition('hugo_turn', T648[k] - 60, 8);
      b.draw('hugo_turn', T740[k]);
      if (done(0, 13)) return null;
    } else if (this.target === 1) {
      if (this.lane === 0) {
        b.setPosition('hugo_scart_left', T590[k] - 44, 40);
        b.draw('hugo_scart_left', this.cartToggle);
        b.setPosition('hugo_turn', T590[k] - 63, 8);
        b.draw('hugo_turn', T680[k]);
      } else if (this.lane === 2) {
        b.setPosition('hugo_scart_right', T5D0[k] - 26, 40);
        b.draw('hugo_scart_right', this.cartToggle);
        b.setPosition('hugo_turn', T5D0[k] + 54, 8);
        b.draw('hugo_turn', T6C0[k]);
      } else {
        this.t++;
        return null;
      }
      if (done(1, 15)) return null;
    } else if (this.target === 2) {
      b.setPosition('hugo_scart_left', T610[k] + 72, 40);
      b.draw('hugo_scart_left', this.cartToggle);
      b.setPosition('hugo_turn', T610[k] + 57, 0);
      b.draw('hugo_turn', T708[k]);
      if (done(2, 13)) return null;
    }
    this.t++;
    return null;
  }

  private settleStep(): void {
    const { b } = this.ctx;
    let k = this.i;
    if (k === 0) {
      this.drawPump(0);
    } else {
      if (k > 3) k = 6 - k;
      if (this.lane === 0) {
        b.setPosition('hugo_turn', -63 - k, 8);
        b.draw('hugo_turn', 0);
      } else if (this.lane === 1 && this.mapLane === 2) {
        b.setPosition('hugo_turn', 53 - k, 8);
        b.draw('hugo_turn', 0);
      } else {
        b.setPosition('hugo_turn', this.lane === 2 ? k + 54 : k - 62, 8);
        b.draw('hugo_turn', 3);
      }
    }
    if (++this.i > 6) {
      this.state = 0;
    }
    this.t++;
  }

  private grabStep(): void {
    const { ctx } = this;
    ctx.b.draw('hugo_catch', (this.lane !== 0 ? 0 : 3) + this.f);
    if (isEven(ctx.S)) this.f += this.sackPhase !== 0 ? -1 : 1;
    if (this.f === 0 && this.sackPhase !== 0) {
      this.state = 4;
      this.f = 0;
      this.sackPhase = 0;
      this.t++;
      return;
    }
    if (this.f === 3 && this.sackPhase === 0) {
      this.collect(this.sack!);
      this.sackPhase = 1;
      this.f = 2;
    }
    this.t++;
  }

  // 0x413e40
  private collect(sack: StaticObj): void {
    sack.hasSack = false;
    const { ctx } = this;
    if (sack.kind === 0) {
      ctx.score += 50;
      ctx.sound.play('snd_saek');
    } else if (sack.kind === 1) {
      ctx.score += 50;
      ctx.sound.play('snd_saek_ond');
    } else if (sack.kind === 2) {
      ctx.score += 100;
      ctx.sound.play('snd_saek_super');
    }
  }

  private stowStep(): void {
    const { ctx } = this;
    ctx.b.setPosition('hugo_turn', this.lane === 0 ? -57 : 48, this.bob + 8);
    ctx.b.draw('hugo_turn', (this.lane !== 0 ? 3 : 0) + this.f);
    if (ctx.S % 3 === 0) this.f += this.sackPhase !== 0 ? -1 : 1;
    if (this.f !== 0 || this.sackPhase === 0) {
      if (this.f === 3 && this.sackPhase === 0) {
        this.sackPhase = 1;
        this.t++;
        this.f = 2;
        return;
      }
      if (!(this.f === 0 && this.sackPhase !== 0)) {
        this.t++;
        return;
      }
    }
    this.state = 0;
    this.sackPhase = 0;
    this.t++;
  }

  private hitBufferStep(): HugoPhase | null {
    const { ctx, track } = this;
    if (this.f === 0 && this.t % 3 === 0) {
      track.saveTrains();
      ctx.sound.play('snd_skramle');
    }
    ctx.speed = 0;
    let base = 0;
    if (this.lane === 0) {
      base = 8;
      ctx.b.setPosition('hugo_hit', -6, 6);
    } else if (this.lane === 1) {
      base = 4; // no offset is set here in the original: Hugo pops up (seen in the footage)
    } else if (this.lane === 2) {
      ctx.b.setPosition('hugo_hit', 8, 6);
    }
    ctx.b.draw('hugo_hit', base + this.f);
    if (this.t % 3 === 0) {
      this.pump = 0;
      this.f++;
    }
    if (this.f > 3) {
      this.togOn = false;
      ctx.sound.stop('snd_tog_loop');
      track.rewindTrains(9);
      track.deleteNearTrains();
      this.reset();
      this.respawn();
      this.t++;
      return 'HugoHitBuffer';
    }
    this.t++;
    return null;
  }

  private hitTrainStep(): HugoPhase | null {
    const { ctx, track } = this;
    const train = this.train!;
    if (this.f < this.hitBase) {
      this.drawCart();
      this.drawPump(0);
      this.t++;
      return null;
    }
    if (this.f < this.hitBase + 6) {
      this.drawCart();
      this.drawGasp(0, this.f - this.hitBase);
      this.t++;
      return null;
    }
    this.w -= ctx.speed * 0.5;
    if (!this.hitHandled) {
      this.hitHandled = true;
      train.glue(ctx);
      track.saveTrains();
    }
    const smackX = [-1, 77, 157][this.lane];
    const tailX = [41, 119, 199][this.lane];
    if (smackX !== undefined) {
      ctx.b.setPosition('hugo_smack', smackX, 47);
      ctx.b.setPosition('hugo_smack_tail', tailX, 88);
    }
    const d = this.f - this.hitBase;
    if (d - 6 < 3) {
      ctx.b.draw('hugo_smack', d - 3);
      ctx.b.draw('hugo_smack_tail', d - 3);
    } else {
      const wi = Math.trunc(this.w);
      ctx.b.draw('hugo_smack', (wi % 3) + 2);
      ctx.b.draw('hugo_smack_tail', wi % 4);
    }
    if (ctx.speed >= 0 && this.f > 30) {
      this.reset();
      this.respawn();
      track.rewindTrains(55);
      track.removeTrain(train);
      this.train = null;
      track.deleteNearTrains();
      this.hitDeferred = false;
      this.togOn = false;
      ctx.sound.stop('snd_tog_loop');
      this.t++;
      return 'HugoHitLocomotive';
    }
    this.t++;
    return null;
  }

  private goalStep(): HugoPhase | null {
    const { ctx } = this;
    ctx.b.setPosition('hugo_endtalk', this.lane === 0 ? -112 : this.lane === 1 ? 0 : 120, 16);
    if (ctx.speed > 0) {
      ctx.speed -= 0.2;
      if (ctx.speed < 0.5 && this.togOn) {
        this.togOn = false;
        ctx.sound.stop('snd_tog_loop');
      }
      if (ctx.speed < 0) ctx.speed = 0;
      this.drawPump(0);
      this.t++;
      return null;
    }
    if (ctx.speed !== 0) {
      this.t++;
      return null;
    }
    if (this.f > 16) {
      if (this.endStep === 0 && !isEven(this.t)) ctx.sound.play('syncsnd_reachedend');
      const v = oosAt(ctx.syncs('sync_endtrack'), this.endStep);
      if (v === 0) return 'PlayerSelect';
      ctx.b.draw('hugo_endtalk', v - 1);
      if (isEven(this.t)) this.endStep++;
      this.t++;
      return null;
    }
    ctx.b.draw('hugo_endtalk', this.f);
    if (isEven(this.t)) this.f++;
    this.t++;
    return null;
  }

  // 0x412ee0: is there a way forward from (lane,row) for `depth` rows?
  private pathSafe(lane: number, row: number, depth: number): boolean {
    for (;;) {
      if (depth < 1) return true;
      if (!(row < this.track.L - 2 || lane !== this.track.endLane)) return true;
      const c = this.track.cellAt(lane, row);
      switch (c) {
        case Cell.Track:
        case Cell.JoinFromRight:
        case Cell.JoinFromLeft:
          depth--;
          row++;
          continue;
        case Cell.SwLeft: {
          const e = this.track.endLane;
          if (lane === e || lane < e) {
            if (this.pathSafe(lane, row + 1, depth - 1)) return true;
            lane--;
          } else if (this.pathSafe(lane - 1, row + 1, depth - 1)) {
            return true;
          }
          return this.pathSafe(lane, row + 1, depth - 1);
        }
        case Cell.SwRight: {
          const e = this.track.endLane;
          if (lane === e || e <= lane) {
            if (this.pathSafe(lane, row + 1, depth - 1)) return true;
            lane++;
          } else if (this.pathSafe(lane + 1, row + 1, depth - 1)) {
            return true;
          }
          return this.pathSafe(lane, row + 1, depth - 1);
        }
        default:
          return false;
      }
    }
  }

  // 0x41c020: pick a safe lane after a crash
  respawn(): void {
    const row = this.ctx.row;
    const safe = (lane: number) => this.pathSafe(lane, row + 1, 50) && this.pathSafe(lane, row + 2, 50);
    let chosen = false;
    if (safe(this.lane)) {
      chosen = true;
    } else if (this.lane === 0 || this.lane === 2) {
      if (safe(1)) {
        this.lane = 1;
        chosen = true;
      } else if (this.lane === 0 && safe(2)) {
        this.lane = 2;
        chosen = true;
      } else if (this.lane === 2 && safe(0)) {
        this.lane = 0;
        chosen = true;
      }
    } else if (safe(0)) {
      this.lane = 0;
      chosen = true;
    } else if (safe(2)) {
      this.lane = 2;
      chosen = true;
    }
    if (!chosen) {
      const blocked = (lane: number) => {
        const c = this.track.cellAt(lane, row);
        return c === Cell.None || c === Cell.BufEnd || c === Cell.BufStart;
      };
      if (blocked(1) && !blocked(0)) this.lane = 0;
      else if (blocked(1) && !blocked(2)) this.lane = 2;
      else this.lane = 1;
    }
    this.target = this.lane;
    this.mapLane = this.lane;
  }
}

