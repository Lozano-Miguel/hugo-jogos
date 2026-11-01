import { describe, expect, it } from 'vitest';
import { cgfEmbeddedPalette, tilPalette } from '../../src/formats/palette';
import { readData } from '../helpers';

describe('cgfEmbeddedPalette', () => {
  it('reads the side-view palette stored in scrllay.cgf', () => {
    const side = cgfEmbeddedPalette(readData('traindata/gfx/scrllay.cgf'));
    const brase = tilPalette(readData('traindata/gfx/brase.til'));
    let same = 0;
    for (let i = 0; i < 256; i++) {
      if (side[i * 3] === brase[i * 3] && side[i * 3 + 1] === brase[i * 3 + 1] && side[i * 3 + 2] === brase[i * 3 + 2]) same++;
    }
    expect(same).toBe(222);
    expect(Array.from(side.subarray(0, 6))).toEqual([112, 144, 112, 240, 240, 240]);
  });
});
