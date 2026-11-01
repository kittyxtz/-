import { useLayoutEffect, useRef } from 'react';
import { Icon } from './Icons';

export default function ChatActionMenu({ anchor, label, items, onClose, onAction }) {
  const menu = useRef(null);
  useLayoutEffect(() => {
    const node = menu.current;
    node.showPopover();
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      node.style.left = `${Math.max(12, Math.min(rect.right - node.offsetWidth, innerWidth - node.offsetWidth - 12))}px`;
      node.style.top = `${Math.max(12, Math.min(rect.bottom + 4, innerHeight - node.offsetHeight - 12))}px`;
    };
    place(); node.querySelector('button')?.focus({ preventScroll: true });
    const outside = event => { if (!node.contains(event.target) && !anchor.contains(event.target)) onClose(); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', onClose); window.addEventListener('scroll', onClose, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', onClose); window.removeEventListener('scroll', onClose, true); if (anchor.isConnected) anchor.focus({ preventScroll: true }); };
  }, [anchor, onClose]);
  return <div ref={menu} className="chat-context-menu chat-message-menu" popover="manual" role="menu" aria-label={label} onToggle={event => { if (event.newState === 'closed') onClose(); }} onKeyDown={event => {
    const buttons = [...menu.current.querySelectorAll('button')], index = buttons.indexOf(document.activeElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus();
    } else if (event.key === 'Escape' || event.key === 'Tab') { if (event.key === 'Escape') event.preventDefault(); onClose(); }
  }}>
    {items.map(item => <button type="button" role="menuitem" key={item.id} className={item.danger ? 'is-danger' : undefined} onClick={() => onAction(item.id)}><Icon name={item.icon} />{item.label}</button>)}
  </div>;
}
