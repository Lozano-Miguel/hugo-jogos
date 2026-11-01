import { describe, expect, it } from 'vitest';
import { decodeCgf } from '../../src/formats/cgf';
import { indexedToRgba, tilPalette } from '../../src/formats/palette';
import { listData, readData, rgbSum } from '../helpers';

const brase = () => tilPalette(readData('traindata/gfx/brase.til'));

function check(file: string, frameIndex: number, frameCount: number | null, meta: object, opaque: number, sum: number) {
  const frames = decodeCgf(readData(`traindata/gfx/${file}`));
  if (frameCount !== null) expect(frames).toHaveLength(frameCount);
  const f = frames[frameIndex];
  expect({ x: f.x, y: f.y, w: f.w, h: f.h }).toEqual(meta);
  const stats = rgbSum(indexedToRgba(f.pixels!, brase()), true);
  expect(stats.opaque).toBe(opaque);
  expect(stats.sum).toBe(sum);
}

describe('decodeCgf', () => {
  it('decodes Hugo pumping the handcar', () => check('hspump.cgf', 0, 12, { x: 215, y: 68, w: 41, h: 86 }, 2415, 387264));
  it('decodes the talking head', () => check('htalest.cgf', 0, 14, { x: 60, y: 40, w: 165, h: 216 }, 21484, 6387104));
  it('decodes Hugo grabbing a sack', () => check('hssack.cgf', 2, 6, { x: 197, y: 57, w: 59, h: 83 }, 2717, 463158));
  it('decodes an approaching train frame', () => check('togm.cgf', 10, 41, { x: 125, y: 86, w: 7, h: 17 }, 87, 19280));

  it('decodes every train sprite file', () => {
    const files = listData('traindata/gfx', '.cgf');
    expect(files).toHaveLength(81);
    for (const file of files) expect(() => decodeCgf(readData(file))).not.toThrow();
  });
});
