// Loads the original game files from public/data/ (written by `npm run extract`)
// and decodes them on demand. Paths are case-insensitive, like on Windows.
import { decodeCgf } from '../formats/cgf';
import { decodeOos } from '../formats/oos';
import { cgfEmbeddedPalette, indexedToRgba, type Palette, tilPalette } from '../formats/palette';
import { decodeTil } from '../formats/til';
import { decodeWav, type PcmSound } from '../formats/wav';

export class AssetsMissingError extends Error {
  constructor(cause?: unknown) {
    super('Original game files not found in public/data — run npm run extract');
    this.cause = cause;
  }
}

export interface SpriteFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  image: HTMLCanvasElement | null;
}

export interface Sprite {
  frames: SpriteFrame[];
}

export class Assets {
  private files = new Set<string>();
  private bytesCache = new Map<string, Promise<Uint8Array>>();
  private spriteCache = new Map<string, WeakMap<Palette, Promise<Sprite>>>();
  private tilCache = new Map<string, Promise<HTMLCanvasElement[]>>();
  private paletteCache = new Map<string, Promise<Palette>>();

  constructor(
    private readonly baseUrl = `${import.meta.env.BASE_URL}data/`,
    private readonly fetchFn: typeof fetch = (...args) => fetch(...args),
  ) {}

  async init(): Promise<void> {
    let res: Response;
    try {
      res = await this.fetchFn(`${this.baseUrl}manifest.json`);
    } catch (err) {
      throw new AssetsMissingError(err);
    }
    if (!res.ok) throw new AssetsMissingError(res.status);
    let manifest: { files?: unknown };
    try {
      manifest = (await res.json()) as { files?: unknown };
    } catch (err) {
      throw new AssetsMissingError(err); // e.g. the dev server's HTML fallback page
    }
    if (!Array.isArray(manifest.files)) throw new AssetsMissingError('manifest has no file list');
    this.files = new Set(manifest.files as string[]);
  }

  has(path: string): boolean {
    return this.files.has(path.toLowerCase());
  }

  list(prefix: string): string[] {
    const p = prefix.toLowerCase();
    return [...this.files].filter((f) => f.startsWith(p)).sort();
  }

  bytes(path: string): Promise<Uint8Array> {
    const key = path.toLowerCase();
    if (!this.files.has(key)) return Promise.reject(new Error(`Unknown asset: ${path}`));
    let pending = this.bytesCache.get(key);
    if (!pending) {
      pending = this.fetchFn(`${this.baseUrl}${key}`).then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load ${key}: ${res.status}`);
        return new Uint8Array(await res.arrayBuffer());
      });
      this.bytesCache.set(key, pending);
    }
    return pending;
  }

  // Palettes are cached so the sprite cache (keyed by palette) hits on the next game.
  palette(tilPath: string): Promise<Palette> {
    return this.cachedPalette(`til:${tilPath.toLowerCase()}`, tilPath, tilPalette);
  }

  embeddedPalette(cgfPath: string): Promise<Palette> {
    return this.cachedPalette(`cgf:${cgfPath.toLowerCase()}`, cgfPath, cgfEmbeddedPalette);
  }

  private cachedPalette(key: string, path: string, read: (d: Uint8Array) => Palette): Promise<Palette> {
    let pending = this.paletteCache.get(key);
    if (!pending) {
      pending = this.bytes(path).then(read);
      this.paletteCache.set(key, pending);
    }
    return pending;
  }

  sprite(path: string, palette: Palette): Promise<Sprite> {
    const key = path.toLowerCase();
    let byPalette = this.spriteCache.get(key);
    if (!byPalette) {
      byPalette = new WeakMap();
      this.spriteCache.set(key, byPalette);
    }
    let pending = byPalette.get(palette);
    if (!pending) {
      pending = this.bytes(key).then((data) => ({
        frames: decodeCgf(data).map((f) => ({
          x: f.x,
          y: f.y,
          w: f.w,
          h: f.h,
          image: f.pixels ? toCanvas(indexedToRgba(f.pixels, palette), f.w, f.h) : null,
        })),
      }));
      byPalette.set(palette, pending);
    }
    return pending;
  }

  til(path: string): Promise<HTMLCanvasElement[]> {
    const key = path.toLowerCase();
    let pending = this.tilCache.get(key);
    if (!pending) {
      pending = this.bytes(key).then((data) => {
        const anim = decodeTil(data);
        return anim.frames.map((f) => toCanvas(indexedToRgba(f, anim.palette), anim.width, anim.height));
      });
      this.tilCache.set(key, pending);
    }
    return pending;
  }

  async sound(path: string): Promise<PcmSound> {
    return decodeWav(await this.bytes(path));
  }

  async sync(path: string): Promise<number[]> {
    return decodeOos(await this.bytes(path));
  }
}

function toCanvas(rgba: Uint8ClampedArray, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.putImageData(new ImageData(rgba, w, h), 0, 0);
  return canvas;
}
