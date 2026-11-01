import { describe, expect, it } from 'vitest';
import { FixedLoop } from '../../src/engine/loop';

function setup(maxTicksPerFrame = 5) {
  const counts = { updates: 0, renders: 0 };
  const loop = new FixedLoop({
    tickHz: 25,
    maxTicksPerFrame,
    update: () => counts.updates++,
    render: () => counts.renders++,
    raf: () => 0,
    cancelRaf: () => {},
  });
  return { loop, counts };
}

describe('FixedLoop', () => {
  it('runs one tick per 40 ms at 25 Hz', () => {
    const { loop, counts } = setup();
    expect(loop.advance(40)).toBe(1);
    expect(counts.updates).toBe(1);
  });

  it('carries partial time to the next frame', () => {
    const { loop } = setup();
    expect(loop.advance(20)).toBe(0);
    expect(loop.advance(20)).toBe(1);
  });

  it('drops the backlog after a long pause instead of fast-forwarding', () => {
    const { loop } = setup(5);
    expect(loop.advance(10_000)).toBe(5);
    expect(loop.advance(0)).toBe(0);
  });

  it('renders once per frame', () => {
    const { loop, counts } = setup();
    loop.advance(120);
    loop.advance(0);
    expect(counts.renders).toBe(2);
  });
});
