import { useLayoutEffect, useRef, useState } from 'react';

export default function useChatScroll(ref, scope, messages, active, ready) {
  const [highlighted, setHighlighted] = useState(null);
  const following = useRef(true), bottomFrame = useRef(null), jumpFrame = useRef(null), highlightTimer = useRef(null), previousCount = useRef(messages.length);
  function cancelJump() {
    cancelAnimationFrame(jumpFrame.current); jumpFrame.current = null;
    clearTimeout(highlightTimer.current); highlightTimer.current = null;
  }
  function toBottom() {
    if (following.current && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }
  useLayoutEffect(() => {
    const node = ref.current;
    cancelJump(); setHighlighted(null); following.current = true;
    if (!node || !active || !ready) return;
    toBottom(); bottomFrame.current = requestAnimationFrame(toBottom);
    let mounted = true, touchY = null;
    document.fonts?.ready.then(() => { if (mounted) toBottom(); });
    const observer = new ResizeObserver(toBottom);
    observer.observe(node);
    const content = node.querySelector('.chat-message-stack'); if (content) observer.observe(content);
    const scroll = () => { if (jumpFrame.current === null) following.current = node.scrollHeight - node.clientHeight - node.scrollTop <= 12; };
    const stopFollowing = () => { following.current = false; cancelJump(); setHighlighted(null); };
    const wheel = event => { if (event.deltaY) stopFollowing(); };
    const touchStart = event => { touchY = event.touches[0]?.clientY ?? null; };
    const touchMove = event => { if (touchY !== null && event.touches[0] && Math.abs(event.touches[0].clientY - touchY) > 10) stopFollowing(); };
    node.addEventListener('scroll', scroll, { passive: true });
    node.addEventListener('wheel', wheel, { passive: true });
    node.addEventListener('touchstart', touchStart, { passive: true });
    node.addEventListener('touchmove', touchMove, { passive: true });
    return () => {
      mounted = false; observer.disconnect(); cancelAnimationFrame(bottomFrame.current); cancelJump();
      node.removeEventListener('scroll', scroll); node.removeEventListener('wheel', wheel); node.removeEventListener('touchstart', touchStart); node.removeEventListener('touchmove', touchMove);
    };
  }, [scope, active, ready]);
  useLayoutEffect(() => {
    if (messages.length > previousCount.current && messages.at(-1)?.self) { cancelJump(); setHighlighted(null); following.current = true; }
    previousCount.current = messages.length;
    if (active && ready) toBottom();
  }, [messages.length, active, ready]);
  function reveal(id) {
    const node = ref.current;
    const message = Array.from(node?.querySelectorAll('[data-message-id]') || []).find(item => item.dataset.messageId === id);
    if (!node || !message) return false;
    cancelJump(); setHighlighted(null); following.current = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targetTop = () => {
      const bounds = message.getBoundingClientRect(), frame = node.getBoundingClientRect();
      return Math.max(0, Math.min(node.scrollHeight - node.clientHeight, node.scrollTop + bounds.top - frame.top - (node.clientHeight - Math.min(bounds.height, node.clientHeight)) / 2));
    };
    let destination = targetTop();
    const started = performance.now();
    node.scrollTo({ top: destination, behavior: reduced ? 'instant' : 'smooth' });
    const arrive = () => {
      jumpFrame.current = null;
      if (!message.isConnected) return;
      const next = targetTop();
      if (Math.abs(next - destination) > 2) { destination = next; node.scrollTo({ top: destination, behavior: reduced ? 'instant' : 'smooth' }); }
      if (Math.abs(node.scrollTop - destination) <= 2 || performance.now() - started > 2000) {
        setHighlighted(id); message.querySelector('.chat-bubble')?.focus({ preventScroll: true });
        highlightTimer.current = setTimeout(() => { setHighlighted(null); highlightTimer.current = null; }, 1000);
      } else jumpFrame.current = requestAnimationFrame(arrive);
    };
    jumpFrame.current = requestAnimationFrame(arrive);
    return true;
  }
  return { highlighted, reveal };
}
