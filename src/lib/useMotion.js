import { useEffect, useMemo } from 'react';
import { createMotionScope } from './motion';

export default function useMotion() {
  const scope = useMemo(() => createMotionScope(), []);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { if (media.matches) scope.clear(); };
    media.addEventListener('change', change);
    return () => { media.removeEventListener('change', change); scope.clear(); };
  }, [scope]);
  return scope;
}

export function usePressFeedback() {
  const motion = useMotion();
  useEffect(() => {
    const presses = new WeakMap();
    const click = event => {
      const control = event.target.closest?.('button,summary,a.primary-button');
      if (!control || control.matches('summary,.meeting-secondary-action,[data-press-feedback="css"]') || control.disabled || !control.isConnected || control.closest('.month-ghost,.scenario-ghost,.footer-ghost')) return;
      const target = control.matches('.month-day') ? control.querySelector('.month-day-number') : control.matches('[role=tab]') ? control.querySelector('.scenario-number>span') : control;
      if (!target) return;
      presses.get(target)?.cancel();
      const animation = motion.animate(target, [{ scale: '1' }, { scale: control.classList.contains('primary-button') ? '.975' : '.96', offset: .35 }, { scale: '1' }], { duration: 200, easing: 'cubic-bezier(.2,0,0,1)' });
      if (animation) presses.set(target, animation);
    };
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, [motion]);
}
