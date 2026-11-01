// Replays the draw calls recorded during a logic tick onto the 320×240 canvas.
// Clip rectangles exclude their right/bottom edges (this hides the 1 px frame lines of
// the 4/6 arrow cells, as in the footage).
import type { Screen } from '../engine/screen';
import type { DrawOp } from './blitter';
import type { TrainRes } from './resources';

export function renderOps(screen: Pick<Screen, 'ctx'>, res: TrainRes, ops: DrawOp[]): void {
  const g = screen.ctx;
  for (const op of ops) {
    if (op.kind === 'til') {
      g.drawImage(res.til(op.role)[op.frame], 0, 0);
      continue;
    }
    const f = res.sprite(op.role).frames[op.frame];
    if (!f?.image) continue;
    const x = f.x + op.dx;
    const y = f.y + op.dy;
    if (!op.clip) {
      g.drawImage(f.image, x, y);
      continue;
    }
    const [x1, y1, x2, y2] = op.clip;
    g.save();
    g.beginPath();
    g.rect(x1, y1, x2 - x1, y2 - y1);
    g.clip();
    g.drawImage(f.image, x, y);
    g.restore();
  }
}
