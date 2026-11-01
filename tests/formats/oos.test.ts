import { describe, expect, it } from 'vitest';
import { decodeOos } from '../../src/formats/oos';
import { readData } from '../helpers';

describe('decodeOos', () => {
  it('decodes the opening line lip-sync', () => {
    expect(decodeOos(readData('traindata/syncs/003-01.oos'))).toEqual([
      4, 8, 2, 4, 5, 1, 8, 9, 1, 6, 1, 6, 4, 8, 8, 8, 8, 7, 12, 12, 12, 12, 12,
    ]);
  });

  it('decodes all train lip-syncs with their lengths', () => {
    const lengths = ['01', '02', '03', '05', '06', '07', '08'].map(
      (k) => decodeOos(readData(`traindata/syncs/003-${k}.oos`)).length,
    );
    expect(lengths).toEqual([23, 18, 28, 25, 32, 26, 22]);
  });
});
