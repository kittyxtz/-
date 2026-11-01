import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './Icons';

export function Modal({ id, className = '', labelledBy, onClose, children, initialFocus, elementRef, onOpen, ...props }) {
  const localRef = useRef(null), ref = elementRef || localRef;
  const close = useRef(onClose);
  const opened = useRef(onOpen); opened.current = onOpen;
  close.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    opened.current?.(dialog);
    const mobileFade = matchMedia('(max-width: 760px)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches ? dialog.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' }) : null;
    if (initialFocus) dialog.querySelector(initialFocus)?.focus({ preventScroll: true });
    return () => { mobileFade?.cancel(); dialog.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [initialFocus]);
  return <dialog {...props} ref={ref} id={id} className={className} style={onOpen ? { animation: 'none' } : undefined} aria-labelledby={labelledBy}
    onCancel={event => { event.preventDefault(); close.current(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close.current();
    }}>{children}</dialog>;
}

export function CloseButton({ onClick, label = 'Закрыть', id }) {
  return <button type="button" id={id} className="icon-button dialog-close" onClick={onClick} aria-label={label}><Icon name="close" /></button>;
}

export function ErrorMessage({ id, message }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(0);
  const [gap, setGap] = useState(8);
  const [fieldGap, setFieldGap] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    const measure = () => {
      setHeight(message ? node.scrollHeight : 0);
      setGap(parseFloat(getComputedStyle(node.parentElement.parentElement).rowGap) || 0);
      setFieldGap(node.parentElement.parentElement.classList.contains('glass-field') ? 8 : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [message]);
  return <div className="field-error-slot is-ready" aria-hidden={!message} style={{ height, opacity: message ? 1 : 0, marginBlockStart: message ? fieldGap : -gap }}>
    <span ref={ref} id={id} className="field-error" role="alert" data-smooth-error="">{message}</span>
  </div>;
}

export function TextField({ id, label, error, icon = 'text', ...props }) {
  return <div className="field glass-field"><label htmlFor={id}>{label}</label><span className="input-shell">
    <Icon name={icon} />
    <input id={id} {...props} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : props['aria-describedby']} />
  </span><ErrorMessage id={`${id}-error`} message={error} /></div>;
}

export function Popover({ id, className, anchor, onClose, children, label }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const node = ref.current;
    node.showPopover();
    (node.querySelector('.month-day.is-selected') || node.querySelector('button:not(:disabled),[tabindex="0"]'))?.focus({ preventScroll: true });
    let placement = null;
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect || !node.matches(':popover-open')) return;
      const viewportWidth = document.documentElement.clientWidth;
      const width = Math.min(className.includes('radial-time-picker') ? 272 : className.includes('time-') ? 380 : 320, viewportWidth - 24);
      node.style.width = `${width}px`;
      node.style.maxHeight = `${innerHeight - 24}px`;
      node.style.left = `${Math.max(12, Math.min(rect.left, viewportWidth - width - 12))}px`;
      const height = node.offsetHeight;
      placement ??= innerHeight - rect.bottom - 20 >= height ? 'below' : rect.top - 20 >= height ? 'above' : 'edge';
      const desiredTop = placement === 'below' ? rect.bottom + 8 : placement === 'above' ? rect.top - height - 8 : innerHeight - height - 12;
      const top = Math.max(12, Math.min(desiredTop, innerHeight - height - 12));
      node.style.top = `${top}px`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(node);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { observer.disconnect(); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [anchor, className]);
  return <div id={id} ref={ref} popover="auto" role="dialog" aria-label={label} className={className} onKeyDown={event => {
    if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); event.stopPropagation(); onClose(); anchor.current?.focus({ preventScroll: true }); }
  }} onToggle={event => { if (event.newState === 'closed') onClose(); }}>{children}</div>;
}
