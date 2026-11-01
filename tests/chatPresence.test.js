import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactPresenceLabel, groupPresenceLabel } from '../src/lib/chatPresence.js';

const now = new Date('2026-10-31T21:05:00Z');

test('presence uses Moscow dates and last visit time, independently of messages', () => {
  assert.equal(contactPresenceLabel({ online: true }), 'В сети');
  assert.equal(contactPresenceLabel({ gender: 'female', lastSeen: '2026-10-31T21:00:00Z' }, now), 'Была в сети сегодня в 00:00');
  assert.equal(contactPresenceLabel({ gender: 'male', lastSeen: '2026-10-31T20:59:00Z' }, now), 'Был в сети вчера в 23:59');
  assert.equal(contactPresenceLabel({ lastSeen: '2025-10-29T10:00:00Z' }, now), 'Последний раз в сети 29 октября 2025 г. в 13:00');
  assert.equal(contactPresenceLabel({ lastSeen: 'invalid' }, now), 'Время посещения неизвестно');
  assert.equal(contactPresenceLabel({}, now), 'Время посещения неизвестно');
});

test('group header counts online members and omits the online count when empty', () => {
  assert.equal(groupPresenceLabel([{ online: true }, { online: false }, { online: true }]), '3 участника · 2 в сети');
  assert.equal(groupPresenceLabel([{ online: false }, {}]), '2 участника');
  assert.equal(groupPresenceLabel(Array.from({ length: 21 }, () => ({ online: true }))), '21 участник · 21 в сети');
});
