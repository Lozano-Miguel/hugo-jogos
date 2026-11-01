import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DATA = 'public/data';

export function readData(path: string): Uint8Array {
  const full = join(DATA, path);
  if (!existsSync(full)) throw new Error(`Missing ${full} — run npm run extract first`);
  return new Uint8Array(readFileSync(full));
}

export function listData(dir: string, ext: string): string[] {
  return readdirSync(join(DATA, dir))
    .filter((f) => f.endsWith(ext))
    .map((f) => `${dir}/${f}`);
}

export function rgbSum(rgba: Uint8ClampedArray, opaqueOnly = false): { sum: number; opaque: number } {
  let sum = 0;
  let opaque = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    if (opaqueOnly && rgba[i + 3] === 0) continue;
    if (rgba[i + 3] === 255) opaque++;
    sum += rgba[i] + rgba[i + 1] + rgba[i + 2];
  }
  return { sum, opaque };
}

// Frame counts of every train graphic, read from the original files (no browser needed).
export function trainFrameCounts(gfx: Record<string, { file: string }>): (role: string) => number {
  const map = new Map<string, number>();
  for (const [role, { file }] of Object.entries(gfx)) {
    const d = readData(file);
    const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
    map.set(role, file.endsWith('.til') ? v.getInt16(6, true) + 2 : v.getInt32(8, true));
  }
  return (role) => {
    const n = map.get(role);
    if (n === undefined) throw new Error(`no frame count for ${role}`);
    return n;
  };
}
