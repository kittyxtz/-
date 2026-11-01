import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, clampTime, conflict, dayKey, getCode, makeCode, minimumTime, nextSlot, normalizeMeetings, parseDay, validateMeeting } from '../src/lib/meetings.js';

test('calendar validates leap days and preserves local dates', () => {
  assert.equal(parseDay('2026-02-29'), null);
  assert.equal(parseDay('2028-02-29')?.getDate(), 29);
  assert.equal(parseDay('2026-13-01'), null);
  assert.equal(parseDay('2026-1-01'), null);
  assert.equal(dayKey(parseDay('2026-10-29')), '2026-10-29');
});
test('month navigation clamps end-of-month dates', () => {
  assert.equal(dayKey(addMonths(parseDay('2026-01-31'), 1)), '2026-02-28');
  assert.equal(dayKey(addMonths(parseDay('2028-01-31'), 1)), '2028-02-29');
  assert.equal(dayKey(addMonths(parseDay('2026-12-31'), 1)), '2027-01-31');
});
test('meeting codes round-trip from invitations and reject malformed input', () => {
  assert.equal(getCode(' https://example.com/?room=AIR-KITE-482 '), 'air-kite-482');
  assert.equal(getCode('air-kite-482'), 'air-kite-482');
  assert.equal(getCode('https://example.com/air-kite-482'), null);
  assert.equal(getCode('broken-code'), null);
  assert.equal(getCode(makeCode()) !== null, true);
});
test('existing browser data is validated, sorted and preserved', () => {
  const valid = { title: 'Ранее созданная встреча', date: '2026-11-01T07:00:00.000Z', code: 'air-kite-482' };
  const second = { ...valid, code: 'sky-wave-100', date: '2026-11-02T07:00:00.000Z' };
  assert.deepEqual(normalizeMeetings([second, {}, null, valid, { ...valid, date: 'wrong' }, { ...valid, code: '<script>' }]), [valid, second]);
  assert.deepEqual(normalizeMeetings({}), []);
});
test('planning rejects empty titles, past dates and duplicate minutes', () => {
  const stamp = new Date('2026-10-29T12:00:00').getTime();
  const existing = [{ title: 'Планы', code: 'air-kite-482', date: new Date('2026-10-30T10:00:45').toISOString() }];
  assert.equal(validateMeeting(' ', '2026-10-30', '10:00', [], stamp).field, 'title');
  assert.equal(validateMeeting('Встреча', '2026-10-29', '11:59', [], stamp).field, 'time');
  assert.equal(validateMeeting('Встреча', '2026-02-30', '10:00', [], stamp).field, 'time');
  assert.equal(validateMeeting('Встреча', '2026-10-30', '', [], stamp).field, 'time');
  assert.match(validateMeeting('Встреча', '2026-10-30', '10:00', existing, stamp).message, /время занято/);
  assert.equal(conflict(existing, '2026-10-30T10:00:00'), existing[0]);
  assert.equal(validateMeeting('Встреча', '2026-10-30', '10:01', existing, stamp), null);
});
test('time selection blocks elapsed minutes and handles midnight', () => {
  const now = new Date('2026-10-29T23:59:00');
  assert.equal(minimumTime('2026-10-29', now), 1440);
  assert.equal(clampTime('23:59', '2026-10-29', now), '');
  assert.equal(clampTime('10:00', '2026-10-30', now), '10:00');
  assert.equal(clampTime('10:00', '2026-10-28', now), '');
  assert.deepEqual(nextSlot(now), { day: '2026-10-30', time: '01:00' });
  assert.equal(clampTime('10:00', '2026-10-29', new Date('2026-10-29T12:34:00')), '12:35');
});
