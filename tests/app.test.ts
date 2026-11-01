import { describe, expect, it } from 'vitest';
import { type AppState, appReducer } from '../src/app';

const start = (mode: 'tv' | 'arcade', lastScore: number | null = null, highScore = 0): AppState => ({ kind: 'start', mode, lastScore, highScore });

describe('appReducer', () => {
  it('shows the start screen once loaded', () => {
    expect(appReducer({ kind: 'loading' }, { type: 'loaded', highScore: 0 })).toEqual(start('tv'));
  });

  it('explains missing files when loading fails', () => {
    expect(appReducer({ kind: 'loading' }, { type: 'load-failed' })).toEqual({ kind: 'missing-assets' });
  });

  it('picks Arcade with 6 and TV with 4', () => {
    expect(appReducer(start('tv'), { type: 'action', action: 'right' })).toEqual(start('arcade'));
    expect(appReducer(start('arcade'), { type: 'action', action: 'left' })).toEqual(start('tv'));
  });

  it('starts the chosen mode with 5', () => {
    expect(appReducer(start('arcade'), { type: 'action', action: 'confirm' })).toEqual({ kind: 'playing', mode: 'arcade', highScore: 0 });
  });

  it('does not start the game on Escape', () => {
    expect(appReducer(start('tv'), { type: 'action', action: 'quit' })).toEqual(start('tv'));
  });

  it('returns to the start screen with the final score', () => {
    expect(appReducer({ kind: 'playing', mode: 'tv', highScore: 0 }, { type: 'finished', score: 1500 })).toEqual(start('tv', 1500, 1500));
  });

  it('explains missing files when the game itself fails to load', () => {
    expect(appReducer({ kind: 'playing', mode: 'arcade', highScore: 0 }, { type: 'scene-failed' })).toEqual({ kind: 'missing-assets' });
  });

  it('ignores key presses while playing', () => {
    const playing: AppState = { kind: 'playing', mode: 'tv', highScore: 0 };
    expect(appReducer(playing, { type: 'action', action: 'left' })).toBe(playing);
  });
});
