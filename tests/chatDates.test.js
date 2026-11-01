import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatDay, chatDateLabel, startsChatDay } from '../src/lib/chatDates.js';

test('a reply in yesterday’s conversation starts a new date section', () => {
  const now = new Date('2026-10-30T10:00:00Z');
  const messages = [{ day: '2026-10-29' }, { day: '2026-10-29' }, { day: chatDay(now) }, { day: chatDay(now) }];
  assert.deepEqual(messages.map((_, i) => startsChatDay(messages, i)), [true, false, true, false]);
  assert.equal(chatDateLabel(messages[0].day, now), 'Вчера');
  assert.equal(chatDateLabel(messages[2].day, now), 'Сегодня');
});
test('chat days follow Moscow midnight across month and year boundaries', () => {
  assert.equal(chatDay(new Date('2026-12-31T20:59:00Z')), '2026-12-31');
  const midnight = new Date('2026-12-31T21:00:00Z');
  assert.equal(chatDay(midnight), '2027-01-01');
  assert.equal(chatDateLabel('2026-12-31', midnight), 'Вчера');
  assert.equal(chatDateLabel('2026-10-29', midnight), '29 октября 2026 г.');
});
