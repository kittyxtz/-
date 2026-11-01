import { chatDay } from './chatDates.js';
export const canDeleteMessage = (chat, message) => Boolean(message.self || chat.isAdmin);
export const messageAttachments = message => message.files || (message.file ? [message.file] : []);
export const messageActions = (chat, message) => [
  { id: 'reply', icon: 'reply', label: 'Ответить' },
  { id: 'forward', icon: 'forward', label: 'Переслать' },
  ...(!message.voice && (messageAttachments(message).length <= 1 || message.text) ? [{ id: 'copy', icon: 'copy', label: 'Скопировать' }] : []),
  { id: 'pin', icon: 'pin', label: message.pinned ? 'Открепить' : 'Закрепить' },
  ...(canDeleteMessage(chat, message) ? [{ id: 'delete', icon: 'trash', label: 'Удалить', danger: true }] : []),
  { id: 'select', icon: 'check', label: 'Выделить' },
];
export const messageSummary = message => message.voice ? 'Голосовое сообщение' : message.text || (message.files?.length ? `Вложения (${message.files.length})` : message.file?.title) || 'Сообщение';
export const quoteMessage = message => ({ id: message.id, author: message.self ? 'Вы' : message.author, text: messageSummary(message) });
export function outgoingMessage(content, now = new Date()) {
  return { ...content, id: crypto.randomUUID(), self: true, day: chatDay(now), time: new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }).format(now) };
}
export function forwardedMessage(message, now) {
  return outgoingMessage({ text: message.text || '', file: message.file, files: message.files, voice: message.voice, forwarded: message.forwarded || (message.self ? 'Вы' : message.author) }, now);
}
