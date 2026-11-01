import { read } from './storage.js';

export function normalizeAudioPreferences(value) {
  const saved = value && typeof value === 'object' ? value : {};
  return {
    echoCancellation: typeof saved.echoCancellation === 'boolean' ? saved.echoCancellation : true,
    noiseSuppression: typeof saved.noiseSuppression === 'boolean' ? saved.noiseSuppression : true,
    testVolume: typeof saved.testVolume === 'number' && Number.isFinite(saved.testVolume) ? Math.max(0, Math.min(100, saved.testVolume)) : 50,
  };
}
export const readAudioPreferences = () => normalizeAudioPreferences(read('sozvon-audio', null));
export function microphoneConstraints(preferences) {
  const { echoCancellation, noiseSuppression } = normalizeAudioPreferences(preferences);
  return { echoCancellation, noiseSuppression };
}
