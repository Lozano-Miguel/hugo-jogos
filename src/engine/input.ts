// Phone-key controls: 4 = left, 6 = right, 5 = confirm (arrows/Enter/Space as aliases), Esc = quit.
// Menus read discrete presses; the train game reads held keys, like the original
// (it samples the key state once per logic tick).

export type Action = 'left' | 'right' | 'confirm' | 'quit';

export const KEY_ACTIONS: Readonly<Record<string, Action>> = {
  Digit4: 'left',
  Numpad4: 'left',
  ArrowLeft: 'left',
  Digit6: 'right',
  Numpad6: 'right',
  ArrowRight: 'right',
  Digit5: 'confirm',
  Numpad5: 'confirm',
  Enter: 'confirm',
  Space: 'confirm',
  Escape: 'quit',
};

export class Input {
  onPress: (() => void) | null = null; // called inside the key event, e.g. to unlock audio
  private queue: Action[] = [];
  private down = new Set<string>();
  private target: EventTarget | null = null;

  private readonly onKeyDown = (e: Event) => {
    const key = e as KeyboardEvent;
    const action = KEY_ACTIONS[key.code];
    if (!action) return;
    key.preventDefault();
    this.down.add(key.code);
    if (!key.repeat) this.press(action);
  };

  private readonly onKeyUp = (e: Event) => {
    this.down.delete((e as KeyboardEvent).code);
  };

  private readonly onBlur = () => this.down.clear();

  attach(target: EventTarget): void {
    this.detach();
    this.target = target;
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  detach(): void {
    this.target?.removeEventListener('keydown', this.onKeyDown);
    this.target?.removeEventListener('keyup', this.onKeyUp);
    this.target?.removeEventListener('blur', this.onBlur);
    this.target = null;
  }

  press(action: Action): void {
    this.onPress?.();
    this.queue.push(action);
  }

  held(action: Action): boolean {
    for (const code of this.down) if (KEY_ACTIONS[code] === action) return true;
    return false;
  }

  drain(): Action[] {
    const out = this.queue;
    this.queue = [];
    return out;
  }
}
