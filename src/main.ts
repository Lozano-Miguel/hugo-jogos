import { type AppEvent, type AppState, appReducer } from './app';
import { Assets, AssetsMissingError } from './engine/assets';
import { AudioSystem } from './engine/audio';
import { Input } from './engine/input';
import { FixedLoop } from './engine/loop';
import { Screen } from './engine/screen';
import type { Scene } from './game/scene';
import { T } from './strings';
import { createTrainScene, ENGINE_TICK_MS } from './train/train-scene';
import { hideOverlay, placeOverlay, renderMessage, renderStartScreen } from './ui/start-screen';

const LS_HIGH_SCORE = 'hugo-comboio-highscore';

function loadHighScore(): number {
  try {
    return Math.max(0, Number(localStorage.getItem(LS_HIGH_SCORE)) || 0);
  } catch {
    return 0;
  }
}

function saveHighScore(score: number): void {
  try {
    localStorage.setItem(LS_HIGH_SCORE, String(score));
  } catch { /* quota or private mode */ }
}

const TICK_HZ = 1000 / ENGINE_TICK_MS;

const screen = new Screen(document.getElementById('screen') as HTMLCanvasElement);
const overlay = document.getElementById('overlay') as HTMLDivElement;
const assets = new Assets();
const audio = new AudioSystem();
const input = new Input();

let state: AppState = { kind: 'loading' };
let scene: Scene | null = null;
let backdrop: HTMLCanvasElement | null = null;

input.attach(window);
input.onPress = () => audio.unlock(); // every press: Escape alone does not let a page play sound

function fit(): void {
  placeOverlay(overlay, screen.fit());
}
document.addEventListener('visibilitychange', () => (document.hidden ? audio.pause() : audio.resume()));
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', fit);
fit();

function dispatch(event: AppEvent): void {
  const prev = state;
  state = appReducer(state, event);
  if (state === prev) return;
  if (state.kind === 'start') {
    if (prev.kind === 'playing') saveHighScore(state.highScore);
    renderStartScreen(overlay, { mode: state.mode, lastScore: state.lastScore, highScore: state.highScore }, (a) => input.press(a));
  } else if (state.kind === 'missing-assets') {
    renderMessage(overlay, T.missingAssets);
  } else if (state.kind === 'playing' && prev.kind !== 'playing') {
    renderMessage(overlay, T.loading);
    createTrainScene({ assets, audio, input, mode: state.mode }).then(
      (s) => {
        hideOverlay(overlay);
        if (state.kind === 'playing') scene = s;
        else s.dispose();
      },
      (err) => {
        console.error(err); // e.g. a partial extraction or a data.big from another CD
        dispatch({ type: 'scene-failed' });
      },
    );
  }
}

function update(): void {
  const actions = input.drain();
  if (state.kind === 'playing') {
    const result = scene?.update(actions);
    if (result) {
      scene?.dispose();
      scene = null;
      dispatch({ type: 'finished', score: result.score });
    }
    return;
  }
  for (const action of actions) dispatch({ type: 'action', action });
}

function render(): void {
  if (scene) {
    scene.render(screen);
  } else {
    screen.clear();
    if (backdrop) screen.drawImage(backdrop, 0, 0);
  }
}

async function boot(): Promise<void> {
  renderMessage(overlay, T.loading);
  try {
    await assets.init();
    const tile = (await assets.til('traindata/gfx/trackcb.til'))[10];
    backdrop = document.createElement('canvas');
    backdrop.width = 320;
    backdrop.height = 240;
    const bg = backdrop.getContext('2d')!;
    bg.imageSmoothingEnabled = false;
    bg.drawImage(tile, 0, 0, 256, 240, 0, 0, 320, 240);
    dispatch({ type: 'loaded', highScore: loadHighScore() });
  } catch (err) {
    if (!(err instanceof AssetsMissingError)) console.error(err);
    dispatch({ type: 'load-failed' });
  }
  new FixedLoop({ tickHz: TICK_HZ, maxTicksPerFrame: 5, update, render }).start();
}

const fsBtn = document.getElementById('fullscreen-btn')!;
function updateFsIcon(): void {
  fsBtn.textContent = document.fullscreenElement ? '✖' : '⛶';
}
fsBtn.addEventListener('click', () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen();
});
document.addEventListener('fullscreenchange', () => {
  updateFsIcon();
  fit();
});
updateFsIcon();

void boot();
