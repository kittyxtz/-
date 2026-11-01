import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messageDelivery, markPendingSent } from '../src/lib/messageDelivery.js';

test('outgoing delivery status distinguishes pending, unread and read; incoming has no status', () => {
  assert.equal(messageDelivery({ self: true, delivery: 'pending' }).icon, 'clock');
  assert.equal(messageDelivery({ self: true, delivery: 'sent' }).icon, 'check');
  assert.equal(messageDelivery({ self: true, delivery: 'read' }).icon, 'double-check');
  assert.equal(messageDelivery({ self: true }).icon, 'check');
  assert.equal(messageDelivery({ delivery: 'read' }), null);
  assert.equal(messageDelivery(undefined), null);
});

test('restoring connection updates only pending outgoing messages and never marks them read', () => {
  const messages = [{ self: true, delivery: 'pending' }, { self: true, delivery: 'read' }, { delivery: 'pending' }];
  const next = markPendingSent(messages);
  assert.equal(next[0].delivery, 'sent');
  assert.equal(messages[0].delivery, 'pending');
  assert.equal(next[1], messages[1]);
  assert.equal(next[2], messages[2]);
});
