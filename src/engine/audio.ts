// Web Audio playback of the original PCM sounds. Browsers only allow audio
// after a user gesture, so nothing plays until unlock() is called from one.
import type { PcmSound } from '../formats/wav';

export interface SoundHandle {
  readonly duration: number;
  readonly ended: Promise<void>;
  stop(): void;
}

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private sounds = new Map<string, PcmSound>();
  private buffers = new Map<string, AudioBuffer>();
  private live = new Map<AudioBufferSourceNode, string>();

  constructor(private readonly createContext: () => AudioContext = () => new AudioContext()) {}

  get unlocked(): boolean {
    return this.ctx !== null;
  }

  unlock(): void {
    if (!this.ctx) this.ctx = this.createContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  register(name: string, pcm: PcmSound): void {
    this.sounds.set(name, pcm);
    this.buffers.delete(name);
  }

  play(name: string, opts: { loop?: boolean; volume?: number } = {}): SoundHandle | null {
    const ctx = this.ctx;
    const buffer = ctx ? this.buffer(ctx, name) : null;
    if (!ctx || !buffer) return null;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = opts.loop ?? false;
    const gain = ctx.createGain();
    gain.gain.value = opts.volume ?? 1;
    source.connect(gain);
    gain.connect(ctx.destination);

    const ended = new Promise<void>((resolve) => {
      source.onended = () => {
        this.live.delete(source);
        resolve();
      };
    });
    this.live.set(source, name);
    source.start();
    return { duration: buffer.duration, ended, stop: () => source.stop() };
  }

  // The game freezes in a hidden tab; so does its sound.
  pause(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  stop(name: string): void {
    for (const [source, n] of [...this.live]) if (n === name) source.stop();
  }

  stopAll(): void {
    for (const source of [...this.live.keys()]) source.stop();
  }

  now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  private buffer(ctx: AudioContext, name: string): AudioBuffer | null {
    let buffer = this.buffers.get(name);
    if (!buffer) {
      const pcm = this.sounds.get(name);
      if (!pcm) return null;
      buffer = ctx.createBuffer(1, pcm.samples.length, pcm.sampleRate);
      buffer.copyToChannel(pcm.samples, 0);
      this.buffers.set(name, buffer);
    }
    return buffer;
  }
}
