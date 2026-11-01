import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { read, saveProfile } from '../src/lib/storage.js';

afterEach(() => { delete globalThis.localStorage; });
test('profile updates roll back all fields if persistence fails midway', () => {
  const initial = { 'sozvon-name': '"Анна"', 'sozvon-bio': '"Дизайнер"', 'sozvon-avatar': '"mint"' };
  const data = new Map(Object.entries(initial)); let failed = false;
  globalThis.localStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { if (key === 'sozvon-bio' && !failed) { failed = true; throw new Error('QuotaExceededError'); } data.set(key, value); },
    removeItem: key => data.delete(key),
  };
  assert.throws(() => saveProfile({ name: 'Новое имя', bio: 'Подпись', tone: 'blue' }));
  assert.deepEqual(Object.fromEntries(data), initial);
});
test('unavailable or corrupt storage falls back without crashing', () => {
  assert.deepEqual(read('missing', []), []);
  globalThis.localStorage = { getItem: () => '{bad json' };
  assert.equal(read('sozvon-name', ''), '');
});
