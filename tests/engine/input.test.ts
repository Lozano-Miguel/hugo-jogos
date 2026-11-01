import { describe, expect, it } from 'vitest';
import { Input } from '../../src/engine/input';

class FakeTarget {
  listeners: { type: string; fn: (e: unknown) => void }[] = [];
  addEventListener(type: string, fn: (e: unknown) => void) {
    this.listeners.push({ type, fn });
  }
  removeEventListener(type: string, fn: (e: unknown) => void) {
    this.listeners = this.listeners.filter((l) => l.type !== type || l.fn !== fn);
  }
  emit(type: string, event: object) {
    this.listeners.filter((l) => l.type === type).forEach((l) => l.fn(event));
  }
  key(code: string, repeat = false, type = 'keydown') {
    const event = { code, repeat, prevented: false, preventDefault() { this.prevented = true; } };
    this.emit(type, event);
    return event;
  }
}

function setup() {
  const target = new FakeTarget();
  const input = new Input();
  input.attach(target as unknown as EventTarget);
  return { target, input };
}

describe('Input', () => {
  it('maps the left keys', () => {
    const { target, input } = setup();
    ['Digit4', 'Numpad4', 'ArrowLeft'].forEach((c) => target.key(c));
    expect(input.drain()).toEqual(['left', 'left', 'left']);
  });

  it('maps the right keys', () => {
    const { target, input } = setup();
    ['Digit6', 'Numpad6', 'ArrowRight'].forEach((c) => target.key(c));
    expect(input.drain()).toEqual(['right', 'right', 'right']);
  });

  it('maps the confirm keys', () => {
    const { target, input } = setup();
    ['Digit5', 'Numpad5', 'Enter', 'Space'].forEach((c) => target.key(c));
    expect(input.drain()).toEqual(['confirm', 'confirm', 'confirm', 'confirm']);
  });

  it('ignores other keys without blocking them', () => {
    const { target, input } = setup();
    const e = target.key('KeyA');
    expect(input.drain()).toEqual([]);
    expect(e.prevented).toBe(false);
  });

  it('blocks the browser default for game keys', () => {
    const { target } = setup();
    expect(target.key('Space').prevented).toBe(true);
  });

  it('counts a held key once', () => {
    const { target, input } = setup();
    target.key('Digit4');
    target.key('Digit4', true);
    target.key('Digit4', true);
    expect(input.drain()).toEqual(['left']);
  });

  it('keeps presses in order and clears them', () => {
    const { target, input } = setup();
    target.key('Digit4');
    target.key('Digit6');
    expect(input.drain()).toEqual(['left', 'right']);
    expect(input.drain()).toEqual([]);
  });

  it('calls the press hook on every press, so audio can be unlocked by any later key', () => {
    const { target, input } = setup();
    let calls = 0;
    input.onPress = () => calls++;
    target.key('Escape');
    input.press('confirm');
    target.key('Digit4');
    target.key('Digit4', true);
    expect(calls).toBe(3);
  });

  it('stops listening after detach', () => {
    const { target, input } = setup();
    input.detach();
    target.key('Digit4');
    expect(input.drain()).toEqual([]);
  });

  it('reports held keys until they are released', () => {
    const { target, input } = setup();
    target.key('Digit4');
    expect(input.held('left')).toBe(true);
    target.key('Numpad4');
    target.key('Digit4', false, 'keyup');
    expect(input.held('left')).toBe(true);
    target.key('Numpad4', false, 'keyup');
    expect(input.held('left')).toBe(false);
  });

  it('forgets held keys when the window loses focus', () => {
    const { target, input } = setup();
    target.key('ArrowRight');
    target.emit('blur', {});
    expect(input.held('right')).toBe(false);
  });

  it('maps Escape to quit', () => {
    const { target, input } = setup();
    target.key('Escape');
    expect(input.drain()).toEqual(['quit']);
  });
});
