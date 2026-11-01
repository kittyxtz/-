import { chatDay } from './chatDates';

export const chatExamples = [
  { id: 'design', kind: 'meeting', isAdmin: true, ownerId: 'anna', adminIds: ['Вы'], title: 'Дизайн продукта', initials: 'ДП', tone: 'blue', unread: 2, time: '14:42', preview: 'Анна: Вот макеты', code: 'sky-wave-482', meeting: 'Разбор макетов', duration: '45 минут', participants: ['Анна Смирнова', 'Марк Волков', 'Вы'], messages: [
    { id: 'd1', author: 'Анна', authorId: 'anna', tone: 'lavender', text: 'Привет! Посмотрим новый экран на созвоне?', time: '14:30' },
    { id: 'd2', self: true, text: 'Да, макеты готовы. Покажу на встрече.', time: '14:32' },
    { id: 'd3', author: 'Марк', authorId: 'mark', tone: 'mint', text: 'И мобильную версию тоже посмотрим?', time: '14:35' },
    { id: 'd4', author: 'Анна', authorId: 'anna', tone: 'lavender', text: 'Вот макеты. Вопросы оставила в комментариях.', time: '14:42', file: { title: 'Макеты и комментарии.txt', detail: 'TXT · заметки к макетам', type: 'text/plain', href: '/assets/design-notes.txt' } },
  ] },
  { id: 'anna', kind: 'personal', title: 'Анна Смирнова', initials: 'АС', tone: 'lavender', unread: 1, time: '14:18', preview: 'Что думаешь про новое меню?', messages: [
    { id: 'a1', author: 'Анна', authorId: 'anna', tone: 'lavender', text: 'Привет! Добавила макеты в чат встречи.', time: '14:10' },
    { id: 'a2', self: true, text: 'Спасибо, сейчас открою.', time: '14:12' },
    { id: 'a3', author: 'Анна', authorId: 'anna', tone: 'lavender', text: 'Что думаешь про новое меню?', time: '14:18' },
  ] },
  { id: 'team', kind: 'meeting', ownerId: 'mark', adminIds: ['dasha'], title: 'Планы на неделю', initials: 'ПН', tone: 'mint', unread: 0, time: '12:05', preview: 'Вы: Тогда до понедельника', code: 'air-kite-216', meeting: 'Планы команды', duration: '30 минут', participants: ['Марк Волков', 'Даша Соколова', 'Вы'], messages: [
    { id: 't1', author: 'Марк', authorId: 'mark', tone: 'mint', text: 'Обсудим задачи в понедельник? Список уже готов.', time: '11:50' },
    { id: 't2', author: 'Даша', authorId: 'dasha', tone: 'rose', text: 'Да, подготовлю заметки.', time: '12:00' },
    { id: 't3', self: true, text: 'Тогда до понедельника.', time: '12:05' },
  ] },
  { id: 'mark', kind: 'personal', title: 'Марк Волков', initials: 'МВ', tone: 'mint', unread: 0, time: '11:32', preview: 'Спасибо, разобрался', messages: [
    { id: 'm1', author: 'Марк', authorId: 'mark', tone: 'mint', text: 'Где найти ссылку на встречу?', time: '11:25' },
    { id: 'm2', self: true, text: 'В чате «Дизайн продукта», над сообщениями.', time: '11:28' },
    { id: 'm3', author: 'Марк', authorId: 'mark', tone: 'mint', text: 'Спасибо, разобрался.', time: '11:32' },
  ] },
  { id: 'weekend', kind: 'meeting', ownerId: 'dasha', adminIds: [], title: 'Планы на выходные', initials: 'ПВ', tone: 'sand', unread: 0, time: 'Вчера', preview: 'Даша: Давайте в субботу', code: 'blue-wind-390', meeting: 'Куда поедем?', duration: 'Без лимита', participants: ['Даша Соколова', 'Илья Морозов', 'Вы'], messages: [
    { id: 'w1', author: 'Даша', authorId: 'dasha', tone: 'rose', text: 'Обсудим, куда поедем на выходных?', time: '18:10' },
    { id: 'w2', self: true, text: 'Да, созвонимся вечером.', time: '18:12' },
    { id: 'w3', author: 'Даша', authorId: 'dasha', tone: 'rose', text: 'Давайте в субботу.', time: '18:15' },
  ] },
  { id: 'dasha', kind: 'personal', title: 'Даша Соколова', initials: 'ДС', tone: 'rose', unread: 0, time: 'Вчера', preview: 'Вы: Отлично, договорились', messages: [
    { id: 's1', author: 'Даша', authorId: 'dasha', tone: 'rose', text: 'Буду свободна после шести. Созвонимся?', time: '17:20' },
    { id: 's2', self: true, delivery: 'read', text: 'Отлично, договорились.', time: '17:23' },
  ] },
].map(chat => ({ ...chat, messages: chat.messages.map(message => ({ ...message, day: chatDay(new Date(Date.now() - (['weekend', 'dasha'].includes(chat.id) ? 86400000 : 0))) })) }));

// Demo presence, independent of message timestamps; replace with server data when connected.
const presence = {
  anna: { online: true, gender: 'female' },
  mark: { online: false, gender: 'male', lastSeen: new Date(Date.now() - 18 * 60000).toISOString() },
  dasha: { online: false, gender: 'female', lastSeen: new Date(Date.now() - 86400000).toISOString() },
  ilya: { online: false, gender: 'male', lastSeen: new Date(Date.now() - 3 * 86400000).toISOString() },
};

export const chatContacts = [
  { id: 'anna', title: 'Анна Смирнова', initials: 'АС', tone: 'lavender', email: 'anna@example.com', phone: '+1 (202) 555-0148', username: 'anna_s', userId: '1042' },
  { id: 'mark', title: 'Марк Волков', initials: 'МВ', tone: 'mint', email: 'mark@example.com', username: 'mark_v', userId: '1086' },
  { id: 'dasha', title: 'Даша Соколова', initials: 'ДС', tone: 'rose', email: 'dasha@example.com', userId: '1123' },
  { id: 'ilya', title: 'Илья Морозов', initials: 'ИМ', tone: 'sand', email: 'ilya@example.com', username: 'ilya_m', userId: '1170' },
].map(contact => ({ ...contact, ...presence[contact.id] }));

// Example presence for the local interface; replace with server presence when connected.
export function exampleAttendees(code) {
  const chat = chatExamples.find(item => item.code === code);
  return (chat?.participants || []).filter(title => title !== 'Вы').map((title, index) => ({
    ...chatContacts.find(person => person.title === title), mic: index !== 0, camera: index === 0, sharing: index === 1,
  }));
}

