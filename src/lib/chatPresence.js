import { chatDay, chatDateLabel } from './chatDates.js';
import { participantCount } from './formatText.js';

export function contactPresenceLabel(contact, now = new Date()) {
  if (contact.online) return 'В сети';
  if (!contact.lastSeen) return 'Время посещения неизвестно';
  const seen = new Date(contact.lastSeen);
  if (!Number.isFinite(seen.getTime())) return 'Время посещения неизвестно';
  const prefix = contact.gender === 'female' ? 'Была в сети' : contact.gender === 'male' ? 'Был в сети' : 'Последний раз в сети';
  const day = chatDay(seen);
  const date = chatDateLabel(day, now).toLocaleLowerCase('ru-RU');
  const time = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' }).format(seen);
  return `${prefix} ${date} в ${time}`;
}

export function groupPresenceLabel(members) {
  const online = members.filter(member => member.online).length;
  return `${participantCount(members.length)}${online ? ` · ${online} в сети` : ''}`;
}
