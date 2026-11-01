export const waveformBars = 36;
export const voiceCancelDuration = 320;

export function signalRms(samples) {
  if (!samples.length) return 0;
  let energy = 0;
  for (const sample of samples) energy += sample * sample;
  return Math.min(1, Math.sqrt(energy / samples.length));
}
export const visibleAudioLevel = rms => Math.min(1, Math.sqrt(Math.max(0, rms)) * 1.8);

export function waveformFromChannels(channels, count = waveformBars) {
  const length = channels[0]?.length || 0;
  return Array.from({ length: count }, (_, index) => {
    if (!length) return 0;
    const start = Math.floor(index * length / count), end = Math.max(start + 1, Math.floor((index + 1) * length / count));
    let level = 0;
    for (const channel of channels) level = Math.max(level, signalRms(channel.subarray(start, end)));
    return visibleAudioLevel(level);
  });
}

export function waveformFromLevels(levels, count = waveformBars) {
  return Array.from({ length: count }, (_, index) => {
    if (!levels.length) return 0;
    const start = Math.floor(index * levels.length / count), end = Math.max(start + 1, Math.floor((index + 1) * levels.length / count));
    return Math.max(0, ...levels.slice(start, end));
  });
}

const decoded = new WeakMap();
export function decodeWaveform(blob) {
  if (!decoded.has(blob)) decoded.set(blob, (async () => {
    const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Offline && !Audio) return null;
    const context = Offline ? new Offline(1, 1, 44100) : new Audio();
    try {
      const buffer = await context.decodeAudioData(await blob.arrayBuffer());
      return waveformFromChannels(Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index)));
    } finally { if (context.close) await context.close().catch(() => {}); }
  })().catch(() => null));
  return decoded.get(blob);
}
