import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomUrl, storeRoom, readRoom } from '../src/lib/roomSession.js';

test('entering a room preserves the guest name and devices across page navigation', () => {
  const data = new Map(), storage = { setItem: (key, value) => data.set(key, value), getItem: key => data.get(key) };
  const meeting = { code: 'sky-wave-482', title: 'Макеты & вопросы', name: 'Гость Анна' };
  storeRoom(meeting, { mic: true, camera: false }, 'chats', storage);
  const url = new URL(roomUrl(meeting, 'http://localhost/chats.html'));
  assert.equal(url.pathname, '/meeting.html'); assert.equal(url.searchParams.get('title'), meeting.title);
  assert.equal(url.searchParams.has('name'), false);
  const room = readRoom(url.searchParams, '', storage);
  assert.equal(room.name, meeting.name); assert.deepEqual(room.devices, { mic: true, camera: false });
  assert.equal(room.returnTo, './chats.html');
});
test('a malformed invitation is rejected and a return destination cannot escape the site', () => {
  assert.equal(readRoom(new URLSearchParams('room=broken'), '', {}), null);
  const params = new URLSearchParams('room=sky-wave-482&title=Встреча');
  const room = readRoom(params, 'Гость', { getItem: () => JSON.stringify({ from: 'https://example.com', devices: { mic: 'true' } }) });
  assert.equal(room.returnTo, './chats.html'); assert.equal(room.devices.mic, false);
  assert.equal(room.name, 'Гость');
  assert.equal(readRoom(params, '', { getItem() { throw new Error('Unavailable'); } }).title, 'Встреча');
});
