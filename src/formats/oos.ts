// OOS lip-sync: one signed byte per step, each the talking-head frame to show
// while the matching voice line plays (format documented by gzalo/hugo-re, MIT).

export function decodeOos(data: Uint8Array): number[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const length = view.getInt32(view.getInt32(0x14, true), true);
  const start = view.getInt32(0x18, true);
  return Array.from(new Int8Array(data.buffer, data.byteOffset + start, length));
}
