// ITE "BIGFILE" archive (data.big on the 1998 CD).
// Layout: "BIGFILE" + 4 bytes, payloads back to back, then an 8-byte header and
// N directory entries of [name: 260 bytes NUL-padded][offset u32 LE][size u32 LE]
// running to the end of the file.

export interface BigEntry {
  name: string;
  offset: number;
  size: number;
}

const MAGIC = 'BIGFILE';
const ENTRY_SIZE = 268;
const NAME_SIZE = 260;

export function parseBigfile(data: Uint8Array): BigEntry[] {
  if (String.fromCharCode(...data.subarray(0, MAGIC.length)) !== MAGIC) {
    throw new Error('Not a BIGFILE');
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const entries: BigEntry[] = [];
  for (let pos = data.length - ENTRY_SIZE; pos >= MAGIC.length; pos -= ENTRY_SIZE) {
    const name = readName(data, pos);
    const offset = view.getUint32(pos + NAME_SIZE, true);
    const size = view.getUint32(pos + NAME_SIZE + 4, true);
    if (name === null || offset + size > data.length) break;
    entries.push({ name, offset, size });
  }
  return entries.reverse();
}

function readName(data: Uint8Array, pos: number): string | null {
  let name = '';
  for (let i = pos; i < pos + NAME_SIZE; i++) {
    const c = data[i];
    if (c === 0) break;
    if (c < 32 || c > 126) return null;
    name += String.fromCharCode(c);
  }
  return name === '' ? null : name;
}
