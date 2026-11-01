import { useCallback, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { pagerTarget } from './pagerGesture';

export default function useSwipeDismiss(ref, onDismiss, enabled, { swipeFromControls, onSwipeLeft, swipeItemSelector } = {}) {
  const latest = useRef(onDismiss), drag = useRef(null), closing = useRef(false), suppress = useRef(false), animation = useRef(null), handlers = useRef(null), revision = useRef(0);
  latest.current = onDismiss;
  useLayoutEffect(() => {
    if (drag.current?.mode === 'reply') clearReply(drag.current.node);
    revision.current++;
    closing.current = false; drag.current = null; suppress.current = false; animation.current?.cancel();
    if (ref.current) { ref.current.style.transform = ''; ref.current.style.animation = ''; }
    return () => { animation.current?.cancel(); ref.current?.querySelectorAll('.is-reply-dragging').forEach(clearReply); };
  }, [enabled]);
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const node = ref.current;
    if (!enabled || !node) { latest.current(); return; }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const style = getComputedStyle(node), from = style.transform, opacity = style.opacity;
    animation.current?.cancel();
    node.style.animation = 'none'; node.style.transform = from;
    animation.current = node.animate([{ transform: reduced ? 'none' : from, opacity }, { transform: reduced ? 'none' : 'translateX(100%)', opacity: reduced ? 0 : 1 }], { duration: reduced ? 100 : 220, easing: 'cubic-bezier(.2,0,0,1)', fill: 'forwards' });
    animation.current.onfinish = () => { flushSync(() => latest.current()); node.style.transform = ''; node.style.animation = ''; animation.current?.cancel(); closing.current = false; };
  }, [enabled, ref]);
  function clearReply(node) {
    if (!node) return;
    node.style.transform = ''; node.style.removeProperty('--reply-drag'); node.style.removeProperty('--reply-progress'); node.classList.remove('is-reply-dragging', 'is-reply-returning');
  }
  function restore(node = ref.current) {
    if (!node) return;
    const from = getComputedStyle(node).transform;
    const token = ++revision.current;
    if (node !== ref.current) node.classList.add('is-reply-returning');
    animation.current?.cancel(); node.style.transform = '';
    animation.current = node.animate([{ transform: from }, { transform: 'translateX(0)' }], { duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 220, easing: 'cubic-bezier(.2,0,0,1)' });
    if (node !== ref.current) animation.current.onfinish = () => { if (token === revision.current) clearReply(node); };
  }
  const bindings = {
    onPointerDown: event => {
      if (event.pointerType === 'touch') return;
      if (!enabled || closing.current || event.button !== 0 || event.isPrimary === false || event.target.closest('input,textarea,select,audio,video,[data-swipe-ignore],.horizontal-pager')) return;
      if (event.target.closest('button,a') && !(swipeFromControls && event.target.closest(swipeFromControls))) return;
      suppress.current = false;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, time: performance.now(), velocity: 0, dx: 0, offset: 0, active: false, item: swipeItemSelector ? event.target.closest(swipeItemSelector) : null, node: ref.current };
    },
    onPointerMove: event => {
      const state = drag.current;
      if (!state || state.id !== event.pointerId || closing.current) return;
      const dx = event.clientX - state.x, dy = event.clientY - state.y;
      if (!state.active && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; }
      if (!state.active && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.3 && (dx > 0 || (state.item && onSwipeLeft))) {
        revision.current++;
        state.mode = dx > 0 ? 'dismiss' : 'reply'; state.node = state.mode === 'reply' ? state.item : ref.current;
        ref.current.querySelectorAll('.is-reply-dragging').forEach(node => { if (node !== state.node) clearReply(node); });
        const transform = getComputedStyle(state.node).transform;
        state.offset = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
        state.active = true; suppress.current = true; animation.current?.cancel();
        if (state.mode === 'reply') { state.node.classList.remove('is-reply-returning'); state.node.classList.add('is-reply-dragging'); } else ref.current.style.animation = 'none';
        if (typeof event.pointerId === 'number') { try { ref.current.setPointerCapture(event.pointerId); } catch { /* Native touch events remain attached to their starting element. */ } }
      }
      if (state.active) {
        const now = performance.now(), elapsed = now - state.time;
        if (elapsed > 0) state.velocity = .7 * ((event.clientX - state.lastX) / elapsed) + .3 * state.velocity;
        state.lastX = event.clientX; state.time = now;
        if (state.mode === 'reply') {
          state.dx = Math.max(0, -dx);
          const distance = Math.min(80, state.dx * .7);
          state.node.style.transform = `translateX(-${distance}px)`;
          state.node.style.setProperty('--reply-drag', `${distance}px`);
          state.node.style.setProperty('--reply-progress', String(Math.min(1, state.dx / 60)));
        } else {
          state.dx = Math.max(0, Math.min(ref.current.clientWidth, state.offset + dx));
          ref.current.style.transform = `translateX(${state.dx}px)`;
        }
      }
    },
    onPointerUp: event => {
      const state = drag.current;
      if (!state || state.id !== event.pointerId) return;
      drag.current = null;
      if (!state.active) return;
      const velocity = performance.now() - state.time > 100 ? 0 : state.velocity;
      if (state.mode === 'reply') {
        restore(state.node);
        if (pagerTarget(0, 2, -state.dx, 240, velocity) === 1) onSwipeLeft?.(state.item.dataset.messageId);
        return;
      }
      if (pagerTarget(0, 2, -state.dx, Math.min(ref.current.clientWidth, 400), -velocity) === 1) close();
      else restore();
    },
    onPointerCancel: event => { const state = drag.current; if (state?.id !== event.pointerId) return; drag.current = null; suppress.current = false; if (state.active) restore(state.node); },
    onClickCapture: event => { if (suppress.current && event.detail !== 0) { suppress.current = false; event.preventDefault(); event.stopPropagation(); } },
    onDragStart: event => { if (enabled && swipeFromControls && event.target.closest(swipeFromControls)) event.preventDefault(); },
  };
  handlers.current = bindings;
  useLayoutEffect(() => {
    const node = ref.current;
    if (!enabled || !node) return;
    const adapt = (event, touch) => ({ target: event.target, pointerId: `touch-${touch.identifier}`, pointerType: 'native-touch', button: 0, isPrimary: true, clientX: touch.clientX, clientY: touch.clientY });
    const activeTouch = event => Array.from(event.changedTouches || []).find(touch => drag.current?.id === `touch-${touch.identifier}`);
    const start = event => {
      if (event.touches.length !== 1) { if (drag.current?.active) restore(drag.current.node); drag.current = null; return; }
      handlers.current.onPointerDown(adapt(event, event.changedTouches[0]));
    };
    const move = event => {
      const touch = activeTouch(event);
      if (!touch) return;
      handlers.current.onPointerMove(adapt(event, touch));
      if (drag.current?.active && event.cancelable) event.preventDefault();
    };
    const end = event => {
      const touch = activeTouch(event);
      if (!touch) return;
      const moved = drag.current.active;
      handlers.current.onPointerUp(adapt(event, touch));
      if (moved && event.cancelable) event.preventDefault();
    };
    const cancel = event => { const touch = activeTouch(event); if (touch) handlers.current.onPointerCancel(adapt(event, touch)); };
    node.addEventListener('touchstart', start, { passive: true });
    node.addEventListener('touchmove', move, { passive: false });
    node.addEventListener('touchend', end, { passive: false });
    node.addEventListener('touchcancel', cancel, { passive: true });
    return () => { node.removeEventListener('touchstart', start); node.removeEventListener('touchmove', move); node.removeEventListener('touchend', end); node.removeEventListener('touchcancel', cancel); };
  }, [enabled, ref]);
  return { close, bindings };
}
