import { describe, expect, it } from 'vitest';
import { computeLayout } from '../../src/engine/screen';

describe('computeLayout', () => {
  it('uses the largest whole scale on a desktop screen', () => {
    expect(computeLayout(1920, 1080)).toEqual({ scale: 4, width: 1280, height: 960, left: 320, top: 60 });
  });

  it('uses exactly 2x at 640x480', () => {
    expect(computeLayout(640, 480).scale).toBe(2);
  });

  it('uses a fractional scale when 2x does not fit', () => {
    const l = computeLayout(500, 400);
    expect(l.scale).toBe(1.5625);
    expect(l.width).toBe(500);
    expect(l.top).toBe(12);
  });

  it('never shrinks below half size', () => {
    expect(computeLayout(100, 100).scale).toBe(0.5);
  });
});
