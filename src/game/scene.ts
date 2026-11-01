import type { Mode } from '../app';
import type { Assets } from '../engine/assets';
import type { AudioSystem } from '../engine/audio';
import type { Action, Input } from '../engine/input';
import type { Screen } from '../engine/screen';

export interface GameContext {
  assets: Assets;
  audio: AudioSystem;
  input: Input;
  mode: Mode;
}

export interface SceneResult {
  score: number;
}

export interface Scene {
  update(actions: Action[]): SceneResult | null;
  render(screen: Screen): void;
  dispose(): void;
}
