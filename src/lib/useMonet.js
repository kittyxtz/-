import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { defaultMonetSeed, monetTokens } from './monet';

function systemAccent() {
  if (!CSS.supports('color', 'AccentColor')) return null;
  const probe = document.createElement('span');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;color:AccentColor;color-scheme:light dark';
  document.documentElement.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  const channels = value.match(/^rgb\((\d+)[, ]+(\d+)[, ]+(\d+)\)$/);
  return channels ? `#${channels.slice(1).map(n => Number(n).toString(16).padStart(2, '0')).join('')}` : null;
}

export default function useMonet(active) {
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const [accent, setAccent] = useState(null);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => { setSystemDark(media.matches); setAccent(systemAccent()); };
    update();
    media.addEventListener('change', update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      media.removeEventListener('change', update);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  const seed = accent || defaultMonetSeed;
  const tokens = useMemo(() => monetTokens(seed, systemDark), [seed, systemDark]);
  useLayoutEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value));
    return () => Object.keys(tokens).forEach(key => root.style.removeProperty(key));
  }, [active, tokens]);
  return { systemDark, seed, systemAccentAvailable: Boolean(accent) };
}
