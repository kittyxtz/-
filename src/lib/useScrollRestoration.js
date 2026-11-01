import { useEffect } from 'react';

export default function useScrollRestoration() {
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (matchMedia('(max-width: 760px)').matches) return;
    const key = `sozvon-scroll:${location.pathname}`;
    let frame, ready = false, disposed = false;
    const save = () => { if (ready) { try { sessionStorage.setItem(key, String(scrollY)); } catch { /* Optional persistence. */ } } };
    const scroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(save); };
    document.fonts.ready.then(() => {
      if (disposed) return;
      frame = requestAnimationFrame(() => {
        const kind = performance.getEntriesByType('navigation')[0]?.type;
        if (kind === 'reload' || kind === 'back_forward') {
          try { window.scrollTo({ top: Number(sessionStorage.getItem(key)) || 0, behavior: 'instant' }); } catch { /* Storage is optional. */ }
        }
        ready = true;
      });
    });
    window.addEventListener('scroll', scroll, { passive: true }); window.addEventListener('pagehide', save);
    return () => { disposed = true; cancelAnimationFrame(frame); save(); window.removeEventListener('scroll', scroll); window.removeEventListener('pagehide', save); };
  }, []);
}
