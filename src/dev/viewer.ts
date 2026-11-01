// Dev-only asset viewer (/viewer.html): browse every CGF/TIL frame at its
// original screen position with a chosen palette, and play the sounds.
import { Assets, type Sprite } from '../engine/assets';
import { AudioSystem } from '../engine/audio';
import type { Palette } from '../formats/palette';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const files = $<HTMLSelectElement>('files');
const folder = $<HTMLSelectElement>('folder');
const paletteSel = $<HTMLSelectElement>('palette');
const bgSel = $<HTMLSelectElement>('bg');
const bgFrame = $<HTMLInputElement>('bgframe');
const frame = $<HTMLInputElement>('frame');
const info = $<HTMLSpanElement>('info');
const sounds = $<HTMLDivElement>('sounds');
const canvas = $<HTMLCanvasElement>('screen');
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

const assets = new Assets();
const audio = new AudioSystem();
let current: { kind: 'cgf'; sprite: Sprite } | { kind: 'til'; frames: HTMLCanvasElement[] } | null = null;

const option = (sel: HTMLSelectElement, value: string, label = value) => sel.add(new Option(label, value));

async function loadFolder(): Promise<void> {
  const prefix = `${folder.value}/`;
  const all = assets.list(prefix);
  files.innerHTML = '';
  all.filter((f) => /\.(cgf|til)$/.test(f)).forEach((f) => option(files, f, f.slice(prefix.length)));
  const tils = all.filter((f) => f.endsWith('.til'));
  paletteSel.innerHTML = '';
  bgSel.innerHTML = '<option value="">(nenhum)</option>';
  tils.forEach((f) => {
    option(paletteSel, f, f.slice(prefix.length));
    option(bgSel, f, f.slice(prefix.length));
  });
  sounds.innerHTML = '';
  all.filter((f) => f.endsWith('.wav')).forEach((f) => {
    const b = document.createElement('button');
    b.textContent = `▶ ${f.slice(prefix.length)}`;
    b.onclick = async () => {
      audio.unlock();
      audio.register(f, await assets.sound(f));
      audio.stopAll();
      audio.play(f);
    };
    sounds.append(b);
  });
}

async function palette(): Promise<Palette | null> {
  return paletteSel.value ? assets.palette(paletteSel.value) : null;
}

async function loadFile(): Promise<void> {
  const f = files.value;
  if (!f) return;
  if (f.endsWith('.til')) {
    current = { kind: 'til', frames: await assets.til(f) };
  } else {
    const pal = await palette();
    if (!pal) return;
    current = { kind: 'cgf', sprite: await assets.sprite(f, pal) };
  }
  const count = current.kind === 'til' ? current.frames.length : current.sprite.frames.length;
  frame.max = String(count - 1);
  frame.value = '0';
  await draw();
}

async function draw(): Promise<void> {
  ctx.clearRect(0, 0, 320, 240);
  if (bgSel.value) {
    const bg = await assets.til(bgSel.value);
    const i = Math.min(bg.length - 1, Number(bgFrame.value));
    ctx.drawImage(bg[i], 0, 0);
  }
  if (!current) return;
  const i = Number(frame.value);
  if (current.kind === 'til') {
    ctx.drawImage(current.frames[i], 0, 0);
    info.textContent = `${i}/${current.frames.length - 1}`;
  } else {
    const f = current.sprite.frames[i];
    if (f.image) ctx.drawImage(f.image, f.x, f.y);
    info.textContent = `${i}/${current.sprite.frames.length - 1}  x=${f.x} y=${f.y} w=${f.w} h=${f.h}`;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault();
  frame.value = String(Number(frame.value) + (e.key === 'ArrowRight' ? 1 : -1));
  void draw();
});

async function main(): Promise<void> {
  await assets.init();
  const folders = [...new Set(assets.list('').map((f) => f.split('/')[0]))].filter((f) => !f.endsWith('.json'));
  folders.forEach((f) => option(folder, f));
  folder.value = 'traindata';
  const params = new URLSearchParams(location.search);
  folder.value = params.get('folder') ?? 'traindata';
  await loadFolder();
  if (params.get('palette')) paletteSel.value = params.get('palette')!;
  if (params.get('bg')) bgSel.value = params.get('bg')!;
  if (params.get('bgframe')) bgFrame.value = params.get('bgframe')!;
  if (params.get('file')) {
    files.value = params.get('file')!;
    await loadFile();
    if (params.get('frame')) {
      frame.value = params.get('frame')!;
      await draw();
    }
  }
}

folder.onchange = () => void loadFolder();
files.onchange = () => void loadFile();
paletteSel.onchange = () => void loadFile();
bgSel.onchange = bgFrame.oninput = frame.oninput = () => void draw();
void main();
