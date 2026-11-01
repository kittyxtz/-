import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceGesture, voiceGestureProgress } from '../src/lib/voiceGesture.js';

function setup() {
  const calls = [], scheduled = new Map();
  let next = 0;
  const gesture = createVoiceGesture({ start: () => calls.push('start'), send: () => calls.push('send'), cancel: () => calls.push('cancel'), change: () => {} }, {
    set(callback, delay) { assert.equal(delay, 350); scheduled.set(++next, callback); return next; },
    clear(id) { scheduled.delete(id); },
  });
  return { gesture, calls, tick: () => { [...scheduled.values()].forEach(callback => callback()); } };
}

test('visual arrow travel matches gesture thresholds and clamps both ends', () => {
  const origin = { x: 300, y: 300 };
  assert.deepEqual(voiceGestureProgress(origin, { x: 252, y: 270 }), { left: .5, up: .5 });
  assert.deepEqual(voiceGestureProgress(origin, { x: 204, y: 240 }), { left: 1, up: 1 });
  assert.deepEqual(voiceGestureProgress(origin, { x: 200, y: 200 }), { left: 1, up: 1 });
  assert.deepEqual(voiceGestureProgress(origin, { x: 400, y: 400 }), { left: 0, up: 0 });
});

test('release sends exactly once and ignores unrelated pointers', () => {
  const { gesture, calls } = setup();
  gesture.begin(1, { x: 300, y: 300 });
  assert.equal(gesture.begin(2), false);
  gesture.release(2);
  assert.deepEqual(calls, ['start']);
  gesture.release(1); gesture.release(1);
  assert.deepEqual(calls, ['start', 'send']);
});

test('dragging left cancels and release cannot send the cancelled recording', () => {
  const { gesture, calls } = setup();
  gesture.begin(1, { x: 300, y: 300 });
  gesture.move(1, { x: 220, y: 300 });
  assert.equal(gesture.phase, 'holding');
  gesture.move(1, { x: 200, y: 300 });
  gesture.release(1);
  assert.deepEqual(calls, ['start', 'cancel']);
});

test('holding above the threshold locks recording until the explicit send action', () => {
  const { gesture, calls, tick } = setup();
  gesture.begin(1, { x: 300, y: 300 });
  gesture.move(1, { x: 300, y: 230 });
  assert.equal(gesture.phase, 'locking');
  tick(); gesture.release(1);
  assert.equal(gesture.phase, 'locked');
  assert.deepEqual(calls, ['start']);
  gesture.send(); gesture.send();
  assert.deepEqual(calls, ['start', 'send']);
});

test('leaving the upper target or releasing early prevents a late lock', () => {
  const { gesture, calls, tick } = setup();
  gesture.begin(1, { x: 300, y: 300 });
  gesture.move(1, { x: 300, y: 230 });
  gesture.move(1, { x: 300, y: 290 }); tick();
  assert.equal(gesture.phase, 'holding');
  gesture.move(1, { x: 300, y: 230 });
  gesture.release(1); tick();
  assert.equal(gesture.phase, 'sending');
  assert.deepEqual(calls, ['start', 'send']);
});

test('reset or cancel clears the lock timer and a locked recording can be discarded', () => {
  const { gesture, calls, tick } = setup();
  gesture.begin(' ', { x: 300, y: 300 });
  gesture.move(' ', { x: 300, y: 230 });
  gesture.reset(); tick();
  assert.equal(gesture.phase, 'idle');
  gesture.begin('Enter'); gesture.lock(); gesture.release('Enter'); gesture.cancel();
  assert.deepEqual(calls, ['start', 'start', 'cancel']);
});

test('browser timer methods keep their global receiver when locking and cancelling', () => {
  const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
  let fire, cleared = false;
  try {
    globalThis.setTimeout = function(callback, delay) { assert.equal(this, globalThis); assert.equal(delay, 350); fire = callback; return 57; };
    globalThis.clearTimeout = function(id) { assert.equal(this, globalThis); assert.equal(id, 57); cleared = true; };
    const calls = [];
    const gesture = createVoiceGesture({ start() {}, change() {}, cancel() {}, send: () => calls.push('send') });
    gesture.begin(1, { x: 200, y: 200 }); gesture.move(1, { x: 200, y: 120 }); fire(); gesture.release(1);
    assert.equal(gesture.phase, 'locked'); assert.equal(cleared, true); assert.deepEqual(calls, []);
    gesture.send(); assert.deepEqual(calls, ['send']);
  } finally { globalThis.setTimeout = originalSet; globalThis.clearTimeout = originalClear; }
});
