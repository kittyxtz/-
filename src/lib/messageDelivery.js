const states = {
  pending: { icon: 'clock', label: 'Не отправлено — ожидает соединения' },
  sent: { icon: 'check', label: 'Отправлено, не прочитано' },
  read: { icon: 'double-check', label: 'Прочитано' },
};

export function messageDelivery(message) {
  return message?.self ? states[message.delivery] || states.sent : null;
}

export function markPendingSent(messages) {
  return messages.map(message => message.self && message.delivery === 'pending' ? { ...message, delivery: 'sent' } : message);
}
