// Manual 16-bit PCM WAV encoding for the dual-track recorder. No MediaRecorder
// (that only gives lossy WebM/Opus) — we build the RIFF/WAVE container ourselves
// from the Float32 PCM captured by the AudioWorklet.

// Concatenate a list of per-block channel arrays into one Float32Array per channel.
// blocks: array of blocks; each block is an array of channel Float32Arrays.
export function mergeChannels(blocks: Float32Array[][]): Float32Array[] {
  if (!blocks.length) return [];
  const numCh = blocks[0].length || 1;
  const out: Float32Array[] = [];
  for (let ch = 0; ch < numCh; ch++) {
    let total = 0;
    for (const b of blocks) total += b[ch]?.length ?? 0;
    const merged = new Float32Array(total);
    let offset = 0;
    for (const b of blocks) {
      const data = b[ch];
      if (data) { merged.set(data, offset); offset += data.length; }
    }
    out[ch] = merged;
  }
  return out;
}

// Encode channel PCM (Float32, -1..1) as a 16-bit WAV Blob.
export function encodeWav(channels: Float32Array[], sampleRate: number): Blob {
  const numCh = Math.max(1, channels.length);
  const numFrames = channels[0]?.length ?? 0;
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);          // fmt chunk size
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);          // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  // Interleave + clamp to 16-bit.
  let pos = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      let s = channels[ch]?.[i] ?? 0;
      s = Math.max(-1, Math.min(1, s));
      view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      pos += 2;
    }
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export const fmtBytes = (n: number) => (n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
