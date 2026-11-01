// 256-colour RGB palettes. The 1998 game ran in 8-bit mode, so each scene's
// palette (stored in its TIL background) applies to every sprite drawn in it.

export type Palette = Uint8Array; // 768 bytes, RGB

export function tilPalette(data: Uint8Array): Palette {
  return data.slice(0x20, 0x20 + 768);
}

// The palette stored at the end of a CGF file (256 × BGRA). Mostly zeros, but some
// files (e.g. scrllay.cgf) carry the palette of the scene they belong to.
export function cgfEmbeddedPalette(data: Uint8Array): Palette {
  const src = data.subarray(data.length - 1024);
  const out = new Uint8Array(768);
  for (let i = 0; i < 256; i++) {
    out[i * 3] = src[i * 4 + 2];
    out[i * 3 + 1] = src[i * 4 + 1];
    out[i * 3 + 2] = src[i * 4];
  }
  return out;
}

// -1 marks a transparent pixel (CGF sprites); everything else is opaque.
export function indexedToRgba(pixels: Uint8Array | Int16Array, palette: Palette): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length * 4);
  for (let i = 0; i < pixels.length; i++) {
    const idx = pixels[i];
    if (idx < 0) continue;
    out[i * 4] = palette[idx * 3];
    out[i * 4 + 1] = palette[idx * 3 + 1];
    out[i * 4 + 2] = palette[idx * 3 + 2];
    out[i * 4 + 3] = 255;
  }
  return out;
}
