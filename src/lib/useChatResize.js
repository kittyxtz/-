import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { read, write } from './storage';
import { sidebarCompactWidth, sidebarMinimumWidth, sidebarDefaultWidth, sidebarMaximumWidth, sidebarWidth, sidebarStep, sidebarDragWidth, sidebarReleasedWidth } from './chatSidebar';

const key = 'sozvon-chat-sidebar-width';
export default function useChatResize(narrow) {
  const shell = useRef(null), drag = useRef(null), current = useRef(sidebarDefaultWidth);
  const [preferred, setPreferred] = useState(() => {
    const saved = read(key, sidebarDefaultWidth);
    return typeof saved === 'number' && Number.isFinite(saved) ? saved === sidebarCompactWidth ? saved : Math.max(sidebarMinimumWidth, Math.min(sidebarMaximumWidth, saved)) : sidebarDefaultWidth;
  });
  const [maximum, setMaximum] = useState(sidebarMaximumWidth), [resizing, setResizing] = useState(false);
  const width = Math.min(preferred, maximum);
  current.current = width;
  const save = value => { try { write(key, value); } catch { /* Resizing works when storage is unavailable. */ } };
  const update = (value, persist = true) => {
    const next = sidebarWidth(value, maximum);
    current.current = next; setPreferred(next);
    if (persist) save(next);
  };
  useLayoutEffect(() => {
    const node = shell.current;
    const measure = () => setMaximum(Math.max(sidebarMinimumWidth, Math.min(sidebarMaximumWidth, node.clientWidth - 380)));
    measure(); const observer = new ResizeObserver(measure); observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { if (narrow) { drag.current = null; setResizing(false); } }, [narrow]);
  const finish = event => {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const next = sidebarReleasedWidth(current.current, maximum);
    drag.current = null; setResizing(false); current.current = next; setPreferred(next); save(next);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return { shell, width, collapsed: !narrow && width === sidebarCompactWidth, resizing, update, expand: () => update(sidebarMinimumWidth), separator: {
    role: 'separator', tabIndex: 0, 'aria-label': 'Ширина списка чатов', 'aria-orientation': 'vertical',
    'aria-controls': 'chat-sidebar', 'aria-valuemin': sidebarCompactWidth, 'aria-valuemax': maximum, 'aria-valuenow': width, 'aria-valuetext': width === sidebarCompactWidth ? 'Только аватарки' : `${width} пикселей`,
    onFocus(event) { event.currentTarget.removeAttribute('data-pointer-resize'); },
    onPointerDown(event) {
      if (event.button !== 0 || event.isPrimary === false) return;
      event.preventDefault(); event.currentTarget.blur();
      event.currentTarget.setAttribute('data-pointer-resize', '');
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { id: event.pointerId, x: event.clientX, width }; setResizing(true);
    },
    onPointerMove(event) {
      if (drag.current?.id !== event.pointerId) return;
      const next = sidebarDragWidth(drag.current.width + event.clientX - drag.current.x, drag.current.width, maximum);
      current.current = next; setPreferred(next);
    },
    onPointerUp: finish, onPointerCancel: finish, onLostPointerCapture: finish,
    onDoubleClick: () => update(sidebarDefaultWidth),
    onKeyDown(event) {
      event.currentTarget.removeAttribute('data-pointer-resize');
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].includes(event.key)) return;
      event.preventDefault();
      update(event.key === 'Home' ? sidebarCompactWidth : event.key === 'End' ? maximum : event.key === 'Enter' ? sidebarDefaultWidth : sidebarStep(width, event.key === 'ArrowLeft' ? -1 : 1, maximum));
    },
  } };
}
