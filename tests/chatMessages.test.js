import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canDeleteMessage, quoteMessage, forwardedMessage } from '../src/lib/chatMessages.js';
test('only authors and group admins can delete a message', () => {
  assert.equal(canDeleteMessage({}, { self: true }), true);
  assert.equal(canDeleteMessage({ isAdmin: true }, { self: false }), true);
  assert.equal(canDeleteMessage({ isAdmin: false }, { self: false }), false);
});
test('reply keeps its quote when the source changes and forwarding gets a new date and identity', () => {
  const source = { id: 'old', day: '2026-10-29', author: 'Анна', text: 'Макеты готовы', pinned: true };
  const quote = quoteMessage(source);
  const forwarded = forwardedMessage(source, new Date('2026-10-31T10:00:00Z'));
  source.text = 'Изменено';
  assert.equal(quote.text, 'Макеты готовы');
  assert.equal(forwarded.day, '2026-10-31'); assert.notEqual(forwarded.id, source.id);
  assert.equal(forwarded.forwarded, 'Анна'); assert.equal(forwarded.self, true); assert.equal(forwarded.pinned, undefined);
});
