import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icons';
import { CloseButton, Modal } from './Primitives';
import ChatAvatar from './ChatAvatar';
import SettingsLink from './SettingsLink';
import { participantCount } from '../lib/formatText';
import useMediaQuery from '../lib/useMediaQuery';
import useSwipeDismiss from '../lib/useSwipeDismiss';
import { ChatMaterials } from './ChatLibrary';

export default function ChatProfileDialog({ profile, members = [], chat, stats, onClose, onPerson, onWrite, onCall, onCopy }) {
  const frame = useRef(null), scroll = useRef(null), previous = useRef(document.activeElement);
  const mobile = useMediaQuery('(max-width: 760px)');
  const swipe = useSwipeDismiss(frame, onClose, mobile && !profile.self);
  const [copied, setCopied] = useState(null), copyTimer = useRef(null);
  const group = profile.kind === 'meeting';
  useEffect(() => {
    const node = frame.current, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animation = node?.animate(mobile ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: reduced ? 'none' : 'translateY(-32px)' }, { opacity: 1, transform: 'none' }], { duration: mobile ? 220 : 300, easing: 'cubic-bezier(.2,0,0,1)' });
    return () => animation?.cancel();
  }, [profile.id, mobile]);
  useEffect(() => {
    if (!mobile) return;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const nav = document.querySelector('.product-mobile-nav'), navInert = nav?.inert;
    if (nav) nav.inert = false;
    const background = [...document.querySelectorAll('#root > main,#root > .product-route-view,#root > .product-header,#root > .site-footer,#root > .skip')].map(node => [node, node.inert]);
    background.forEach(([node]) => { node.inert = true; });
    return () => { background.forEach(([node, inert]) => { node.inert = inert; }); if (nav) nav.inert = navInert; document.body.style.overflow = overflow; if (previous.current?.isConnected) previous.current.focus({ preventScroll: true }); };
  }, [mobile]);
  useLayoutEffect(() => {
    const node = scroll.current;
    const measure = () => node.style.setProperty('--profile-scroll-gutter', `${Math.max(0, (node.offsetWidth - node.clientWidth) / 2)}px`);
    measure(); const observer = new ResizeObserver(measure); observer.observe(node);
    return () => observer.disconnect();
  }, [mobile]);
  useLayoutEffect(() => { scroll.current.scrollTop = 0; (frame.current?.querySelector('.dialog-close,.profile-mobile-back') || frame.current)?.focus({ preventScroll: true }); }, [profile.id, mobile]);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  useEffect(() => { setCopied(null); clearTimeout(copyTimer.current); }, [profile.id]);
  async function copyField(field) {
    if (await onCopy?.(field.value) === false) return;
    setCopied(field.label); clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(null), 1800);
  }
  const fields = profile.self || group ? [] : [
    ...(profile.phone ? [{ icon: 'phone', label: 'Телефон', value: profile.phone }] : []),
    ...(profile.email ? [{ icon: 'mail', label: 'Почта', value: profile.email }] : []),
    ...(profile.username ? [{ icon: 'at', label: 'Имя пользователя', value: `@${profile.username}` }] : []),
    ...(profile.userId ? [{ icon: 'id', label: 'ID', value: profile.userId }] : []),
  ];
  const content = <>
    {mobile && !profile.self && <button type="button" className="profile-mobile-back" aria-label="Вернуться к чату" onClick={swipe.close}><Icon name="arrow" /></button>}
    <div className="chat-profile-cover" aria-hidden="true"><span /><span /></div>
    {!mobile && <CloseButton label="Закрыть профиль" onClick={onClose} />}
    {profile.self && <SettingsLink className="chat-profile-edit" section="profile" onClick={onClose} aria-label="Редактировать профиль"><Icon name="compose" /></SettingsLink>}
    <div ref={scroll} className="chat-profile-scroll">
      <div className="chat-profile-hero"><div className="chat-profile-avatar-wrap"><ChatAvatar chat={profile} /><span className="chat-profile-badge"><Icon name={group ? 'users' : 'person'} /></span></div><h2 id="chat-profile-title">{profile.title}</h2>{(group || profile.self || profile.username) && <p>{group ? participantCount(members.length) : profile.self ? 'Личный профиль' : `@${profile.username}`}</p>}</div>
      {profile.bio && <p className="chat-profile-bio">{profile.bio}</p>}
      {fields.length > 0 && <section className="chat-profile-section profile-contacts-under-name" aria-label="Контакты"><dl className="chat-profile-contact-list">{fields.map(field => <div key={field.label}><span className="chat-profile-field-icon"><Icon name={field.icon} /></span><div><dt className={copied === field.label ? 'is-copied' : undefined}>{copied === field.label ? 'Скопировано' : field.label}</dt><dd><bdi>{field.value}</bdi></dd></div><button type="button" className="chat-contact-copy" aria-label={`Копировать ${({ 'Телефон': 'телефон', 'Почта': 'почту', 'Имя пользователя': 'имя пользователя', 'ID': 'ID' })[field.label]}: ${field.value}`} onClick={() => copyField(field)} /></div>)}</dl></section>}
      {profile.self && <div className="profile-overview-stats"><span><Icon name="chat" /><strong>{stats?.chats ?? '…'}</strong><small>чатов</small></span><span><Icon name="mail" /><strong>{stats?.messages ?? '…'}</strong><small>моих сообщений</small></span></div>}
      {group && profile.code && <button type="button" className="profile-room-code" onClick={() => copyField({ label: 'Код встречи', value: profile.code })}><Icon name="link" /><span><small>{copied === 'Код встречи' ? 'Скопировано' : 'Код встречи'}</small>{profile.code}</span><Icon name="copy" /></button>}
      {!profile.self && <div className="chat-profile-actions">{!group && onWrite && <button type="button" onClick={() => onWrite(profile)}><Icon name="chat" />Написать</button>}{onCall && <button type="button" onClick={onCall}><Icon name="chat-video" />{group ? 'К встрече' : 'Позвонить'}</button>}</div>}
      {!profile.self && <ChatMaterials key={profile.id} chat={chat} group={group} members={members} onPerson={onPerson} />}
    </div>
  </>;
  if (mobile) return createPortal(<section ref={frame} id="chat-profile-view" className={`chat-identity-dialog chat-identity-view${profile.self ? ' is-own-profile' : ''}`} tabIndex={-1} role="region" aria-labelledby="chat-profile-title" {...swipe.bindings}>{content}</section>, document.getElementById('root'));
  return <Modal id="chat-profile-dialog" className={`chat-identity-dialog${profile.self ? ' is-own-profile' : ''}`} labelledBy="chat-profile-title" onClose={onClose} elementRef={frame} onOpen={() => {}}>{content}</Modal>;
}
