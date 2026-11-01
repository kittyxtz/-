import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { resolveTheme, themeMode } from './themes';
import useMonet from './useMonet';

export default function useTheme() {
  const [theme, setTheme] = useState(() => resolveTheme(document.documentElement.dataset.themePreset || document.documentElement.dataset.theme).id);
  const monet = useMonet(theme === 'monet-system');
  const dark = themeMode(theme, monet.systemDark) === 'dark';
  const target = useRef(theme), active = useRef(null), version = useRef(0), frames = useRef([]), fallbackTimer = useRef(null), mounted = useRef(true);
  useLayoutEffect(() => {
    const selected = resolveTheme(theme);
    document.documentElement.dataset.theme = themeMode(theme, monet.systemDark);
    document.documentElement.dataset.themePreset = selected.id;
    document.querySelector('meta[name="theme-color"]').content = theme === 'monet-system' ? getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() : selected.color;
  }, [theme, monet.systemDark, monet.seed]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; version.current++;
      active.current?.skipTransition();
      frames.current.forEach(cancelAnimationFrame); clearTimeout(fallbackTimer.current);
      document.documentElement.classList.remove('theme-changing', 'theme-color-fade');
    };
  }, []);
  const selectTheme = useCallback(id => {
    const next = resolveTheme(id).id;
    if (next === target.current) return;
    const root = document.documentElement, request = ++version.current;
    target.current = next;
    active.current?.skipTransition(); active.current = null;
    frames.current.forEach(cancelAnimationFrame); clearTimeout(fallbackTimer.current);
    root.classList.remove('theme-changing', 'theme-color-fade');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const apply = (snapshot = false) => {
      if (!mounted.current || request !== version.current) return;
      if (snapshot || reduced) root.classList.add('theme-changing');
      flushSync(() => setTheme(next));
      try { localStorage.setItem('sozvon-theme', next); } catch { /* Keep the preference for this session. */ }
      void root.offsetHeight;
      frames.current = [requestAnimationFrame(() => {
        frames.current.push(requestAnimationFrame(() => { if (request === version.current) root.classList.remove('theme-changing'); }));
      })];
    };
    if (!reduced && typeof document.startViewTransition === 'function') {
      try {
        const transition = document.startViewTransition(() => apply(true));
        active.current = transition;
        transition.ready.catch(() => {});
        transition.finished.then(() => { if (active.current === transition) active.current = null; }, () => { if (active.current === transition) active.current = null; });
        return;
      } catch { /* Older browser engines use color interpolation. */ }
    }
    if (!reduced) { root.classList.add('theme-color-fade'); void root.offsetHeight; }
    apply();
    fallbackTimer.current = setTimeout(() => { if (request === version.current) root.classList.remove('theme-color-fade'); }, 480);
  }, []);
  const toggleTheme = useCallback(() => selectTheme(resolveTheme(target.current).mode === 'dark' ? 'light' : 'dark'), [selectTheme]);
  return { theme, dark, selectTheme, toggleTheme, monet };
}
