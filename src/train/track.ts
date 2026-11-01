// TrackController, static track objects and trains (Hugo.exe 0x412cc0–0x416540,
// 0x41d230–0x41ddc0). Ported function by function; addresses in comments.
import { cdiv, type TrainCtx } from './ctx';
import { Cell, type Level, ROW, type TrackObject, type TrainCommand } from './level';
import type { GfxRole } from './resources';

const SWITCH_ROLE: Record<number, GfxRole> = {
  2: 'change_track_right_from_left',
  3: 'change_track_right_from_middle',
  4: 'change_track_left_from_right',
  5: 'change_track_left_from_middle',
};
const LANE_SUFFIX = ['left', 'middle', 'right'] as const;
const TREE_ROLE: Record<number, GfxRole> = { 3: 'tree1', 4: 'tree2', 5: 'tree3' };

export class StaticObj {
  readonly type: number;
  readonly lane: number;
  readonly pos: number;
  readonly frames: number;
  readonly flag: number;
  readonly kind: number;
  hasSack: boolean; // +0x18 for sacks

  constructor(o: TrackObject) {
    this.type = o.type;
    this.lane = o.lane;
    this.pos = o.pos;
    this.frames = o.frames;
    this.flag = o.flag ?? 0;
    this.kind = o.kind ?? 0;
    this.hasSack = o.type === 8;
  }

  draw(ctx: TrainCtx): void {
    const { b, S } = ctx;
    const N = this.frames;
    switch (this.type) {
      case 6: {
        // 0x412cf0 buffer seen from the front
        let f = N - this.pos + S;
        if (f > 83) f = -1;
        b.draw(`buffer_front_${LANE_SUFFIX[this.lane]}` as GfxRole, f);
        break;
      }
      case 7: {
        // 0x412db0 buffer seen from behind (track restarts)
        let f = N - this.pos + S;
        if (f > (this.lane === 0 ? 84 : 83)) f = -1;
        b.draw(`buffer_back_${LANE_SUFFIX[this.lane]}` as GfxRole, f);
        break;
      }
      case 1:
      case 9: {
        // 0x41e4f0 tree / 0x4134e0 fence
        let f = S - this.pos + N;
        if (f > N) f = -1;
        b.draw(this.type === 1 ? TREE_ROLE[this.lane] : 'fence', f);
        break;
      }
      case 8:
        this.drawSack(ctx);
        break;
      default: {
        // 0x416350 / 0x4163f0 / 0x4164a0 / 0x416540 switches: two variants in one CGF
        const big = this.type === 2 || this.type === 3;
        let f = N - this.pos + S;
        if (this.flag !== 0 && f > (big ? 97 : 96)) f = -1;
        b.draw(SWITCH_ROLE[this.type], f + (this.flag === 0 ? (big ? 98 : 97) : 0));
      }
    }
  }

  // 0x413c60
  private drawSack(ctx: TrainCtx): void {
    const { b, S } = ctx;
    const N = this.frames;
    let f = S - this.pos + N;
    const yo = Math.trunc((10 * f) / 119) + Math.max(0, Math.trunc(Math.trunc((15 * f * (f - 90)) / 119) / 29));
    if (f > N) f = -1;
    if (this.lane !== 0 && this.lane !== 2) return;
    const side = this.lane === 0 ? 'left' : 'right';
    b.draw(`sack_botpost_${side}`, f > 112 ? -1 : f);
    b.setPosition(`sack_uppost_${side}`, 0, yo);
    b.draw(`sack_uppost_${side}`, f);
    if (this.hasSack) {
      b.setPosition(`sack_${side}`, 0, yo);
      b.draw(`sack_${side}`, f);
    }
  }
}

export class Train {
  lane: number;
  pos: number; // +8
  N = 0; // +0xc
  cmds: TrainCommand[];
  glued = false; // +0x28: pushed back together with Hugo after a hit
  posf: number; // +0x2c
  saved = 0; // +0x30
  driving = false; // +0x34
  hitTicks = 0; // +0x38
  shiftT = 0; // +0x3c
  pause = 0; // +0x40
  animating = false; // +0x44
  frame = 0; // +0x48
  mapLane: number; // +0x4c
  mapSlide = 0; // +0x50
  shifting = false; // +0x54
  shiftDir = 0; // +0x58
  targetLane: number; // +0x5c
  meet: number; // +0x60
  deleted = false;

  constructor(
    readonly track: TrackController,
    spec: { lane: number; pos: number; cmds: TrainCommand[]; targetLane?: number; meet?: number },
  ) {
    this.lane = spec.lane;
    this.pos = spec.pos;
    this.posf = spec.pos;
    this.cmds = spec.cmds.map((c) => [...c] as TrainCommand);
    this.mapLane = spec.lane;
    this.targetLane = spec.targetLane ?? 0; // TV trains: never set in the original (fresh heap memory)
    this.meet = spec.meet ?? 0;
    this.setN();
  }

  // 0x41ddc0: the position used for distance checks
  P(): number {
    return this.pos - 35;
  }

  // 0x41dd80
  setN(): void {
    if (this.lane === 0 || this.lane === 2) this.N = 44;
    else if (this.lane === 1) this.N = 39;
  }

  // 0x41d6c0
  glue(ctx: TrainCtx): void {
    this.glued = true;
    ctx.speed = -1;
  }

  // 0x41d8f0: false when a track start (dead end) lies between the train and the next switch
  private pathOpen(): boolean {
    for (let r = cdiv(this.pos, ROW) - 1; r > 0; r--) {
      const c = this.track.cellAt(this.lane, r);
      if (c === Cell.BufStart) return false;
      if (c === Cell.SwLeft || c === Cell.SwRight) return true;
    }
    return true;
  }

  // 0x41d960
  update(ctx: TrainCtx): void {
    const S = ctx.S;
    if (!this.glued && this.lane === 1 && (this.frame === 38 || this.frame === 39)) ctx.trainOverlay = this;
    if (this.shifting) {
      if (this.shiftDir === -1 || this.shiftDir === 1) {
        this.mapSlide = this.shiftDir * cdiv(this.shiftT, 2);
        this.shiftT++;
        if (this.shiftT > 34) {
          this.shifting = false;
          this.mapLane = this.lane;
          this.setN();
          this.mapSlide = 0;
        }
      }
    }
    const cmd = this.cmds[0];
    if (cmd && cmd[1] <= S) {
      if (cmd[0] === 0) {
        this.driving = true;
      } else if (cmd[0] === 1) {
        if (this.N + 40 < this.pos - S) {
          this.shifting = true;
          this.shiftT = 0;
          this.shiftDir = cmd[2];
          this.lane += cmd[2];
        }
      } else if (cmd[0] === 2) {
        this.driving = false;
      }
      this.cmds.shift();
    }
    if (this.cmds.length === 0) this.randomBehaviour(ctx);

    if (this.pos < ctx.S && ctx.trainOverlay === this) ctx.trainOverlay = null;
    if (this.glued) {
      this.hitTicks++;
      this.posf += ctx.speed;
      if (this.hitTicks > 20) ctx.speed += 0.02;
      if (ctx.speed > 0) ctx.speed = 0;
      if (this.hitTicks === 47) ctx.sound.play('snd_tude');
      this.pos = ctx.S;
      return;
    }
    if (this.track.cellAt(this.lane, cdiv(this.pos + 16, ROW)) === Cell.BufStart) return;
    if (!this.driving || this.pause !== 0) {
      if (this.pause !== 0) this.pause--;
    } else {
      this.posf -= 1;
    }
    this.pos = Math.max(0, Math.trunc(this.posf));
    if (
      ctx.S < this.pos &&
      (this.lane === this.meet || this.pos - ctx.S < ROW * 3) && // lane vs +0x60 (meet), as in the original
      this.track.cellAt(this.lane, cdiv(this.pos - 24, ROW)) === Cell.BufStart
    ) {
      this.driving = false;
    }
  }

  private randomBehaviour(ctx: TrainCtx): void {
    const S = ctx.S;
    const r = S % ROW;
    if (!(this.pos - S < ROW * 30 && (r === 20 || r === 0))) return;
    if (this.driving) {
      if (this.pause === 0 && ROW * 3 < this.pos - S) {
        const c = this.track.cellAt(this.lane, cdiv(this.pos, ROW));
        if (c === Cell.JoinFromRight) {
          if (r === 20 && (this.lane < this.targetLane || !this.pathOpen())) this.startShift(1);
        } else if (c === Cell.JoinFromLeft && r === 0 && (this.targetLane < this.lane || !this.pathOpen())) {
          this.startShift(-1);
        }
      }
      return;
    }
    if (r === 0 && this.meet - S <= this.pos - this.meet - 56) this.driving = true;
  }

  private startShift(dir: 1 | -1): void {
    this.shifting = true;
    this.shiftT = 0;
    this.shiftDir = dir;
    this.lane += dir;
  }

  // 0x41d550 (advances the animation as a side effect, like the original)
  draw(ctx: TrainCtx): void {
    const N = this.N;
    let skipStart = false;
    if (this.animating) {
      this.frame++;
      if (N < this.frame) this.animating = false;
      if (this.animating) skipStart = true;
    }
    if (!skipStart) {
      const v = ctx.S - this.pos + 80 + N;
      if (v >= 0 && v <= N) this.animating = true;
    }
    if (this.glued && this.frame <= N) this.frame = this.lane === 0 || this.lane === 2 ? 40 : 37;
    if (N < this.frame) this.frame = -1;
    if (!this.animating || this.frame !== 0 || ctx.speed <= 0) {
      if (N - this.frame === 35 && ctx.speed > 0) ctx.sound.play('snd_flyby2');
    } else {
      ctx.sound.play('snd_tudehorn');
    }
    if (!this.animating) this.frame = -1;
    const role: GfxRole = this.lane === 0 ? 'trainl' : this.lane === 1 ? 'trainm' : 'trainr';
    if (this.lane >= 0 && this.lane <= 2) ctx.b.draw(role, this.frame);
  }
}

export class TrackController {
  readonly L: number;
  readonly endLane: number;
  readonly objects: StaticObj[]; // sorted by position, stable (0x413f10)
  trains: Train[];

  constructor(
    readonly ctx: TrainCtx,
    readonly level: Level,
  ) {
    this.L = level.length;
    this.endLane = level.endLane;
    this.objects = level.objects.map((o) => new StaticObj(o)).sort((a, b) => a.pos - b.pos);
    this.trains = level.trains.map((t) => new Train(this, t));
  }

  // 0x415ac0 (lane 3 spills into the next row, like the original)
  cellAt(lane: number, row: number): Cell {
    if (row < this.L && lane > -1 && row > -1 && lane < 4) {
      const idx = row * 3 + lane;
      const r = Math.floor(idx / 3);
      if (r < this.L) return this.level.cells[r][idx % 3];
    }
    return Cell.None;
  }

  // 0x415b00: true when this cell breaks the lane for the background
  laneGap(lane: number, row: number, flag: number): boolean {
    if (this.L <= row && lane === this.endLane) return false;
    const c = this.cellAt(lane, row);
    if (c === Cell.None) return true;
    if (c !== Cell.BufStart) return false;
    if (this.cellAt(lane, row - 1) !== Cell.BufEnd) return false;
    return flag !== 0;
  }

  private started(o: StaticObj): boolean {
    return o.pos - o.frames < this.ctx.S;
  }

  // 0x415b70
  findSwitch(lane: number): StaticObj | null {
    const S = this.ctx.S;
    let limit = S + 120;
    let found: StaticObj | null = null;
    for (const o of this.objects) {
      if (!this.started(o)) break;
      if (o.type >= 2 && o.type <= 5 && o.lane === lane && S + 32 < o.pos && o.pos < limit) {
        limit = o.pos - o.frames;
        found = o;
      }
    }
    return found;
  }

  // 0x415c70
  findSack(lane: number): StaticObj | null {
    for (const o of this.objects) {
      if (o.type === 8 && o.hasSack && o.lane === lane && this.ctx.S < o.pos) return o;
    }
    return null;
  }

  // 0x415ce0: position of the nearest buffer front ahead (1e9 if none)
  findBuffer(lane: number): number {
    let best = 1_000_000_000;
    for (const o of this.objects) {
      if (best < o.pos) return best;
      if (o.type === 6 && o.lane === lane && this.ctx.S < o.pos && o.pos < best) best = o.pos;
    }
    return best;
  }

  // 0x415d70
  findTrain(lane: number): Train | null {
    let best: Train | null = null;
    let bestP = 1_000_000_000;
    for (const t of this.trains) {
      const P = t.P();
      if (t.lane === lane && this.ctx.S < P && P < bestP) {
        bestP = P;
        best = t;
      }
    }
    return best;
  }

  // 0x4151c0
  update(): void {
    for (const t of [...this.trains]) t.update(this.ctx);
  }

  // 0x415630: background frame, rails reappearing, then all objects
  drawBackground(): void {
    const { b, S, row } = this.ctx;
    const continuous = (lane: number) =>
      !this.laneGap(lane, row, 0) &&
      !this.laneGap(lane, row + 1, 1) &&
      !this.laneGap(lane, row + 2, 2) &&
      !this.laneGap(lane, row + 3, 3);
    const mask = (continuous(0) ? 1 : 0) + 2 * (continuous(1) ? 1 : 0) + 4 * (continuous(2) ? 1 : 0);
    const phase = S % 8;
    if (mask === 0) {
      b.drawTil('bg_tracks', 0);
      b.draw('grass_left', phase);
      b.draw('grass_middle', phase);
      b.draw('grass_right', phase);
    } else {
      b.drawTil('bg_tracks', phase + [0, 16, 8, 32, 0, 40, 24, 48][mask]);
    }
    const closing: GfxRole[] = ['track_closing_left', 'track_closing_middle', 'track_closing_right'];
    for (let lane = 0; lane < 3; lane++) {
      let f = 0;
      if (this.cellAt(lane, row + 2) === Cell.BufStart) f = S - ROW * row - 15;
      else if (this.cellAt(lane, row + 1) === Cell.BufStart) f = S - ROW * row + 33;
      else if (this.cellAt(lane, row) === Cell.BufStart) f = (1 - row) * ROW + S;
      if (f > 0 && f < 92) b.draw(closing[lane], f);
    }
    this.drawObjects();
  }

  // 0x415240: farthest first; trains are interleaved by position (with the original's quirks)
  private drawObjects(): void {
    const S = this.ctx.S;
    let cursor = -1;
    for (let i = 0; i < this.objects.length; i++) {
      const o = this.objects[i];
      if (o.pos - o.frames > S) break;
      cursor = i;
    }
    const pending = [...this.trains];
    const drawn: Train[] = [];
    const take = (t: Train) => {
      t.draw(this.ctx);
      drawn.push(t);
      pending.splice(pending.indexOf(t), 1);
    };
    let hi = this.L * ROW;
    for (; cursor >= 0; cursor--) {
      const lo = this.objects[cursor].pos;
      for (;;) {
        let pick: Train | null = null;
        let pickP = 0;
        for (const t of pending) {
          const P = t.P();
          if (pick !== null) {
            if (pickP < P) {
              pick = t;
              pickP = P;
            }
          } else if (lo < P && P <= hi) {
            pick = t;
            pickP = P;
          }
        }
        if (!pick) break;
        take(pick);
      }
      this.objects[cursor].draw(this.ctx);
      hi = this.objects[cursor].pos;
    }
    while (pending.length > 0) {
      let pick = pending[0];
      for (const t of pending) if (pick.P() < t.P()) pick = t;
      take(pick);
    }
    this.trains = drawn;
  }

  // 0x415e00
  saveTrains(): void {
    for (const t of this.trains) if (!t.glued) t.saved = t.posf;
  }

  // 0x415e50
  rewindTrains(pause: number): void {
    for (const t of this.trains) {
      if (!t.glued && t.driving) {
        t.posf = t.saved;
        t.pause += pause;
        t.pos = Math.trunc(t.posf);
      }
    }
  }

  // 0x415ec0: delete trains that are visible or within 119 units
  deleteNearTrains(): void {
    this.trains = this.trains.filter((t) => !t.animating && t.P() - this.ctx.S > 119);
  }

  removeTrain(t: Train): void {
    this.trains = this.trains.filter((x) => x !== t);
  }
}

