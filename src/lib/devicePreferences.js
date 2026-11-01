import { read } from './storage.js';

export function normalizeDevicePreferences(value) {
  const saved = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(['mic', 'camera', 'speaker'].map(key => [key, typeof saved[key] === 'string' && saved[key] ? saved[key] : 'default']));
}
export const readDevicePreferences = () => normalizeDevicePreferences(read('sozvon-devices', null));
export function selectedDevice(kind) {
  const id = readDevicePreferences()[kind];
  return id && id !== 'default' ? { deviceId: { ideal: id } } : {};
}
