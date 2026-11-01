import { useEffect } from 'react';
import useMotion from './useMotion';

export default function useRevealMotion() {
  const motion = useMotion();
  useEffect(() => {
    if (!motion.enabled || !('IntersectionObserver' in window)) return;
    const nodes = [...document.querySelectorAll('main .scenario-intro, main .scenario-panel, main .studio-copy, main .device-preview-window, main .landing-invitation, main .profile-heading, main .profile-preview, main .profile-panel, main .calendar-page-heading, main .calendar-board, main .day-agenda, .site-footer .footer-main')];
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        motion.animate(entry.target, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 520, delay: nodes.indexOf(entry.target) % 2 * 65, easing: 'cubic-bezier(.16,.8,.2,1)' });
      }
    }, { threshold: .08 });
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [motion]);
}
