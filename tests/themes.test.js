import test from 'node:test';
import assert from 'node:assert/strict';
import { themes, resolveTheme, themeMode } from '../src/lib/themes.js';

test('saved preset IDs preserve their light or dark component mode', () => {
  assert.equal(resolveTheme('sage').mode, 'light');
  assert.equal(resolveTheme('olive').mode, 'dark');
  assert.equal(resolveTheme('ember').mode, 'dark');
  assert.equal(resolveTheme('linen').mode, 'light');
  assert.equal(resolveTheme('porcelain').mode, 'light');
  assert.equal(resolveTheme('oled').mode, 'dark');
  assert.equal(resolveTheme('iris').mode, 'dark');
  for (const theme of themes) assert.equal(resolveTheme(theme.id), theme);
});

test('retired dusk preferences migrate to the new dark preset', () => {
  assert.equal(resolveTheme('dusk').id, 'olive');
  assert.equal(resolveTheme('tide').id, 'olive');
  assert.equal(resolveTheme('monet').id, 'oled');
  assert.equal(resolveTheme('iris').id, 'iris');
});

test('Monet follows the system mode while fixed presets ignore it', () => {
  assert.equal(themeMode('monet-system', true), 'dark');
  assert.equal(themeMode('monet-system', false), 'light');
  assert.equal(themeMode('oled', false), 'dark');
  assert.equal(themeMode('sage', true), 'light');
});

test('legacy light/dark preferences and unknown saved values resolve safely', () => {
  assert.equal(resolveTheme('dark').id, 'dark');
  for (const value of ['light', '', null, undefined, 'unknown']) {
    assert.equal(resolveTheme(value).id, 'light');
  }
});
