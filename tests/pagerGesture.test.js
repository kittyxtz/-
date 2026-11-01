import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pagerTarget } from '../src/lib/pagerGesture.js';

test('a deliberate drag changes page and a short slow drag returns to the current page', () => {
  assert.equal(pagerTarget(1, 3, -100, 300), 2);
  assert.equal(pagerTarget(1, 3, 100, 300), 0);
  assert.equal(pagerTarget(1, 3, -30, 300, -.1), 1);
});
test('a short fast flick completes the page turn but taps and reversals do not', () => {
  assert.equal(pagerTarget(1, 3, -25, 300, -.8), 2);
  assert.equal(pagerTarget(1, 3, 25, 300, .8), 0);
  assert.equal(pagerTarget(1, 3, -8, 300, -.8), 1);
  assert.equal(pagerTarget(1, 3, -25, 300, .8), 1);
  assert.equal(pagerTarget(0, 3, 100, 300, .8), 0);
  assert.equal(pagerTarget(2, 3, -100, 300, -.8), 2);
});
