import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAudioPreferences, microphoneConstraints } from '../src/lib/audioPreferences.js';

test('invalid audio preferences keep microphone processing enabled and constrain test volume', () => {
  const defaults = { echoCancellation: true, noiseSuppression: true, testVolume: 50 };
  for (const value of [null, 'bad data', { echoCancellation: 'false', noiseSuppression: 0, testVolume: NaN }]) {
    assert.deepEqual(normalizeAudioPreferences(value), defaults);
  }
  assert.equal(normalizeAudioPreferences({ testVolume: -10 }).testVolume, 0);
  assert.equal(normalizeAudioPreferences({ testVolume: 300 }).testVolume, 100);
});

test('microphone constraints honor disabled processing and exclude output test volume', () => {
  assert.deepEqual(microphoneConstraints({ echoCancellation: false, noiseSuppression: false, testVolume: 100 }), { echoCancellation: false, noiseSuppression: false });
});
