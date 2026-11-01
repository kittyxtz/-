export function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function saveProfile({ name, bio, tone }) {
  const entries = [['sozvon-name', name], ['sozvon-bio', bio], ['sozvon-avatar', tone]];
  const previous = entries.map(([key]) => localStorage.getItem(key));
  try { entries.forEach(([key, value]) => write(key, value)); }
  catch (error) {
    entries.forEach(([key], index) => {
      try {
        if (previous[index] === null) localStorage.removeItem(key);
        else localStorage.setItem(key, previous[index]);
      } catch { /* Storage may remain unavailable. */ }
    });
    throw error;
  }
}
