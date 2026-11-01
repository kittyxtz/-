import test from 'node:test';
import assert from 'node:assert/strict';
import { chatCount, participantCount, selectedMessageCount, formatPercent } from '../src/lib/formatText.js';

test('Russian participant counts use the right form, including teens', () => {
  for (const [count, expected] of [[0, '0 участников'], [1, '1 участник'], [2, '2 участника'], [5, '5 участников'], [11, '11 участников'], [21, '21 участник'], [22, '22 участника'], [111, '111 участников']]) {
    assert.equal(participantCount(count), expected);
  }
});

test('message selection is a complete phrase and percentages keep the unit together', () => {
  assert.equal(selectedMessageCount(1), 'Выбрано 1 сообщение');
  assert.equal(selectedMessageCount(3), 'Выбрано 3 сообщения');
  assert.equal(selectedMessageCount(12), 'Выбрано 12 сообщений');
  assert.equal(formatPercent(75), '75\u00a0%');
  assert.equal(chatCount(1), '1 чат');
  assert.equal(chatCount(6), '6 чатов');
});
