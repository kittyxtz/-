export const ease = 'cubic-bezier(.2,0,0,1)';
export const disclosureTiming = { duration: 220, easing: ease };

// Animation snapshots are inert and live only for the duration of a transition.
// React continues to own the interactive surfaces and their state.
export function createMotionScope(reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const animations = new Set(), snapshots = new Set();
  const suppressed = () => reduced() || (typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches);
  return {
    get enabled() { return !suppressed(); },
    animate(node, frames, options) {
      if (suppressed() || !node?.animate) return null;
      const animation = node.animate(frames, options);
      animations.add(animation);
      animation.finished.then(() => {
        if (!options?.fill || options.fill === 'none') animations.delete(animation);
      }, () => animations.delete(animation));
      return animation;
    },
    snapshot(node, parent, className) {
      if (suppressed() || !node) return null;
      const copy = node.cloneNode(true);
      copy.removeAttribute('id');
      copy.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'));
      copy.hidden = false; copy.inert = true; copy.setAttribute('aria-hidden', 'true');
      if (className) copy.classList.add(className);
      parent.append(copy); snapshots.add(copy);
      return copy;
    },
    remove(node) { node?.remove(); snapshots.delete(node); },
    clear() {
      animations.forEach(animation => animation.cancel()); animations.clear();
      snapshots.forEach(node => node.remove()); snapshots.clear();
    },
  };
}
