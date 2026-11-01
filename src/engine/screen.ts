// The game draws on a fixed 320×240 canvas; CSS scales it up with
// nearest-neighbour so the original pixels stay crisp.
import type { Sprite } from './assets';

export const WIDTH = 320;
export const HEIGHT = 240;

export interface Layout {
  scale: number;
  width: number;
  height: number;
  left: number;
  top: number;
}

export function computeLayout(viewW: number, viewH: number): Layout {
  const fit = Math.min(viewW / WIDTH, viewH / HEIGHT);
  const whole = Math.floor(fit);
  const scale = whole >= 2 ? whole : Math.max(0.5, fit);
  const width = WIDTH * scale;
  const height = HEIGHT * scale;
  return {
    scale,
    width,
    height,
    left: Math.floor((viewW - width) / 2),
    top: Math.max(0, Math.floor((viewH - height) / 2)),
  };
}

export class Screen {
  readonly ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not available');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
  }

  clear(color = '#000'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  drawFrame(sprite: Sprite, frame: number, offsetX = 0, offsetY = 0): void {
    const f = sprite.frames[frame];
    if (f?.image) this.ctx.drawImage(f.image, f.x + offsetX, f.y + offsetY);
  }

  drawImage(img: CanvasImageSource, x: number, y: number): void {
    this.ctx.drawImage(img, x, y);
  }

  fit(): Layout {
    const l = computeLayout(window.innerWidth, window.innerHeight);
    const s = this.canvas.style;
    s.position = 'absolute';
    s.left = `${l.left}px`;
    s.top = `${l.top}px`;
    s.width = `${l.width}px`;
    s.height = `${l.height}px`;
    s.imageRendering = 'pixelated';
    return l;
  }
}
