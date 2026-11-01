import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meetingCalendar } from '../src/lib/downloads.js';
import { packWorkspace, textWorkspace } from '../src/lib/useChatWorkspace.js';
import { normalizeDevicePreferences } from '../src/lib/devicePreferences.js';
import { normalizeNotifications } from '../src/lib/notificationPreferences.js';

test('calendar export preserves meeting identity, UTC times, duration, escaping and reminder', () => {
  const value = meetingCalendar({ code: 'sky-wave-482', title: 'Макеты, планы; вопросы\nкоманды', date: '2026-11-02T11:00:00Z', duration: 45, reminder: 10 }, 'https://example.com/?room=sky-wave-482', new Date('2026-10-31T10:00:00Z'));
  assert.match(value, /UID:sky-wave-482@sozvon\.local\r\n/);
  assert.match(value, /DTSTART:20261102T110000Z\r\nDTEND:20261102T114500Z/);
  assert.ok(value.includes('SUMMARY:Макеты\\, планы\\; вопросы\\nкоманды'));
  assert.ok(value.includes('TRIGGER:-PT10M'));
  assert.ok(value.endsWith('END:VCALENDAR\r\n'));
});

test('workspace snapshot keeps actual binary attachments and drafts but removes temporary URLs', () => {
  const blob = new Blob(['recording'], { type: 'audio/webm' });
  const chats = [{ id: 'test', title: 'Чат', messages: [{ id: 'one', self: true, voice: { blob, url: 'blob:temporary', duration: 2 } }, { id: 'two', file: { href: '/assets/design-notes.txt', title: 'Заметки' } }] }];
  const snapshot = packWorkspace(chats, { test: 'Черновик' });
  assert.equal(snapshot.chats[0].messages[0].voice.blob, blob);
  assert.equal(snapshot.chats[0].messages[0].voice.url, undefined);
  assert.equal(snapshot.chats[0].messages[1].file.href, '/assets/design-notes.txt');
  assert.equal(snapshot.drafts.test, 'Черновик');
  assert.equal(chats[0].messages[0].voice.url, 'blob:temporary');
});

test('device and notification preferences recover safely from corrupt storage', () => {
  assert.deepEqual(normalizeDevicePreferences(null), { mic: 'default', camera: 'default', speaker: 'default' });
  assert.deepEqual(normalizeDevicePreferences({ mic: 'usb-mic', camera: 42, speaker: '' }), { mic: 'usb-mic', camera: 'default', speaker: 'default' });
  assert.deepEqual(normalizeNotifications(null), { sound: true, badges: true, reminders: false });
  assert.deepEqual(normalizeNotifications({ sound: false, badges: false, reminders: true }), { sound: false, badges: false, reminders: true });
});

test('text fallback preserves unavailable attachment messages and their place in history', () => {
  const blob = new Blob(['audio']);
  const snapshot = textWorkspace(packWorkspace([{ id: 'chat', title: 'Чат', messages: [{ id: 'file', file: { title: 'notes.txt', blob, url: 'blob:one' } }, { id: 'voice', voice: { duration: 5, blob, url: 'blob:two' } }] }], { chat: 'Черновик' }));
  assert.equal(snapshot.chats[0].messages.length, 2);
  assert.equal(snapshot.chats[0].messages[0].file.unavailable, true);
  assert.equal(snapshot.chats[0].messages[0].file.blob, undefined);
  assert.equal(snapshot.chats[0].messages[1].voice.duration, 5);
  assert.equal(snapshot.chats[0].messages[1].voice.unavailable, true);
  assert.equal(snapshot.drafts.chat, 'Черновик');
});
