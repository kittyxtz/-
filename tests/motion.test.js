import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMotionScope } from '../src/lib/motion.js';

test('mobile page transitions do not create a second animation layer or ghost snapshot', () => {
  const original = globalThis.matchMedia;
  try {
    globalThis.matchMedia = query => ({ matches: query === '(max-width: 760px)' });
    const motion = createMotionScope(() => false);
    const node = { animate() { throw new Error('Competing mobile animation'); }, cloneNode() { throw new Error('Ghost layer on mobile'); } };
    assert.equal(motion.enabled, false);
    assert.equal(motion.animate(node, [], { duration: 300 }), null);
    assert.equal(motion.snapshot(node, {}, 'ghost'), null);
  } finally { if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia; }
});

test('interrupting a transition removes its inert snapshot and cancels both animation layers', async () => {
  let removed = 0, cancelled = 0;
  const idsRemoved = [];
  const copy = {
    removeAttribute: name => idsRemoved.push(name),
    querySelectorAll: () => [{ removeAttribute: name => idsRemoved.push(name) }],
    setAttribute: (key, value) => { copy[key] = value; },
    classList: { add() {} },
    remove: () => removed++,
  };
  const parent = { append: node => assert.equal(node, copy) };
  const node = {
    cloneNode: () => copy,
    animate: () => {
      let reject;
      const finished = new Promise((_, fail) => { reject = fail; });
      return { finished, cancel: () => { cancelled++; reject(new Error('Interrupted')); } };
    },
  };
  const motion = createMotionScope(() => false);
  motion.snapshot(node, parent, 'scenario-ghost');
  motion.animate(node, [], { duration: 320 });
  motion.animate(node, [], { duration: 260, fill: 'both' });
  assert.equal(copy.inert, true);
  assert.equal(copy['aria-hidden'], 'true');
  assert.deepEqual(idsRemoved, ['id', 'id']);
  motion.clear(); motion.clear();
  assert.equal(cancelled, 2);
  assert.equal(removed, 1);
  await Promise.resolve();
});

test('reduced motion skips animations and a finished closing layer can still be cleared', async () => {
  let reduced = true, cancelled = 0, started = 0;
  const motion = createMotionScope(() => reduced);
  const node = { animate: () => { started++; return { finished: Promise.resolve(), cancel: () => cancelled++ }; } };
  assert.equal(motion.animate(node, [], { duration: 180 }), null);
  assert.equal(motion.snapshot(node, {}, 'month-ghost'), null);
  reduced = false;
  motion.animate(node, [], { duration: 180, fill: 'both' });
  await Promise.resolve();
  motion.clear();
  assert.equal(started, 1);
  assert.equal(cancelled, 1);
});
