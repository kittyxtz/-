import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

export function pageAt(pathname) {
  return pathname.endsWith('/meeting.html') ? 'meeting' : pathname.endsWith('/chats.html') ? 'chats' : pathname.endsWith('/auth.html') ? 'auth' : pathname.endsWith('/guest.html') ? 'guest' : pathname.endsWith('/profile.html') ? 'profile' : pathname.endsWith('/meetings.html') ? 'meetings' : 'home';
}
export default function usePageNavigation() {
  const [page, setPage] = useState(() => pageAt(location.pathname)), [version, setVersion] = useState(0), [target, setTarget] = useState(null);
  const view = useRef(null), animation = useRef(null), generation = useRef(0), current = useRef(page), selected = useRef(page);
  current.current = page;
  useEffect(() => {
    const pop = () => {
      generation.current++; animation.current?.cancel();
      window.dispatchEvent(new Event('sozvon-profile-close')); window.dispatchEvent(new Event('sozvon-route-change'));
      const next = pageAt(location.pathname); selected.current = next; setTarget(null); setPage(next); setVersion(value => value + 1);
    };
    window.addEventListener('popstate', pop);
    return () => { window.removeEventListener('popstate', pop); generation.current++; animation.current?.cancel(); };
  }, []);
  async function change(next, commit, profile = false) {
    const token = ++generation.current, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    selected.current = next; setTarget(next);
    const node = document.querySelector('.chat-identity-view') || view.current;
    const style = node && getComputedStyle(node), from = { opacity: style?.opacity || 1 };
    animation.current?.cancel();
    const out = node?.animate([from, { opacity: 0 }], { duration: reduced ? 90 : 140, easing: 'ease-out', fill: 'forwards' });
    animation.current = out;
    try { await out?.finished; } catch { return; }
    if (token !== generation.current) return;
    flushSync(commit);
    if (profile) {
      setTimeout(() => { out?.cancel(); if (token === generation.current) setTarget(null); }, reduced ? 110 : 300);
      return;
    }
    out?.cancel();
    const incoming = view.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 110 : 220, easing: 'cubic-bezier(.2,0,0,1)' });
    animation.current = incoming;
    try { await incoming?.finished; } catch { return; }
    if (token === generation.current) setTarget(null);
  }
  function navigateTab(href) {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) { location.assign(url.href); return; }
    const next = pageAt(url.pathname);
    if (next === 'profile' && !url.searchParams.has('returnTo') && current.current !== 'profile') url.searchParams.set('returnTo', location.pathname + location.search);
    change(next, () => {
      window.dispatchEvent(new Event('sozvon-profile-close')); window.dispatchEvent(new Event('sozvon-route-change'));
      history.pushState({ sozvonTab: true }, '', url.pathname + url.search + url.hash);
      document.body.className = next === 'home' ? '' : `${next}-page`;
      setPage(next); setVersion(value => value + 1); window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  }
  function openProfileTab(open) { change('self', open, true); }
  function settleNavigation() { generation.current++; animation.current?.cancel(); selected.current = current.current; setTarget(null); }
  return { page, version, target, view, navigateTab, openProfileTab, settleNavigation };
}
