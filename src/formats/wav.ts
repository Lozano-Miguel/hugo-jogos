// RIFF/WAVE PCM decoder. The 1998 files are 22050 Hz, 8-bit unsigned, mono;
// decoding ourselves avoids browser quirks with 8-bit WAV.

export interface PcmSound {
  sampleRate: number;
  samples: Float32Array; // mono, -1..1
}

export function decodeWav(data: Uint8Array): PcmSound {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const tag = (o: number) => String.fromCharCode(...data.subarray(o, o + 4));
  if (data.length < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Not a WAV file');

  let format = 0;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  for (let pos = 12; pos + 8 <= data.length; ) {
    const id = tag(pos);
    const size = view.getUint32(pos + 4, true);
    const body = pos + 8;
    if (id === 'fmt ') {
      format = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
    } else if (id === 'data') {
      if (format !== 1 || (bits !== 8 && bits !== 16)) throw new Error(`Unsupported WAV format ${format}/${bits}-bit`);
      const bytes = Math.min(size, data.length - body);
      return { sampleRate, samples: toMono(view, body, bytes, channels, bits) };
    }
    pos = body + size + (size & 1);
  }
  throw new Error('WAV has no data chunk');
}

function toMono(view: DataView, start: number, bytes: number, channels: number, bits: number): Float32Array {
  const width = bits / 8;
  const frames = Math.floor(bytes / (width * channels));
  const out = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let acc = 0;
    for (let c = 0; c < channels; c++) {
      const at = start + (f * channels + c) * width;
      acc += bits === 8 ? (view.getUint8(at) - 128) / 128 : view.getInt16(at, true) / 32768;
    }
    out[f] = acc / channels;
  }
  return out;
}
