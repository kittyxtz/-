import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsHref, settingsReturn } from '../src/lib/settingsNavigation.js';

test('settings preserve the source page with its query and section through reloads', () => {
  const source = 'http://localhost/meetings.html?day=2026-11-02#day-agenda';
  const settings = settingsHref('appearance', source);
  const target = settingsReturn(settings, source.split('#')[0]);
  assert.equal(target.href, source); assert.equal(target.label, 'В «Мои встречи»'); assert.equal(target.canGoBack, true);
  const nextSection = settingsHref('privacy', settings);
  assert.equal(settingsReturn(nextSection).href, source);
  assert.equal(new URL(nextSection).hash, '#privacy');
});
test('chat and room return links name their actual destination', () => {
  const chats = 'http://localhost/chats.html';
  assert.equal(settingsReturn(settingsHref('', chats), chats).label, 'В чаты');
  const room = 'http://localhost/meeting.html?room=sky-wave-482&title=Разбор%20макетов';
  assert.equal(settingsReturn(settingsHref('', room), room).label, 'В «Разбор макетов»');
});
test('external, unknown and settings-only origins fall back to a safe local page', () => {
  for (const source of ['https://example.com/chats.html', '/unknown.html', '/profile.html#privacy', 'javascript:alert(1)']) {
    const current = `http://localhost/profile.html?returnTo=${encodeURIComponent(source)}`;
    assert.deepEqual(settingsReturn(current), { href: 'http://localhost/', label: 'На главную', canGoBack: false });
  }
  assert.equal(settingsReturn('http://localhost/profile.html', 'http://localhost/chats.html').href, 'http://localhost/chats.html');
});
