// CGF: RLE sprite sequences (format documented by gzalo/hugo-re, MIT).
// Header 7×i32 (magic "CGFF", 1, frame count, meta size, payload size, 256, 0),
// per-frame meta of 6×i32 (x, y, w, h, ?, payload offset) — x,y are screen positions —
// then one length-prefixed op stream per row.

export interface CgfFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  pixels: Int16Array | null; // palette index per pixel, -1 = transparent; null when empty
}

const HEADER = 28;
const META = 24;

export function decodeCgf(data: Uint8Array): CgfFrame[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count = view.getInt32(8, true);
  const frames: CgfFrame[] = [];
  for (let f = 0; f < count; f++) {
    const m = HEADER + f * META;
    const x = view.getInt32(m, true);
    const y = view.getInt32(m + 4, true);
    const w = view.getInt32(m + 8, true);
    const h = view.getInt32(m + 12, true);
    if (w < 0 || h < 0) throw new Error(`CGF frame ${f}: invalid size ${w}x${h}`);
    if (w === 0 || h === 0) {
      frames.push({ x, y, w, h, pixels: null });
      continue;
    }
    const pixels = new Int16Array(w * h).fill(-1);
    let row = HEADER + count * META + view.getInt32(m + 20, true);
    for (let r = 0; r < h; r++) {
      const len = view.getInt32(row, true);
      decodeRow(data, row + 4, row + len, pixels, r * w);
      row += len;
    }
    frames.push({ x, y, w, h, pixels });
  }
  return frames;
}

function decodeRow(data: Uint8Array, start: number, end: number, out: Int16Array, rowStart: number): void {
  let i = start;
  let x = rowStart;
  while (i < end) {
    const op = data[i++];
    const n = data[i++];
    switch (op) {
      case 0: // skip n transparent pixels; 0 ends the row
        if (n === 0) return;
        x += n;
        break;
      case 1: // n × (index, alpha)
        for (let k = 0; k < n; k++, i += 2) out[x++] = data[i];
        break;
      case 2: // run of n × index (with alpha byte)
        out.fill(data[i], x, x + n);
        x += n;
        i += 2;
        break;
      case 3: // n literal indices
        for (let k = 0; k < n; k++) out[x++] = data[i++];
        break;
      case 4: // run of n × index
        out.fill(data[i], x, x + n);
        x += n;
        i += 1;
        break;
      default:
        throw new Error(`CGF: unknown op ${op} at byte ${i - 2}`);
    }
  }
}
