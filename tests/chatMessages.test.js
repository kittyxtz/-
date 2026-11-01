import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canDeleteMessage, messageActions, messageAttachments, quoteMessage, forwardedMessage } from '../src/lib/chatMessages.js';

test('reply and forward lead the message menu; voice cannot be copied but text and photos can', () => {
  for (const message of [{ text: 'Привет' }, { file: { title: 'Фото.jpg', type: 'image/jpeg' } }, { voice: { url: 'blob:voice' } }]) {
    const actions = messageActions({}, message).map(item => item.id);
    assert.deepEqual(actions.slice(0, 2), ['reply', 'forward']);
    assert.equal(actions.includes('copy'), !message.voice);
    assert.equal(actions.includes('delete'), false);
  }
});
test('only authors and group admins can delete a message', () => {
  assert.equal(canDeleteMessage({}, { self: true }), true);
  assert.equal(canDeleteMessage({ isAdmin: true }, { self: false }), true);
  assert.equal(canDeleteMessage({ isAdmin: false }, { self: false }), false);
});
test('forwarding preserves a photo album as one message with one caption', () => {
  const source = { id: 'album', text: 'С прогулки', files: [{ title: 'one.jpg' }, { title: 'two.png' }] };
  const forwarded = forwardedMessage(source);
  assert.deepEqual(messageAttachments(forwarded), source.files);
  assert.equal(forwarded.text, 'С прогулки');
  assert.notEqual(forwarded.id, source.id);
  assert.equal(messageActions({}, source).some(item => item.id === 'copy'), true);
  assert.equal(messageActions({}, { files: source.files }).some(item => item.id === 'copy'), false);
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
