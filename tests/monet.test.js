import test from 'node:test';
import assert from 'node:assert/strict';
import { monetTokens, normalizeMonetSeed, defaultMonetSeed } from '../src/lib/monet.js';
import { advanceOledGesture } from '../src/lib/oledGesture.js';

const luminance = hex => {
  const channels = hex.slice(1).match(/../g).map(n => parseInt(n, 16) / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
};
const contrast = (a, b) => {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high + .05) / (low + .05);
};

test('Material palettes keep body, secondary text and primary actions readable across seed hues', () => {
  for (const seed of ['#6750a4', '#ff0000', '#00ff00', '#0000ff', '#ffffff', '#000000']) {
    for (const dark of [false, true]) {
      const colors = monetTokens(seed, dark);
      for (const [foreground, background] of [['--color-text', '--color-surface'], ['--color-secondary', '--color-surface'], ['--color-on-accent', '--color-accent']]) {
        assert.ok(contrast(colors[foreground], colors[background]) >= 4.5, `${seed}/${dark}: ${foreground}`);
      }
    }
  }
});

test('invalid saved seed values fall back to a usable Material palette', () => {
  assert.equal(normalizeMonetSeed('#AABBCC'), '#aabbcc');
  for (const invalid of [null, '#fff', '', 'red', 'var(--x)']) {
    assert.equal(normalizeMonetSeed(invalid), null);
    assert.deepEqual(monetTokens(invalid, false), monetTokens(defaultMonetSeed, false));
  }
});

test('OLED gesture needs seven consecutive taps and resets after a pause', () => {
  let taps = { count: 0, at: 0 };
  for (let i = 1; i <= 7; i++) taps = advanceOledGesture(taps, i * 150);
  assert.equal(taps.count, 7);
  assert.equal(advanceOledGesture(taps, 6000).count, 1);
});
