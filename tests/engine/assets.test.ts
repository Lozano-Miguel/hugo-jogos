import { describe, expect, it, vi } from 'vitest';
import { Assets, AssetsMissingError } from '../../src/engine/assets';

const manifest = { files: ['traindata/gfx/hspump.cgf', 'traindata/speaks/003-01.wav'] };

function fakeFetch(routes: Record<string, unknown>) {
  return vi.fn(async (url: string) => {
    if (!(url in routes)) return new Response('not found', { status: 404 });
    const body = routes[url];
    return new Response(body instanceof Uint8Array ? body : JSON.stringify(body), { status: 200 });
  });
}

describe('Assets', () => {
  it('reports missing assets when there is no manifest', async () => {
    const assets = new Assets('/data/', fakeFetch({}) as unknown as typeof fetch);
    await expect(assets.init()).rejects.toBeInstanceOf(AssetsMissingError);
  });

  it('reports missing assets when the fetch fails', async () => {
    const failing = vi.fn(async () => {
      throw new TypeError('network');
    });
    const assets = new Assets('/data/', failing as unknown as typeof fetch);
    await expect(assets.init()).rejects.toBeInstanceOf(AssetsMissingError);
  });

  it('reports missing assets when the server answers with a page instead of the manifest', async () => {
    const htmlFallback = vi.fn(async () => new Response('<!doctype html><html></html>', { status: 200 }));
    const assets = new Assets('/data/', htmlFallback as unknown as typeof fetch);
    await expect(assets.init()).rejects.toBeInstanceOf(AssetsMissingError);
  });

  it('looks up files case-insensitively', async () => {
    const assets = new Assets('/data/', fakeFetch({ '/data/manifest.json': manifest }) as unknown as typeof fetch);
    await assets.init();
    expect(assets.has('TrainData/GFX/HSPUMP.CGF')).toBe(true);
    expect(assets.has('traindata/gfx/nope.cgf')).toBe(false);
  });

  it('lists files under a folder', async () => {
    const assets = new Assets('/data/', fakeFetch({ '/data/manifest.json': manifest }) as unknown as typeof fetch);
    await assets.init();
    expect(assets.list('TrainData/gfx/')).toEqual(['traindata/gfx/hspump.cgf']);
  });

  it('rejects unknown assets', async () => {
    const assets = new Assets('/data/', fakeFetch({ '/data/manifest.json': manifest }) as unknown as typeof fetch);
    await assets.init();
    await expect(assets.bytes('nope')).rejects.toThrow('Unknown asset: nope');
  });

  it('fetches each file once', async () => {
    const fetchFn = fakeFetch({
      '/data/manifest.json': manifest,
      '/data/traindata/gfx/hspump.cgf': new Uint8Array([1, 2, 3]),
    });
    const assets = new Assets('/data/', fetchFn as unknown as typeof fetch);
    await assets.init();
    const a = await assets.bytes('TrainData/gfx/HSPUMP.cgf');
    const b = await assets.bytes('traindata/gfx/hspump.cgf');
    expect(Array.from(a)).toEqual([1, 2, 3]);
    expect(b).toBe(a);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('returns the same palette object every time, so decoded sprites are reused between games', async () => {
    const til = new Uint8Array(0x400);
    const cgf = new Uint8Array(2048);
    const fetchFn = fakeFetch({
      '/data/manifest.json': { files: ['a/b.til', 'a/c.cgf'] },
      '/data/a/b.til': til,
      '/data/a/c.cgf': cgf,
    });
    const assets = new Assets('/data/', fetchFn as unknown as typeof fetch);
    await assets.init();
    expect(await assets.palette('a/b.til')).toBe(await assets.palette('A/B.TIL'));
    expect(await assets.embeddedPalette('a/c.cgf')).toBe(await assets.embeddedPalette('a/c.cgf'));
  });
});
