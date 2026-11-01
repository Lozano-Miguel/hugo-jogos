// Records draw calls the way Hugo.exe's CBlitterObject makes them: every sprite keeps
// its own offset (SetPosition) and clip (SetClip) until changed, and Draw(frame) is an
// unsigned compare against the frame count, so negative frames draw nothing.
// The renderer replays the recorded ops in order.
import type { GfxRole, TilRole } from './resources';

export type Rect = [x1: number, y1: number, x2: number, y2: number];

export type DrawOp =
  | { kind: 'sprite'; role: GfxRole; frame: number; dx: number; dy: number; clip: Rect | null }
  | { kind: 'til'; role: TilRole; frame: number };

export type FrameCounts = (role: GfxRole | TilRole) => number;

export class Blitter {
  ops: DrawOp[] = [];
  private offsets = new Map<GfxRole, [number, number]>();
  private clips = new Map<GfxRole, Rect>();

  constructor(readonly frameCount: FrameCounts) {}

  begin(): void {
    this.ops = [];
  }

  setPosition(role: GfxRole, dx: number, dy: number): void {
    this.offsets.set(role, [dx, dy]);
  }

  setClip(role: GfxRole, x1: number, y1: number, x2: number, y2: number): void {
    this.clips.set(role, [x1, y1, x2, y2]);
  }

  draw(role: GfxRole, frame: number): boolean {
    if (frame < 0 || frame >= this.frameCount(role)) return false;
    const [dx, dy] = this.offsets.get(role) ?? [0, 0];
    this.ops.push({ kind: 'sprite', role, frame, dx, dy, clip: this.clips.get(role) ?? null });
    return true;
  }

  drawTil(role: TilRole, frame: number): void {
    if (frame >= 0 && frame < this.frameCount(role)) this.ops.push({ kind: 'til', role, frame });
  }
}
