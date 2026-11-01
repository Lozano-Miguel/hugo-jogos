import { describe, expect, it } from 'vitest';
import { AudioSystem } from '../../src/engine/audio';

class FakeSource {
  buffer: { duration: number } | null = null;
  loop = false;
  started = false;
  stopped = false;
  onended: (() => void) | null = null;
  connect() {
    return this;
  }
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
    this.onended?.();
  }
}

class FakeContext {
  suspended = 0;
  suspend() {
    this.suspended++;
    this.state = 'suspended';
    return Promise.resolve();
  }
  state = 'suspended';
  currentTime = 1.5;
  destination = {};
  sources: FakeSource[] = [];
  resumed = 0;
  resume() {
    this.resumed++;
    this.state = 'running';
    return Promise.resolve();
  }
  createBuffer(_channels: number, length: number, sampleRate: number) {
    return { duration: length / sampleRate, copyToChannel() {} };
  }
  createBufferSource() {
    const s = new FakeSource();
    this.sources.push(s);
    return s;
  }
  createGain() {
    return { gain: { value: 1 }, connect() {} };
  }
}

const pcm = { sampleRate: 22050, samples: new Float32Array(48400) };

function setup() {
  const ctx = new FakeContext();
  const audio = new AudioSystem(() => ctx as unknown as AudioContext);
  audio.register('start', pcm);
  return { ctx, audio };
}

describe('AudioSystem', () => {
  it('stays silent before unlock', () => {
    const { ctx, audio } = setup();
    expect(audio.play('start')).toBeNull();
    expect(ctx.sources).toHaveLength(0);
    expect(audio.now()).toBe(0);
  });

  it('plays a registered sound after unlock', () => {
    const { ctx, audio } = setup();
    audio.unlock();
    const handle = audio.play('start');
    expect(handle?.duration).toBeCloseTo(48400 / 22050);
    expect(ctx.sources[0].started).toBe(true);
    expect(audio.now()).toBe(1.5);
  });

  it('ignores unknown sounds', () => {
    const { audio } = setup();
    audio.unlock();
    expect(audio.play('nope')).toBeNull();
  });

  it('loops when asked', () => {
    const { ctx, audio } = setup();
    audio.unlock();
    audio.play('start', { loop: true });
    expect(ctx.sources[0].loop).toBe(true);
  });

  it('stops every live sound', () => {
    const { ctx, audio } = setup();
    audio.unlock();
    audio.play('start');
    audio.play('start', { loop: true });
    audio.stopAll();
    expect(ctx.sources.every((s) => s.stopped)).toBe(true);
  });

  it('resolves ended when the sound finishes', async () => {
    const { ctx, audio } = setup();
    audio.unlock();
    const handle = audio.play('start')!;
    ctx.sources[0].onended?.();
    await expect(handle.ended).resolves.toBeUndefined();
  });

  it('unlocks only once', () => {
    const { ctx, audio } = setup();
    audio.unlock();
    audio.unlock();
    expect(ctx.resumed).toBe(1);
    expect(audio.unlocked).toBe(true);
  });

  it('stops only the sounds with a given name', () => {
    const { ctx, audio } = setup();
    audio.register('loop', pcm);
    audio.unlock();
    audio.play('start');
    audio.play('loop', { loop: true });
    audio.stop('loop');
    expect(ctx.sources.map((s) => s.stopped)).toEqual([false, true]);
  });

  it('ignores stopping a sound that is not playing', () => {
    const { audio } = setup();
    audio.unlock();
    expect(() => audio.stop('nope')).not.toThrow();
  });

  it('retries resuming a context the browser kept suspended', () => {
    const ctx = new FakeContext();
    ctx.resume = function () {
      this.resumed++;
      return Promise.resolve();
    }; // stays 'suspended', like after an Escape keypress
    const audio = new AudioSystem(() => ctx as unknown as AudioContext);
    audio.unlock();
    audio.unlock();
    expect(ctx.resumed).toBe(2);
  });

  it('pauses all sound while the tab is hidden and resumes after', () => {
    const { ctx, audio } = setup();
    audio.pause(); // nothing to pause before unlock
    expect(ctx.suspended).toBe(0);
    audio.unlock();
    audio.pause();
    expect(ctx.suspended).toBe(1);
    audio.resume();
    expect(ctx.state).toBe('running');
  });
});
