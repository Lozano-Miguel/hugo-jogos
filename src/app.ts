// Top-level flow: loading → start screen ⇄ playing. Pure so it can be tested.
import type { Action } from './engine/input';

export type Mode = 'tv' | 'arcade';

export type AppState =
  | { kind: 'loading' }
  | { kind: 'missing-assets' }
  | { kind: 'start'; mode: Mode; lastScore: number | null; highScore: number }
  | { kind: 'playing'; mode: Mode; highScore: number };

export type AppEvent =
  | { type: 'loaded'; highScore: number }
  | { type: 'load-failed' }
  | { type: 'action'; action: Action }
  | { type: 'finished'; score: number }
  | { type: 'scene-failed' };

export function appReducer(state: AppState, event: AppEvent): AppState {
  switch (state.kind) {
    case 'loading':
      if (event.type === 'loaded') return { kind: 'start', mode: 'tv', lastScore: null, highScore: event.highScore };
      if (event.type === 'load-failed') return { kind: 'missing-assets' };
      return state;
    case 'start':
      if (event.type !== 'action') return state;
      if (event.action === 'left') return { ...state, mode: 'tv' };
      if (event.action === 'right') return { ...state, mode: 'arcade' };
      if (event.action === 'confirm') return { kind: 'playing', mode: state.mode, highScore: state.highScore };
      return state;
    case 'playing': {
      if (event.type === 'finished') {
        const highScore = Math.max(state.highScore, event.score);
        return { kind: 'start', mode: state.mode, lastScore: event.score, highScore };
      }
      if (event.type === 'scene-failed') return { kind: 'missing-assets' };
      return state;
    }
    case 'missing-assets':
      return state;
  }
}
