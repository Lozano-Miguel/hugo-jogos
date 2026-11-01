import { describe, expect, it } from 'vitest';
import { decodeWav } from '../../src/formats/wav';
import { listData, readData } from '../helpers';

function wav16Stereo(frames: [number, number][]): Uint8Array {
  const dataLen = frames.length * 4;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, k) => v.setUint8(o + k, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + dataLen, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 2, true);
  v.setUint32(24, 11025, true);
  v.setUint32(28, 11025 * 4, true);
  v.setUint16(32, 4, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, dataLen, true);
  frames.forEach(([l, r], k) => {
    v.setInt16(44 + k * 4, l, true);
    v.setInt16(46 + k * 4, r, true);
  });
  return new Uint8Array(buf);
}

describe('decodeWav', () => {
  it('decodes an original 8-bit voice line', () => {
    const pcm = decodeWav(readData('traindata/speaks/003-01.wav'));
    expect(pcm.sampleRate).toBe(22050);
    expect(pcm.samples).toHaveLength(48400);
    expect(Array.from(pcm.samples.subarray(0, 4))).toEqual([-2 / 128, 0, -2 / 128, -2 / 128]);
  });

  it('decodes every train sound', () => {
    const files = [...listData('traindata/sfx', '.wav'), ...listData('traindata/speaks', '.wav')];
    expect(files).toHaveLength(36);
    for (const f of files) expect(decodeWav(readData(f)).samples.length).toBeGreaterThan(0);
  });

  it('averages 16-bit stereo to mono', () => {
    const pcm = decodeWav(wav16Stereo([[16384, 0], [-32768, -32768]]));
    expect(pcm.sampleRate).toBe(11025);
    expect(Array.from(pcm.samples)).toEqual([0.25, -1]);
  });

  it('rejects files that are not RIFF/WAVE', () => {
    expect(() => decodeWav(new Uint8Array(64))).toThrow('Not a WAV file');
  });
});
