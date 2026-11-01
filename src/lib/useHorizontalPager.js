import { useLayoutEffect, useRef } from 'react';
import { pagerTarget } from './pagerGesture';

export default function useHorizontalPager({ index, count, onChange, onSettled, canChange, resetKey, enabled = true }) {
  const viewport = useRef(null), track = useRef(null), animation = useRef(null), drag = useRef(null), suppress = useRef(false), generation = useRef(0);
  const latest = useRef(null), previousKey = useRef(resetKey), initialized = useRef(false), wasEnabled = useRef(false);
  latest.current = { index, count, onChange, onSettled, canChange };
  const position = () => {
    const transform = getComputedStyle(track.current).transform;
    return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
  };
  function snap(next, immediate = false) {
    const node = track.current, width = viewport.current?.clientWidth;
    if (!node || !width) return;
    const from = position(), to = -next * width, token = ++generation.current;
    animation.current?.cancel(); node.style.transform = `translateX(${to}px)`;
    if (immediate || Math.abs(from - to) < .5) { animation.current = null; if (!immediate) latest.current.onSettled?.(next); return; }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const run = node.animate(reduced ? [{ opacity: .35 }, { opacity: 1 }] : [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }], { duration: reduced ? 120 : 300, easing: 'cubic-bezier(.2,0,0,1)' });
    animation.current = run;
    run.finished.then(() => { if (token === generation.current) { animation.current = null; latest.current.onSettled?.(next); } }, () => {});
  }
  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node || !enabled) return;
    let width = node.clientWidth;
    const observer = new ResizeObserver(() => { if (width !== node.clientWidth) { width = node.clientWidth; snap(latest.current.index, true); } });
    observer.observe(node);
    return () => { observer.disconnect(); generation.current++; animation.current?.cancel(); drag.current = null; };
  }, [enabled, count]);
  useLayoutEffect(() => {
    const reset = !initialized.current || !wasEnabled.current || previousKey.current !== resetKey;
    previousKey.current = resetKey; initialized.current = true; wasEnabled.current = enabled;
    if (enabled) snap(index, reset);
  }, [index, count, resetKey, enabled]);
  function finish(event, cancelled = false) {
    const state = drag.current; drag.current = null;
    if (!state?.active || state.id !== event.pointerId) return;
    const velocity = performance.now() - state.time > 100 ? 0 : state.velocity;
    let next = cancelled ? latest.current.index : pagerTarget(latest.current.index, latest.current.count, event.clientX - state.x, state.width, velocity);
    if (latest.current.canChange?.(next) === false) next = latest.current.index;
    if (next === latest.current.index) snap(next); else latest.current.onChange(next);
  }
  return { viewport, track, bindings: {
    onPointerDown(event) {
      if (!enabled || count < 2 || event.button !== 0 || event.isPrimary === false || event.target.closest('input,textarea,select,audio,video,[data-pager-ignore]')) return;
      event.stopPropagation();
      suppress.current = false;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, time: performance.now(), velocity: 0, width: event.currentTarget.clientWidth, active: false, position: 0 };
    },
    onPointerMove(event) {
      const state = drag.current;
      if (!state || state.id !== event.pointerId) return;
      const dx = event.clientX - state.x, dy = event.clientY - state.y, now = performance.now();
      if (!state.active && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; }
      if (!state.active && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        state.active = true; suppress.current = true; state.position = position();
        generation.current++; animation.current?.cancel(); animation.current = null;
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer events still finish the gesture inside the viewport. */ }
      }
      if (state.active) {
        event.stopPropagation();
        const elapsed = now - state.time;
        if (elapsed > 0) state.velocity = .7 * ((event.clientX - state.lastX) / elapsed) + .3 * state.velocity;
        state.lastX = event.clientX; state.time = now;
        let next = state.position + dx;
        const minimum = -(latest.current.count - 1) * state.width;
        if (next > 0) next *= .25;
        if (next < minimum) next = minimum + (next - minimum) * .25;
        track.current.style.transform = `translateX(${next}px)`;
      }
    },
    onPointerUp: event => finish(event),
    onPointerCancel: event => { finish(event, true); suppress.current = false; },
    onClickCapture(event) { if (suppress.current && event.detail !== 0) { suppress.current = false; event.preventDefault(); event.stopPropagation(); } },
    onDragStart: event => event.preventDefault(),
  } };
}
