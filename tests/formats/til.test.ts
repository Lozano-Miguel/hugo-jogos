import { describe, expect, it } from 'vitest';
import { indexedToRgba, tilPalette } from '../../src/formats/palette';
import { decodeTil } from '../../src/formats/til';
import { readData, rgbSum } from '../helpers';

const pixel = (rgba: Uint8ClampedArray, x: number, y: number) => {
  const i = (y * 320 + x) * 4;
  return [rgba[i], rgba[i + 1], rgba[i + 2]];
};

describe('decodeTil', () => {
  it('decodes the track view animation', () => {
    const til = decodeTil(readData('traindata/gfx/trackcb.til'));
    expect(til.frames).toHaveLength(58);
    expect([til.width, til.height]).toEqual([320, 240]);
    expect(Array.from(til.palette.subarray(0, 9))).toEqual([112, 144, 112, 240, 240, 240, 176, 176, 208]);
    const rgba = indexedToRgba(til.frames[0], til.palette);
    expect(rgbSum(rgba).sum).toBe(28464199);
    expect(pixel(rgba, 160, 200)).toEqual([192, 208, 0]);
  });

  it('decodes the buffer crash animation', () => {
    const til = decodeTil(readData('traindata/gfx/brase.til'));
    expect(til.frames).toHaveLength(112);
    const rgba = indexedToRgba(til.frames[0], til.palette);
    expect(rgbSum(rgba).sum).toBe(31799505);
    expect(pixel(rgba, 0, 0)).toEqual([129, 144, 194]);
  });
});

describe('scene palettes', () => {
  it('share exactly entries 1 and 3..64 between track and side view', () => {
    const a = tilPalette(readData('traindata/gfx/trackcb.til'));
    const b = tilPalette(readData('traindata/gfx/brase.til'));
    const shared: number[] = [];
    for (let i = 0; i < 256; i++) {
      if (a[i * 3] === b[i * 3] && a[i * 3 + 1] === b[i * 3 + 1] && a[i * 3 + 2] === b[i * 3 + 2]) shared.push(i);
    }
    expect(shared).toEqual([1, ...Array.from({ length: 62 }, (_, k) => k + 3)]);
  });
});
