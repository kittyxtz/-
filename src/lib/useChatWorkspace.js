import { useEffect, useRef, useState } from 'react';
import { read, write } from './storage.js';

const fallbackKey = 'sozvon-chat-workspace';
let database;
function openWorkspace() {
  if (!database) database = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
    const request = indexedDB.open('sozvon-local-design', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('workspace');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return database;
}
function validSnapshot(value) {
  return value && Array.isArray(value.chats) && value.chats.every(chat => typeof chat.id === 'string' && typeof chat.title === 'string' && Array.isArray(chat.messages));
}
export async function readChatWorkspace() {
  const fallback = () => { const value = read(fallbackKey, null); return validSnapshot(value) ? value : null; };
  try {
    const db = await openWorkspace();
    const snapshot = await new Promise((resolve, reject) => { const request = db.transaction('workspace').objectStore('workspace').get('snapshot'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    return validSnapshot(snapshot) ? snapshot : fallback();
  } catch { return fallback(); }
}
export function packWorkspace(chats, drafts) {
  return { chats: chats.map(chat => ({ ...chat, messages: chat.messages.map(message => ({ ...message,
    ...(message.file?.blob ? { file: { ...message.file, url: undefined } } : {}),
    ...(message.voice?.blob ? { voice: { ...message.voice, url: undefined } } : {}),
  })) })), drafts };
}
export function textWorkspace(snapshot) {
  return { ...snapshot, chats: snapshot.chats.map(chat => ({ ...chat, messages: chat.messages.map(message => {
    const copy = { ...message };
    for (const field of ['file', 'voice']) if (message[field]?.blob) copy[field] = { ...message[field], blob: undefined, url: undefined, unavailable: true };
    return copy;
  }) })) };
}
export default function useChatWorkspace(initial) {
  const [chats, setChats] = useState(initial), [drafts, setDrafts] = useState({});
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  const urls = useRef(new Set()), version = useRef(0);
  useEffect(() => {
    let active = true;
    const restore = snapshot => {
      if (!active || !validSnapshot(snapshot)) return;
      setChats(snapshot.chats.map(chat => ({ ...chat, messages: chat.messages.map(message => {
        const copy = { ...message };
        for (const field of ['file', 'voice']) if (message[field]?.blob instanceof Blob) {
          const url = URL.createObjectURL(message[field].blob); urls.current.add(url); copy[field] = { ...message[field], url };
        }
        return copy;
      }) })));
      setDrafts(snapshot.drafts && typeof snapshot.drafts === 'object' ? snapshot.drafts : {});
    };
    openWorkspace().then(db => new Promise((resolve, reject) => {
      const request = db.transaction('workspace').objectStore('workspace').get('snapshot');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    })).then(snapshot => restore(snapshot || read(fallbackKey, null))).catch(() => restore(read(fallbackKey, null))).finally(() => { if (active) setReady(true); });
    return () => { active = false; urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear(); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const revision = ++version.current, snapshot = packWorkspace(chats, drafts);
    // A synchronous text fallback protects drafts if the tab closes before IndexedDB commits.
    try { write(fallbackKey, textWorkspace(snapshot)); } catch { /* The full workspace is saved below. */ }
    openWorkspace().then(db => new Promise((resolve, reject) => {
      const transaction = db.transaction('workspace', 'readwrite');
      transaction.objectStore('workspace').put(snapshot, 'snapshot');
      transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error);
    })).then(() => { if (revision === version.current) setError(''); }).catch(() => { if (revision === version.current) setError('Не удалось сохранить изменения в браузере. Не закрывайте вкладку и проверьте, разрешено ли хранение данных.'); });
  }, [chats, drafts, ready]);
  return { chats, setChats, drafts, setDrafts, ready, error };
}
