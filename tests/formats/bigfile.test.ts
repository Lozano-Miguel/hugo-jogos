import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseBigfile } from '../../src/formats/bigfile';

const CD_BIGFILE = 'original/cd-1998-files/data.big';

function entryBytes(name: string, offset: number, size: number): Uint8Array {
  const out = new Uint8Array(268);
  out.set(new TextEncoder().encode(name), 0);
  const view = new DataView(out.buffer);
  view.setUint32(260, offset, true);
  view.setUint32(264, size, true);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

describe('parseBigfile', () => {
  it('parses a synthetic bigfile', () => {
    const data = concat([
      new TextEncoder().encode('BIGFILE'),
      new Uint8Array(4),
      new TextEncoder().encode('AB'),
      new TextEncoder().encode('CDE'),
      new Uint8Array(8),
      entryBytes('dir\\a.cgf', 11, 2),
      entryBytes('_pad.raw', 13, 3),
    ]);
    expect(parseBigfile(data)).toEqual([
      { name: 'dir\\a.cgf', offset: 11, size: 2 },
      { name: '_pad.raw', offset: 13, size: 3 },
    ]);
  });

  it('rejects other files', () => {
    expect(() => parseBigfile(new Uint8Array(300))).toThrow('Not a BIGFILE');
  });

  it.runIf(existsSync(CD_BIGFILE))('reads the real CD archive', () => {
    const entries = parseBigfile(new Uint8Array(readFileSync(CD_BIGFILE)));
    expect(entries).toHaveLength(781);
    expect(entries[0]).toEqual({ name: 'ForestData\\gfx\\arrows.cgf', offset: 11, size: 5377 });
    expect(entries.filter((e) => e.name.startsWith('TrainData\\'))).toHaveLength(128);
  });
});
