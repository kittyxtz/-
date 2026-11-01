import { chatDay } from './chatDates.js';
export const canDeleteMessage = (chat, message) => Boolean(message.self || chat.isAdmin);
export const messageSummary = message => message.voice ? 'Голосовое сообщение' : message.text || message.file?.title || 'Сообщение';
export const quoteMessage = message => ({ id: message.id, author: message.self ? 'Вы' : message.author, text: messageSummary(message) });
export function outgoingMessage(content, now = new Date()) {
  return { ...content, id: crypto.randomUUID(), self: true, day: chatDay(now), time: new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }).format(now) };
}
export function forwardedMessage(message, now) {
  return outgoingMessage({ text: message.text || '', file: message.file, voice: message.voice, forwarded: message.forwarded || (message.self ? 'Вы' : message.author) }, now);
}
