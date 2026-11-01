import { read } from './storage.js';
export function normalizeNotifications(value) {
  return { sound: typeof value?.sound === 'boolean' ? value.sound : true, badges: typeof value?.badges === 'boolean' ? value.badges : true, reminders: typeof value?.reminders === 'boolean' ? value.reminders : false };
}
export const readNotifications = () => normalizeNotifications(read('sozvon-notifications', null));
