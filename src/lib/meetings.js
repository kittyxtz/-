export const pad = value => String(value).padStart(2, '0');
export const dayKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export function parseDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return dayKey(date) === value ? date : null;
}
export function addMonths(date, offset) {
  const next = new Date(date.getFullYear(), date.getMonth() + offset, 1, 12);
  next.setDate(Math.min(date.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  return next;
}
export const formatDate = (date, options) => new Intl.DateTimeFormat('ru-RU', options).format(date);
export const formatDay = key => formatDate(parseDay(key), { day: 'numeric', month: 'long', year: 'numeric' });
export const plural = count => `${count} ${{ one: 'встреча', few: 'встречи' }[new Intl.PluralRules('ru-RU').select(count)] || 'встреч'}`;
export const codePattern = /^[a-z0-9]{2,12}-[a-z0-9]{2,12}-\d{3}$/i;
export function getCode(value) {
  let code = value.trim();
  try { code = new URL(code).searchParams.get('room') || ''; } catch { /* A bare code is valid too. */ }
  return codePattern.test(code) ? code.toLowerCase() : null;
}
export function makeCode() {
  const words = ['air', 'sky', 'wave', 'kite', 'wind', 'blue', 'flow', 'cloud'];
  const random = crypto.getRandomValues(new Uint16Array(3));
  return `${words[random[0] % words.length]}-${words[random[1] % words.length]}-${100 + random[2] % 900}`;
}
export function meetingUrl(code) {
  const url = new URL('./', location.href);
  url.searchParams.set('room', code);
  return url.href;
}
export function normalizeMeetings(data) {
  return (Array.isArray(data) ? data : []).filter(item => item && typeof item.title === 'string' && codePattern.test(item.code) && Number.isFinite(Date.parse(item.date))).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}
export function conflict(items, date) {
  const minute = Math.floor(new Date(date).getTime() / 60000);
  return items.find(item => Math.floor(Date.parse(item.date) / 60000) === minute);
}
export function nextSlot(now = new Date()) {
  const date = new Date(now.getTime() + 3600000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return { day: dayKey(date), time: `${pad(date.getHours())}:${pad(date.getMinutes())}` };
}
export function minimumTime(day, now = new Date()) {
  return day < dayKey(now) ? 1440 : day > dayKey(now) ? 0 : now.getHours() * 60 + now.getMinutes() + 1;
}
export function clampTime(value, day, now = new Date()) {
  const minimum = minimumTime(day, now);
  if (minimum >= 1440) return '';
  const [hour, minute] = (value || '10:00').split(':').map(Number);
  const total = Number.isFinite(hour * 60 + minute) ? hour * 60 + minute : 0;
  const result = Math.max(minimum, total);
  return `${pad(Math.floor(result / 60))}:${pad(result % 60)}`;
}
export function validateMeeting(title, day, time, items, now = Date.now()) {
  if (!title.trim()) return { field: 'title', message: 'Введите название встречи.' };
  const date = new Date(`${day}T${time}`);
  if (!parseDay(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isFinite(date.getTime()) || date.getTime() <= now) return { field: 'time', message: 'Выберите дату и время в будущем.' };
  if (conflict(items, date)) return { field: 'time', message: 'Это время занято. Выберите другое время.' };
  return null;
}
