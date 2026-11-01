// Fixed-timestep loop: game logic ticks at the original rate regardless of the
// display refresh; a long pause (hidden tab) drops the backlog instead of fast-forwarding.

export interface FixedLoopOptions {
  tickHz: number;
  maxTicksPerFrame: number;
  update: () => void;
  render: () => void;
  raf?: (cb: FrameRequestCallback) => number;
  cancelRaf?: (id: number) => void;
}

export class FixedLoop {
  private accumulator = 0;
  private last: number | null = null;
  private handle: number | null = null;
  private readonly tickMs: number;
  private readonly raf: (cb: FrameRequestCallback) => number;
  private readonly cancelRaf: (id: number) => void;

  constructor(private readonly opts: FixedLoopOptions) {
    this.tickMs = 1000 / opts.tickHz;
    this.raf = opts.raf ?? ((cb) => requestAnimationFrame(cb));
    this.cancelRaf = opts.cancelRaf ?? ((id) => cancelAnimationFrame(id));
  }

  start(): void {
    if (this.handle !== null) return;
    this.last = null;
    const frame = (now: number) => {
      this.advance(this.last === null ? 0 : now - this.last);
      this.last = now;
      this.handle = this.raf(frame);
    };
    this.handle = this.raf(frame);
  }

  stop(): void {
    if (this.handle !== null) this.cancelRaf(this.handle);
    this.handle = null;
  }

  advance(elapsedMs: number): number {
    this.accumulator += elapsedMs;
    let ticks = 0;
    while (this.accumulator >= this.tickMs && ticks < this.opts.maxTicksPerFrame) {
      this.opts.update();
      this.accumulator -= this.tickMs;
      ticks++;
    }
    if (this.accumulator >= this.tickMs) this.accumulator = 0;
    this.opts.render();
    return ticks;
  }
}
