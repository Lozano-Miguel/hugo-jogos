import { describe, expect, it } from 'vitest';
import { Blitter } from '../../src/train/blitter';

const counts = (role: string) => (role === 'hugo_pump' ? 12 : role === 'bg_tracks' ? 58 : 1);

describe('Blitter', () => {
  it('keeps each sprite offset until it changes', () => {
    const b = new Blitter(counts);
    b.setPosition('hugo_pump', -5, 16);
    b.draw('hugo_pump', 3);
    b.draw('hugo_pump', 4);
    expect(b.ops.map((o) => (o.kind === 'sprite' ? [o.frame, o.dx, o.dy] : null))).toEqual([
      [3, -5, 16],
      [4, -5, 16],
    ]);
  });

  it('draws nothing for frames out of range, like an unsigned compare', () => {
    const b = new Blitter(counts);
    expect(b.draw('hugo_pump', -1)).toBe(false);
    expect(b.draw('hugo_pump', 12)).toBe(false);
    expect(b.ops).toEqual([]);
  });

  it('carries the clip set on a sprite', () => {
    const b = new Blitter(counts);
    b.setClip('hugo_pile', 78, 45, 110, 78);
    b.draw('hugo_pile', 0);
    expect(b.ops[0]).toMatchObject({ clip: [78, 45, 110, 78], dx: 0, dy: 0 });
  });

  it('records full-screen frames and clears on begin', () => {
    const b = new Blitter(counts);
    b.drawTil('bg_tracks', 48);
    expect(b.ops).toEqual([{ kind: 'til', role: 'bg_tracks', frame: 48 }]);
    b.begin();
    expect(b.ops).toEqual([]);
  });
});
