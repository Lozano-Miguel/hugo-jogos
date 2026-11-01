import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GFX, SFX, SPEAKS, SYNCS } from '../../src/train/resources';

const cnf = readFileSync('original/cd-1998-files/config/TrainPlugin.cnf', 'latin1');

function section(name: string): Record<string, string> {
  const start = cnf.search(new RegExp(`section ${name}\\s*\\{`));
  const rest = cnf.slice(start);
  const body = rest.slice(0, rest.search(/^\s*\}\s*$/m));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/^\s*(\w+)\s*=\s*\[DataDir\]\\([^\s;(]+)/gm)) {
    out[m[1]] = `traindata/${m[2].replace(/\\/g, '/').toLowerCase()}`;
  }
  return out;
}

const manifest = new Set<string>(JSON.parse(readFileSync('public/data/manifest.json', 'utf8')).files);

describe('train resource tables', () => {
  it('cover every graphic in TrainPlugin.cnf', () => {
    const { PlayerFont, PlayerBack, ...graphics } = section('Graphics');
    expect([PlayerFont, PlayerBack].every(Boolean)).toBe(true);
    expect(Object.fromEntries(Object.entries(GFX).map(([k, v]) => [k, v.file]))).toEqual(graphics);
  });

  it('cover every speech, sync and sound effect', () => {
    expect(SPEAKS).toEqual(section('Speaks'));
    expect(SYNCS).toEqual(section('Syncs'));
    expect(SFX).toEqual(section('SoundEffects'));
  });

  it('point at files that exist', () => {
    const all = [...Object.values(GFX).map((g) => g.file), ...Object.values(SPEAKS), ...Object.values(SYNCS), ...Object.values(SFX)];
    expect(all.filter((f) => !manifest.has(f))).toEqual([]);
  });

  it('draws the side-view scenes with the side palette', () => {
    const side = Object.entries(GFX).filter(([, v]) => v.scene === 'side').map(([k]) => k).sort();
    expect(side).toEqual(['hugo_bucketsync', 'hugo_flyv', 'in_movevognanim', 'in_scroll', 'in_skyer', 'in_vognanim']);
  });
});
