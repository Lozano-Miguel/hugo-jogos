// The train game as a Scene: loads the original resources, builds the level like the
// original (srand from the clock) and drives the plugin one engine tick (~21 ms) at a time.
import type { Action } from '../engine/input';
import type { Screen } from '../engine/screen';
import type { GameContext, Scene, SceneResult } from '../game/scene';
import { Blitter } from './blitter';
import { TrainCtx } from './ctx';
import { TrainGame } from './game';
import { buildLevel } from './level';
import { TrainPlugin } from './phases';
import { MsvcRand } from './rand';
import { renderOps } from './render';
import { type GfxRole, loadTrainResources, type TilRole } from './resources';

export const ENGINE_TICK_MS = 21; // logic tick = 3 engine ticks ≈ 63 ms, measured from the PT footage

export async function createTrainScene(game: GameContext, seed = Date.now() >>> 0): Promise<Scene> {
  const { assets, audio, input, mode } = game;
  const res = await loadTrainResources(assets, audio);
  const counts = (role: GfxRole | TilRole) =>
    role === 'bg_tracks' || role === 'bg_hugohitbuffer' ? res.til(role).length : res.sprite(role).frames.length;
  const ctx = new TrainCtx(
    new Blitter(counts),
    {
      play: (name, loop) => void audio.play(name, { loop }),
      stop: (name) => audio.stop(name),
    },
    {
      left: () => input.held('left'),
      right: () => input.held('right'),
      skip: () => input.held('confirm'),
    },
    (name) => res.sync(name),
  );
  const plugin = new TrainPlugin(ctx, new TrainGame(ctx, buildLevel(mode, new MsvcRand(seed))));

  return {
    update(actions: Action[]): SceneResult | null {
      if (actions.includes('quit')) plugin.quit();
      plugin.engineTick();
      return plugin.result;
    },
    render(screen: Screen): void {
      screen.clear();
      renderOps(screen, res, plugin.lastOps);
      if (plugin.fade > 0) {
        screen.ctx.fillStyle = `rgba(0,0,0,${plugin.fade})`;
        screen.ctx.fillRect(0, 0, 320, 240);
      }
    },
    dispose(): void {
      audio.stopAll();
    },
  };
}
