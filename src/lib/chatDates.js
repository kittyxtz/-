const zone = 'Europe/Moscow';
export function chatDay(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function chatDateLabel(day, now = new Date()) {
  if (day === chatDay(now)) return 'Сегодня';
  if (day === chatDay(new Date(now.getTime() - 86400000))) return 'Вчера';
  return new Intl.DateTimeFormat('ru-RU', { timeZone: zone, day: 'numeric', month: 'long', ...(day.slice(0, 4) !== chatDay(now).slice(0, 4) ? { year: 'numeric' } : {}) }).format(new Date(`${day}T12:00:00+03:00`));
}
export function startsChatDay(messages, index) {
  return index === 0 || messages[index].day !== messages[index - 1].day;
}
