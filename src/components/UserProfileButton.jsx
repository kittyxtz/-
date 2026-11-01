import { useEffect, useId, useState } from 'react';
import { useApp } from '../context';
import { read } from '../lib/storage';
import ChatProfileDialog from './ChatProfileDialog';
import { readChatWorkspace } from '../lib/useChatWorkspace';
import useMediaQuery from '../lib/useMediaQuery';

export default function UserProfileButton({ name, tone, children, onOpenChange, asTab = false, ...props }) {
  const [open, setOpen] = useState(false);
  useEffect(() => onOpenChange?.(open), [open, onOpenChange]);
  const id = useId(), mobile = useMediaQuery('(max-width: 760px)');
  useEffect(() => { const closeOther = event => { if (event.detail !== id) setOpen(false); }; const close = () => setOpen(false); window.addEventListener('sozvon-profile-open', closeOther); window.addEventListener('sozvon-profile-close', close); return () => { window.removeEventListener('sozvon-profile-open', closeOther); window.removeEventListener('sozvon-profile-close', close); }; }, [id]);
  const [workspace, setWorkspace] = useState(null);
  useEffect(() => {
    if (!open) return;
    let active = true;
    readChatWorkspace().then(snapshot => {
      if (!active) return;
      const chats = (snapshot?.chats || []).filter(chat => !chat.deleted);
      setWorkspace({ chats, messages: chats.flatMap(chat => chat.messages.filter(message => message.self)) });
    });
    return () => { active = false; setWorkspace(null); };
  }, [open]);
  const { notify, openProfileTab } = useApp();
  const bio = read('sozvon-bio', '');
  const profile = { id: 'self', self: true, title: name.trim() || 'Мой профиль', initials: (name.trim() || 'Я').slice(0, 1).toUpperCase(), tone, userId: 'local', bio: typeof bio === 'string' ? bio : '' };
  async function copy(value) {
    try { await navigator.clipboard.writeText(value); return true; }
    catch { notify('Не удалось скопировать. Попробуйте ещё раз.'); return false; }
  }
  return <><button type="button" {...props} aria-label="Открыть профиль" aria-haspopup={mobile ? undefined : 'dialog'} aria-expanded={open} aria-current={mobile && open ? 'page' : undefined} onClick={() => { if (open) return; const show = () => { window.dispatchEvent(new CustomEvent('sozvon-profile-open', { detail: id })); setOpen(true); }; if (asTab && mobile && openProfileTab) openProfileTab(show); else show(); }}>{children}</button>{open && <ChatProfileDialog profile={profile} members={[]} stats={{ chats: workspace?.chats.length, messages: workspace?.messages.length }} onClose={() => setOpen(false)} onCopy={copy} />}</>;
}
