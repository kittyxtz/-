import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockBlocked, clockPosition, clockValueAt, shortestClockTurn } from '../src/lib/clock.js';

test('clock hand crosses midnight by the shortest turn in either direction', () => {
  assert.equal(shortestClockTurn(354, 0), 360);
  assert.equal(shortestClockTurn(360, 354), 354);
  assert.equal(shortestClockTurn(15, 345), -15);
  assert.equal(shortestClockTurn(-15, 15), 15);
  assert.equal(shortestClockTurn(720, 6), 726);
});

test('both hour rings and all minute positions round-trip through pointer geometry at phone and desktop sizes', () => {
  for (const size of [196, 224, 240, 280, 320]) {
    for (const part of ['hour', 'minute']) {
      for (let value = 0; value < (part === 'hour' ? 24 : 60); value++) {
        const { x, y } = clockPosition(value, part);
        assert.equal(clockValueAt(x / 280 * size, y / 280 * size, size, part), value, `${part} ${value} at ${size}px`);
      }
    }
  }
});
test('hour selection distinguishes midnight and noon and wraps minutes at the top', () => {
  assert.equal(clockValueAt(140, 28, 280, 'hour'), 0);
  assert.equal(clockValueAt(140, 66, 280, 'hour'), 12);
  assert.equal(clockValueAt(139, 28, 280, 'minute'), 0);
  assert.equal(clockValueAt(140, 140, 280, 'minute'), null);
});
test('elapsed hours and minutes stay blocked while the current hour can still be chosen', () => {
  const minimum = 21 * 60 + 17;
  assert.equal(clockBlocked(20, 'hour', 21, minimum), true);
  assert.equal(clockBlocked(21, 'hour', 21, minimum), false);
  assert.equal(clockBlocked(16, 'minute', 21, minimum), true);
  assert.equal(clockBlocked(17, 'minute', 21, minimum), false);
  assert.equal(clockBlocked(0, 'minute', 22, minimum), false);
  assert.equal(clockBlocked(23, 'hour', 23, 1440), true);
});
