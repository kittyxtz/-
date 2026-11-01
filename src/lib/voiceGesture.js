export function voiceGestureProgress(origin, point) {
  return {
    left: Math.max(0, Math.min(1, (origin.x - point.x) / 96)),
    up: Math.max(0, Math.min(1, (origin.y - point.y) / 60)),
  };
}

export function createVoiceGesture(actions, timers = { set: (callback, delay) => globalThis.setTimeout(callback, delay), clear: id => globalThis.clearTimeout(id) }) {
  let phase = 'idle', input = null, origin = null, timer = null;
  const clear = () => { if (timer !== null) timers.clear(timer); timer = null; };
  const change = next => { phase = next; actions.change(next); };
  const gesture = {
    get phase() { return phase; },
    get input() { return input; },
    begin(id, point = null) {
      if (phase !== 'idle') return false;
      input = id; origin = point; actions.progress?.({ left: 0, up: 0 }); change('holding'); actions.start(); return true;
    },
    move(id, point) {
      if (id !== input || !origin || !['holding', 'locking'].includes(phase)) return;
      const left = origin.x - point.x, up = origin.y - point.y;
      actions.progress?.(voiceGestureProgress(origin, point));
      if (left >= 96 && left >= up) { gesture.cancel(); return; }
      if (up >= 60) {
        if (phase === 'holding') { change('locking'); timer = timers.set(() => gesture.lock(), 350); }
      } else if (phase === 'locking') { clear(); change('holding'); }
    },
    lock() {
      if (!['holding', 'locking'].includes(phase)) return;
      clear(); actions.progress?.({ left: 0, up: 1 }); change('locked');
    },
    release(id) {
      if (id !== input) return;
      input = null;
      if (phase === 'locked') return;
      if (['holding', 'locking'].includes(phase)) gesture.send();
    },
    send() {
      if (!['holding', 'locking', 'locked'].includes(phase)) return;
      clear(); input = null; change('sending'); actions.send();
    },
    cancel() {
      if (phase === 'idle') return;
      clear(); input = null; change('idle'); actions.cancel();
    },
    reset() { clear(); input = null; origin = null; actions.progress?.({ left: 0, up: 0 }); if (phase !== 'idle') change('idle'); },
  };
  return gesture;
}
