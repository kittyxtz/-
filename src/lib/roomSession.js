import { getCode } from './meetings.js';

const destinations = { chats: './chats.html', home: './', guest: './guest.html', meetings: './meetings.html', profile: './profile.html' };
export function roomUrl(meeting, base) {
  const url = new URL('./meeting.html', base);
  url.searchParams.set('room', meeting.code); url.searchParams.set('title', meeting.title);
  return url.href;
}
export function storeRoom(meeting, devices, from, storage) {
  try { storage.setItem(`sozvon-room:${meeting.code}`, JSON.stringify({ ...meeting, devices, from })); } catch { /* The URL still opens the room without session storage. */ }
}
export function readRoom(params, fallbackName, storage) {
  const code = getCode(params.get('room') || '');
  if (!code) return null;
  let saved;
  try { saved = JSON.parse(storage.getItem(`sozvon-room:${code}`)); } catch { /* Use the invitation when saved data is unavailable. */ }
  return {
    code, title: typeof saved?.title === 'string' ? saved.title : params.get('title')?.trim() || 'Встреча',
    name: typeof saved?.name === 'string' && saved.name.trim() ? saved.name.trim() : fallbackName.trim() || 'Гость',
    devices: { mic: saved?.devices?.mic === true, camera: saved?.devices?.camera === true },
    attendees: Array.isArray(saved?.attendees) ? saved.attendees.filter(person => person && typeof person.id === 'string' && typeof person.title === 'string') : [],
    returnTo: Object.hasOwn(destinations, saved?.from) ? destinations[saved.from] : './chats.html',
  };
}
