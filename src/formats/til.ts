// TIL: full-screen tiled animation (e.g. trackcb.til, the 58 track-view backgrounds).
// Header 0x20 bytes, RGB palette at 0x20, per-frame tile-id tables at 0x320,
// then tile pixel data (palette indices, row-major per tile).
import { type Palette, tilPalette } from './palette';

export interface TilAnim {
  width: number;
  height: number;
  palette: Palette;
  frames: Uint8Array[]; // width*height palette indices each
}

const TABLES = 0x320;

export function decodeTil(data: Uint8Array): TilAnim {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const frameCount = view.getInt16(6, true) + 2;
  const width = view.getInt16(8, true);
  const height = view.getInt16(10, true);
  const across = data[0x15];
  const down = data[0x17];
  const tileW = width / across;
  const tileH = height / down;
  const tilesPerFrame = across * down;
  const tileData = TABLES + frameCount * tilesPerFrame * 2;

  const frames: Uint8Array[] = [];
  for (let f = 0; f < frameCount; f++) {
    const pixels = new Uint8Array(width * height);
    const table = TABLES + f * tilesPerFrame * 2;
    for (let t = 0; t < tilesPerFrame; t++) {
      const src = tileData + view.getInt16(table + t * 2, true) * tileW * tileH;
      const x0 = (t % across) * tileW;
      const y0 = Math.floor(t / across) * tileH;
      for (let y = 0; y < tileH; y++) {
        pixels.set(data.subarray(src + y * tileW, src + (y + 1) * tileW), (y0 + y) * width + x0);
      }
    }
    frames.push(pixels);
  }
  return { width, height, palette: tilPalette(data), frames };
}
