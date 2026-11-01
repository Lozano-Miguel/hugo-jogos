// Our own minimal start screen (not part of the original game), drawn as an
// overlay matching the scaled 320×240 game area.
import type { Mode } from '../app';
import type { Action } from '../engine/input';
import type { Layout } from '../engine/screen';
import { T } from '../strings';
import './start-screen.css';

export interface StartView {
  mode: Mode;
  lastScore: number | null;
  highScore: number;
}

export function placeOverlay(root: HTMLElement, layout: Layout): void {
  Object.assign(root.style, {
    left: `${layout.left}px`,
    top: `${layout.top}px`,
    width: `${layout.width}px`,
    height: `${layout.height}px`,
  });
  root.style.setProperty('--s', String(layout.scale));
}

export function renderStartScreen(root: HTMLElement, view: StartView, onAction: (a: Action) => void): void {
  root.hidden = false;
  root.innerHTML = `
    <div class="start">
      <h1 class="start-title">${T.title}</h1>
      <div class="start-modes">
        <button type="button" class="start-mode ${view.mode === 'tv' ? 'on' : ''}" data-action="left">
          <span class="start-key">4</span>${T.modeTv}
        </button>
        <button type="button" class="start-mode ${view.mode === 'arcade' ? 'on' : ''}" data-action="right">
          <span class="start-key">6</span>${T.modeArcade}
        </button>
      </div>
      <p class="start-hint">${T.chooseMode}</p>
      <button type="button" class="start-go" data-action="confirm">${T.pressStartKeys}</button>
      ${view.lastScore === null ? '' : `<p class="start-score">${T.lastScore}: ${String(view.lastScore).padStart(4, '0')}</p>`}
      ${view.highScore > 0 ? `<p class="start-score start-highscore">${T.highScore}: ${String(view.highScore).padStart(4, '0')}</p>` : ''}
    </div>`;
  root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((b) => {
    b.addEventListener('click', () => onAction(b.dataset.action as Action));
  });
}

export function renderMessage(root: HTMLElement, text: string): void {
  root.hidden = false;
  root.innerHTML = `<div class="start"><p class="start-message">${text}</p></div>`;
}

export function hideOverlay(root: HTMLElement): void {
  root.hidden = true;
  root.innerHTML = '';
}
