import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signalRms, waveformFromChannels, waveformFromLevels } from '../src/lib/audioWaveform.js';

test('silence produces a flat waveform and signal energy determines bar heights', () => {
  assert.deepEqual(waveformFromChannels([new Float32Array(400)], 4), [0, 0, 0, 0]);
  const samples = Float32Array.from({ length: 400 }, (_, i) => i < 100 ? 0 : i < 200 ? .01 : i < 300 ? .1 : .5);
  const levels = waveformFromChannels([samples], 4);
  assert.equal(levels[0], 0);
  assert.ok(levels[1] > 0 && levels[1] < levels[2] && levels[2] < levels[3]);
});

test('opposite stereo channels do not cancel real audio in the waveform', () => {
  const positive = Float32Array.from([.1, .1, .2, .2]), negative = positive.map(value => -value);
  assert.deepEqual(waveformFromChannels([positive, negative], 2), waveformFromChannels([positive], 2));
  assert.ok(Math.abs(signalRms(Float32Array.from([1, -1]))) === 1);
});

test('short recordings fill all bars from actual samples and live silence stays silent', () => {
  const bars = waveformFromChannels([Float32Array.from([0, .25])], 4);
  assert.equal(bars.length, 4); assert.deepEqual(bars.slice(0, 2), [0, 0]); assert.ok(bars[2] > 0 && bars[3] > 0);
  assert.deepEqual(waveformFromLevels([0, 0], 4), [0, 0, 0, 0]);
});
