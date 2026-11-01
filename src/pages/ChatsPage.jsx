import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icons';
import { CloseButton, Modal } from '../components/Primitives';
import { chatContacts, chatExamples } from '../lib/chatExamples';
import useMediaQuery from '../lib/useMediaQuery';
import { makeCode } from '../lib/meetings';
import useChatResize from '../lib/useChatResize';
import { chatCount, participantCount, selectedMessageCount } from '../lib/formatText';
import { chatDateLabel, startsChatDay } from '../lib/chatDates';
import { contactPresenceLabel, groupPresenceLabel } from '../lib/chatPresence';
import ChatRow from '../components/ChatRow';
import ChatContextMenu from '../components/ChatContextMenu';
import ChatAvatar from '../components/ChatAvatar';
import SettingsLink from '../components/SettingsLink';
import UserProfileButton from '../components/UserProfileButton';
import ChatMessage from '../components/ChatMessage';
import { isImageFile } from '../components/ChatAttachment';
import copyChatImage from '../lib/copyChatImage';
import ChatPhotoComposer from '../components/ChatPhotoComposer';
import useChatWorkspace from '../lib/useChatWorkspace';
import { readNotifications } from '../lib/notificationPreferences';
import ChatSearch from '../components/ChatSearch';
import MessageDelivery from '../components/MessageDelivery';
import HoldToRecordButton from '../components/HoldToRecordButton';
import { markPendingSent } from '../lib/messageDelivery';
import ChatActionMenu from '../components/ChatActionMenu';
import ChatProfileDialog from '../components/ChatProfileDialog';
import useVoiceRecorder from '../lib/useVoiceRecorder';
import useSwipeDismiss from '../lib/useSwipeDismiss';
import useChatScroll from '../lib/useChatScroll';
import { useApp } from '../context';
import { canDeleteMessage, messageActions, messageAttachments, messageSummary, quoteMessage, outgoingMessage, forwardedMessage } from '../lib/chatMessages';

const filters = [{ id: 'all', label: 'Все' }, { id: 'personal', label: 'Личные' }, { id: 'meeting', label: 'Встречи' }];
const unreadLabel = count => ({ one: `${count} непрочитанное сообщение`, few: `${count} непрочитанных сообщения`, other: `${count} непрочитанных сообщений` })[new Intl.PluralRules('ru-RU').select(count)];
const personalChat = contact => ({ ...contact, kind: 'personal', unread: 0, preview: 'Начните разговор', time: '', messages: [] });

export default function ChatsPage({ name, tone, openLobby, chatRequest }) {
  const { settleNavigation } = useApp();
  const [initialContact] = useState(() => chatContacts.find(contact => contact.id === new URLSearchParams(location.search).get('chat')));
  const narrow = useMediaQuery('(max-width: 760px)');
  const resize = useChatResize(narrow);
  const [notificationPreferences] = useState(readNotifications);
  const { chats, setChats, drafts, setDrafts, ready: workspaceReady, error: workspaceError } = useChatWorkspace(() => initialContact && !chatExamples.some(chat => chat.id === initialContact.id) ? [...chatExamples, personalChat(initialContact)] : chatExamples);
  useEffect(() => {
    const reconnect = () => setChats(current => current.map(chat => ({ ...chat, messages: markPendingSent(chat.messages) })));
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, []);
  const [selected, setSelected] = useState(initialContact?.id || 'design'), [mobileOpen, setMobileOpen] = useState(Boolean(initialContact));
  useEffect(() => { if (!narrow) return; const nodes = [...document.querySelectorAll('.product-header,.product-mobile-nav')].map(node => [node,node.inert]); nodes.forEach(([node]) => { node.inert = mobileOpen; }); return () => nodes.forEach(([node,previous]) => { node.inert = previous; }); }, [narrow, mobileOpen]);
  const [filter, setFilter] = useState('all'), [query, setQuery] = useState('');
  const [details, setDetails] = useState(false), [newChat, setNewChat] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false), [headerMenu, setHeaderMenu] = useState(null);
  const searchTrigger = useRef(null), attachmentInput = useRef(null);
  const [emojis, setEmojis] = useState(false), [announcement, setAnnouncement] = useState('');
  const [contextMenu, setContextMenu] = useState(null), [profile, setProfile] = useState(null), [deleted, setDeleted] = useState(null);
  useEffect(() => { const closeProfiles = () => { setDetails(false); setProfile(null); }; window.addEventListener('sozvon-profile-open', closeProfiles); return () => window.removeEventListener('sozvon-profile-open', closeProfiles); }, []);
  const closeMenu = useCallback(() => setContextMenu(null), []);
  const [messageMenu, setMessageMenu] = useState(null), [replies, setReplies] = useState({});
  const [forwarding, setForwarding] = useState(null), [selectedMessages, setSelectedMessages] = useState([]), [removedMessage, setRemovedMessage] = useState(null);
  const [pendingAttachments, setPendingAttachments] = useState(null);
  const closeMessageMenu = useCallback(() => setMessageMenu(null), []);
  const voiceUrls = useRef(new Set());
  useEffect(() => () => { voiceUrls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  const conversationFrame = useRef(null);
  const swipe = useSwipeDismiss(conversationFrame, finishBack, narrow && mobileOpen, { swipeFromControls: '.chat-message-list,.chat-contact-summary', swipeItemSelector: '[data-message-id]', onSwipeLeft: selectedMessages.length ? undefined : id => { const message = chat.messages.find(item => item.id === id); if (message) replyTo(message); } });
  const conversation = useRef(null), composer = useRef(null), heading = useRef(null), list = useRef(null), search = useRef(null);
  const activeChats = chats.filter(item => !item.deleted);
  const hasChat = activeChats.length > 0;
  const chat = activeChats.find(item => item.id === selected) || activeChats[0] || { id: 'empty', title: 'Выберите чат', kind: 'personal', messages: [] };
  const draft = drafts[selected] || '';
  const reply = replies[selected];
  const messageScroll = useChatScroll(conversation, chat.id, chat.messages, !narrow || mobileOpen, workspaceReady);
  const voice = useVoiceRecorder(`${selected}:${Boolean(chat.blocked)}`);
  const [voicePhase, setVoicePhase] = useState('idle');
  const visibleChats = activeChats.filter(item => (filter === 'all' || item.kind === filter) && item.title.toLocaleLowerCase('ru-RU').includes(query.trim().toLocaleLowerCase('ru-RU'))).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  const contact = chatContacts.find(item => item.id === chat.id) || chat;
  const [presenceNow, setPresenceNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setPresenceNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const authorContact = message => chatContacts.find(item => item.id === message.authorId || item.title.split(' ')[0] === message.author);
  const roleDefaults = chatExamples.find(item => item.id === chat.id);
  const ownerId = chat.ownerId ?? roleDefaults?.ownerId;
  const adminIds = chat.adminIds ?? roleDefaults?.adminIds ?? [];
  const members = chat.kind === 'meeting' ? chat.participants.map(member => {
    const contact = chatContacts.find(item => item.title === member);
    const id = contact?.id || member;
    const role = ownerId === id ? 'owner' : adminIds.includes(id) || (member === 'Вы' && chat.isAdmin) ? 'admin' : undefined;
    return { id, role, title: member === 'Вы' ? (name.trim() || 'Вы') : member, initials: contact?.initials || (name.trim() || 'Вы').slice(0, 1).toUpperCase(), tone: contact?.tone || tone, self: member === 'Вы', online: member === 'Вы' || Boolean(contact?.online), lastSeen: contact?.lastSeen, gender: contact?.gender };
  }) : [];
  useEffect(() => { if (workspaceReady && initialContact && !chats.some(item => item.id === initialContact.id)) setChats(current => [...current, personalChat(initialContact)]); }, [workspaceReady]);
  useEffect(() => { if (chatRequest) startPersonal(chatRequest.contact); }, [chatRequest]);
  useLayoutEffect(() => {
    const node = composer.current;
    if (!node) return;
    node.style.height = '40px';
    node.style.height = `${Math.max(40, Math.min(120, node.scrollHeight))}px`;
  }, [draft, selected]);
  function select(id) {
    settleNavigation?.();
    voice.cancel();
    setContextMenu(null); setMessageMenu(null); setSelectedMessages([]); setSelected(id); setSearchOpen(false); setHeaderMenu(null); setMobileOpen(true); setDetails(false); setEmojis(false);
    setChats(current => current.map(item => item.id === id ? { ...item, unread: 0 } : item));
    if (narrow) requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  }
  function back() { swipe.close(); }
  function finishBack() {
    voice.cancel();
    setMobileOpen(false); setDetails(false); setEmojis(false);
    requestAnimationFrame(() => list.current?.querySelector(`[data-chat-id="${selected}"]`)?.focus({ preventScroll: true }));
  }
  function appendMessage(id, message) {
    message = { ...message, delivery: navigator.onLine ? 'sent' : 'pending' };
    setChats(current => current.map(item => item.id === id ? { ...item, unread: id === selected ? 0 : item.unread, messages: [...item.messages, message], preview: `Вы: ${messageSummary(message)}`, time: message.time } : item));
  }
  function send(event) {
    event.preventDefault();
    if (!workspaceReady || chat.blocked || (!draft.trim() && voice.status !== 'preview')) return;
    const clip = voice.status === 'preview' ? voice.take() : null;
    if (clip) voiceUrls.current.add(clip.url);
    appendMessage(selected, outgoingMessage({ text: clip ? '' : draft.trim(), ...(clip ? { voice: clip } : {}), ...(reply ? { reply } : {}) }));
    setDrafts(current => ({ ...current, [selected]: '' })); setReplies(current => ({ ...current, [selected]: null })); setEmojis(false);
    setAnnouncement(navigator.onLine ? 'Сообщение отправлено' : 'Сообщение ожидает отправки');
    requestAnimationFrame(() => composer.current?.focus());
  }
  function sendVoice(clip) {
    if (chat.blocked) { URL.revokeObjectURL(clip.url); return; }
    voiceUrls.current.add(clip.url);
    appendMessage(selected, outgoingMessage({ voice: clip, ...(reply ? { reply } : {}) }));
    setReplies(current => ({ ...current, [selected]: null }));
    setAnnouncement(navigator.onLine ? 'Голосовое сообщение отправлено' : 'Голосовое сообщение ожидает отправки');
    requestAnimationFrame(() => composer.current?.focus());
  }
  function attachFiles(files) {
    if (!workspaceReady || chat.blocked) return;
    const accepted = [...files].slice(0, 5).filter(file => file.size <= 20 * 1024 * 1024);
    if (accepted.some(file => isImageFile({ type: file.type, title: file.name }))) setPendingAttachments({ chatId: selected, files: accepted, reply });
    else if (accepted.length) sendFiles(accepted, selected);
    if (accepted.length < files.length) setAnnouncement('Можно добавить до 5 файлов размером до 20 МБ каждый.');
    if (attachmentInput.current) attachmentInput.current.value = '';
  }
  async function sendFiles(files, chatId, caption = '', quoted, asFile = false) {
    const attachments = [];
    for (const file of files) {
      const url = URL.createObjectURL(file); voiceUrls.current.add(url);
      const size = file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} КБ` : `${(file.size / 1024 / 1024).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} МБ`;
      const extension = file.name.includes('.') ? file.name.split('.').at(-1).toUpperCase() : 'Файл';
      const type = file.type || (/\.(jpe?g|png|gif|webp|avif|bmp)$/i.test(file.name) ? 'image/' + extension.toLowerCase().replace('jpg', 'jpeg') : '');
      let dimensions = {};
      if (type.startsWith('image/')) {
        const image = new Image(); image.src = url;
        try { await image.decode(); dimensions = { width: image.naturalWidth, height: image.naturalHeight }; } catch { /* Keep the attachment available even if its preview cannot be decoded. */ }
      }
      attachments.push({ title: file.name, detail: `${extension} · ${size}`, type, blob: file, url, ...dimensions, ...(asFile ? { asFile: true } : {}) });
    }
    appendMessage(chatId, outgoingMessage({ ...(attachments.length > 1 ? { files: attachments } : { file: attachments[0] }), ...(caption ? { text: caption } : {}), ...(quoted ? { reply: quoted } : {}) }));
    setAnnouncement(navigator.onLine ? 'Вложения отправлены' : 'Вложения ожидают отправки');
  }
  function pasteImages(event) {
    if (chat.blocked || !workspaceReady || voice.status !== 'idle') return;
    const images = Array.from(event.clipboardData.items || []).filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).filter(Boolean);
    if (!images.length) images.push(...Array.from(event.clipboardData.files || []).filter(file => file.type.startsWith('image/')));
    if (!images.length) return;
    event.preventDefault();
    attachFiles(images);
  }
  function closeSearch() { setSearchOpen(false); requestAnimationFrame(() => searchTrigger.current?.focus()); }
  function showQuotedMessage(id) { if (!messageScroll.reveal(id)) setAnnouncement('Исходное сообщение больше недоступно'); }
  function showResult(id) {
    setSearchOpen(false);
    requestAnimationFrame(() => {
      const node = [...(conversation.current?.querySelectorAll('[data-message-id]') || [])].find(item => item.dataset.messageId === id);
      node?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      node?.querySelector('.chat-bubble')?.focus({ preventScroll: true });
    });
  }
  function changeNotifications(value) {
    setChats(current => current.map(item => item.id === selected ? { ...item, notifications: value, muteUntil: value === 'hour' ? Date.now() + 3600000 : null } : item));
    setAnnouncement('Настройки уведомлений сохранены');
  }
  function replyTo(message) {
    voice.cancel(); setReplies(current => ({ ...current, [selected]: quoteMessage(message) })); setMessageMenu(null);
    requestAnimationFrame(() => composer.current?.focus());
  }
  function toggleMessage(id) { setSelectedMessages(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]); }
  function messageAction(action) {
    const message = chat.messages.find(item => item.id === messageMenu.id);
    setMessageMenu(null);
    if (!message) return;
    if (action === 'reply') replyTo(message);
    else if (action === 'forward') setForwarding([message]);
    else if (action === 'copy' && !message.voice) {
      const attachments = messageAttachments(message);
      if (attachments.length === 1 && isImageFile(attachments[0])) copyPhoto(attachments[0]);
      else copyText(messageSummary(message));
    }
    else if (action === 'select') toggleMessage(message.id);
    else if (action === 'pin') setChats(current => current.map(item => item.id === selected ? { ...item, messages: item.messages.map(entry => entry.id === message.id ? { ...entry, pinned: !entry.pinned } : entry) } : item));
    else if (action === 'delete' && canDeleteMessage(chat, message)) {
      setRemovedMessage({ chatId: selected, message, index: chat.messages.indexOf(message) });
      setChats(current => current.map(item => {
        if (item.id !== selected) return item;
        const messages = item.messages.filter(entry => entry.id !== message.id), last = messages.at(-1);
        return { ...item, messages, preview: last ? `${last.self ? 'Вы' : last.author}: ${messageSummary(last)}` : 'Сообщений пока нет', time: last?.time || '' };
      }));
      setSelectedMessages(current => current.filter(id => id !== message.id));
    }
  }
  function undoMessage() {
    setChats(current => current.map(item => {
      if (item.id !== removedMessage.chatId) return item;
      const messages = [...item.messages]; messages.splice(removedMessage.index, 0, removedMessage.message); const last = messages.at(-1);
      return { ...item, messages, preview: `${last.self ? 'Вы' : last.author}: ${messageSummary(last)}`, time: last.time };
    })); setRemovedMessage(null);
  }
  function forwardTo(id) {
    forwarding.forEach(message => appendMessage(id, forwardedMessage(message)));
    setForwarding(null); setSelectedMessages([]); select(id); setAnnouncement('Сообщение переслано');
  }
  async function copyText(value) {
    try { await navigator.clipboard.writeText(value); setAnnouncement('Скопировано'); return true; }
    catch { setAnnouncement('Не удалось скопировать. Выделите текст и скопируйте его вручную.'); return false; }
  }
  async function copyPhoto(file) {
    try { await copyChatImage(file); setAnnouncement('Фотография скопирована'); }
    catch { setAnnouncement('Не удалось скопировать фотографию. Откройте её и сохраните на устройство.'); }
  }
  function startPersonal(contact) {
    if (!chats.some(item => item.id === contact.id)) {
      setChats(current => [...current, personalChat(contact)]);
    }
    setChats(current => current.map(item => item.id === contact.id ? { ...item, deleted: false } : item));
    setFilter('all'); setQuery(''); setNewChat(false); setProfile(null); setDetails(false); select(contact.id);
  }
  function menuAction(action, id = contextMenu?.id) {
    const target = chats.find(item => item.id === id);
    if (!target) return;
    setContextMenu(null);
    if (action === 'delete') {
      setChats(current => current.map(item => item.id === target.id ? { ...item, deleted: true } : item));
      if (selected === target.id) { setSelected(activeChats.find(item => item.id !== target.id)?.id || 'empty'); setMobileOpen(false); }
      setDeleted({ id: target.id, title: target.title });
    } else {
      const property = action === 'pin' ? 'pinned' : 'blocked';
      setChats(current => current.map(item => item.id === target.id ? { ...item, [property]: !item[property] } : item));
      setAnnouncement(action === 'pin' ? (target.pinned ? 'Чат откреплён' : 'Чат закреплён') : (target.blocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован'));
    }
  }
  function startCall() { openLobby({ name: name.trim() || 'Гость', joining: chat.kind === 'meeting', title: chat.kind === 'meeting' ? chat.meeting : `Встреча: ${chat.title}`, code: chat.code || makeCode() }); }
  function headerAction(action) {
    setHeaderMenu(null);
    if (action === 'mute') changeNotifications(chat.notifications === 'off' ? 'all' : 'off');
    if (action === 'call') startCall();
    if (action === 'search') setSearchOpen(true);
    if (action === 'delete' || action === 'block') menuAction(action, chat.id);
  }
  function undoDelete() { setChats(current => current.map(item => item.id === deleted.id ? { ...item, deleted: false } : item)); setSelected(deleted.id); setDeleted(null); }
  return <main id="chats-main" className="chats-main page-width">
    <div className="chats-page-heading"><h1>Чаты</h1><span className="chats-page-count" aria-label={chatCount(activeChats.length)} title={chatCount(activeChats.length)}>{activeChats.length}</span></div>
    {workspaceError && <p className="product-storage-warning" role="alert"><Icon name="info" />{workspaceError}</p>}
    <div ref={resize.shell} style={{ '--chat-sidebar-width': `${resize.width}px` }} className={`chats-shell${mobileOpen ? ' has-conversation' : ''}${resize.resizing ? ' is-resizing' : ''}${resize.collapsed ? ' is-sidebar-collapsed' : ''}${notificationPreferences.badges ? '' : ' are-badges-hidden'}`}>
      <aside id="chat-sidebar" className="chats-sidebar" inert={narrow && mobileOpen} aria-label="Список чатов">
        <div className="chats-sidebar-heading"><div className="chats-sidebar-tools"><button type="button" className="chat-icon-button chat-collapsed-search" aria-label="Раскрыть список и найти чат" title="Найти чат" onClick={() => { resize.expand(); requestAnimationFrame(() => search.current?.focus()); }}><Icon name="search" /></button><div className="chat-search"><Icon name="search" /><input ref={search} type="search" aria-label="Найти чат" placeholder="Поиск" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Очистить поиск" onClick={() => setQuery('')}><Icon name="close" /></button>}</div><button type="button" className="chat-icon-button chat-new-button" aria-label="Написать сообщение" onClick={() => setNewChat(true)}><Icon name="compose" /></button></div>
        <div className="chat-filters" role="group" aria-label="Тип чатов">{filters.map(item => <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
        </div>
        <nav ref={list} className="chat-list" aria-label="Переписки">
          {visibleChats.map(item => <ChatRow key={item.id} data-chat-id={item.id} title={item.title} aria-label={resize.collapsed ? `${item.title}${item.unread ? `, ${unreadLabel(item.unread)}` : ''}` : undefined} className={`chat-list-item${selected === item.id && (!narrow || mobileOpen) ? ' is-selected' : ''}${item.unread ? ' is-unread' : ''}${item.blocked ? ' is-blocked' : ''}`} aria-current={selected === item.id && (!narrow || mobileOpen) ? 'true' : undefined} onSelect={() => select(item.id)} onMenu={anchor => setContextMenu({ id: item.id, anchor })} aria-haspopup="menu"><ChatAvatar chat={item} /><span className="chat-list-copy"><span className="chat-list-top"><span className="chat-list-title" title={item.title}><span className="chat-list-title-text">{item.title}</span>{item.notifications && item.notifications !== 'all' && (item.notifications !== 'hour' || item.muteUntil > Date.now()) && <Icon name="speaker" className="chat-muted-icon" aria-label="Уведомления без звука" />}{item.pinned && <Icon name="pin" className="chat-pinned-icon" aria-label="Закреплено" />}</span><time>{item.time}</time></span><span className="chat-list-bottom"><span className={`chat-list-preview${drafts[item.id] ? ' has-draft' : ''}`}>{item.blocked ? 'Заблокирован' : drafts[item.id] ? <><b>Черновик: </b>{drafts[item.id]}</> : item.preview}</span><span className="chat-list-indicators">{notificationPreferences.badges && item.unread > 0 && <span className="chat-unread" aria-label={unreadLabel(item.unread)}>{item.unread}</span>}<MessageDelivery message={item.messages.at(-1)} className="chat-list-delivery" /></span></span></span></ChatRow>)}
          {!visibleChats.length && <div className="chats-search-empty"><Icon name="search" /><h3>Чаты не найдены</h3><p>{query.trim() ? <>По запросу «{query.trim()}» ничего не найдено.</> : 'В этом разделе пока нет чатов.'}</p><button type="button" onClick={() => { setQuery(''); setFilter('all'); }}>Сбросить фильтры</button></div>}
        </nav>
        <div className="chat-user-panel"><UserProfileButton name={name} tone={tone} className="chat-current-user"><span className="profile-avatar" data-tone={tone}>{(name.trim() || 'Я').slice(0, 1).toUpperCase()}</span><span><strong title={name.trim() || 'Мой профиль'}>{name.trim() || 'Мой профиль'}</strong><small>Мой профиль</small></span></UserProfileButton><SettingsLink className="chat-user-settings" aria-label="Настройки"><Icon name="settings" /></SettingsLink></div>
      </aside>
      {!narrow && <div className="chat-resizer"><div className="chat-resize-handle" {...resize.separator} /></div>}
      <section ref={conversationFrame} {...swipe.bindings} className="chat-conversation" aria-labelledby="chat-title" hidden={narrow && !mobileOpen}>
        {hasChat ? <>
        <header className="chat-conversation-header">
          <button type="button" className="chat-icon-button chat-mobile-back" aria-label="К списку чатов" onClick={back}><Icon name="arrow" /></button>
          <div className="chat-contact-summary">
            <ChatAvatar chat={chat} />
            <div className="chat-conversation-identity"><h2 id="chat-title" ref={heading} tabIndex={-1}><span className="chat-group-trigger"><span>{chat.title}</span><Icon name="chevron" /></span></h2><p>{chat.kind === 'meeting' ? groupPresenceLabel(members) : contactPresenceLabel(contact, presenceNow)}</p></div>
            <button type="button" className="chat-contact-trigger" data-press-feedback="css" aria-label={chat.kind === 'meeting' ? `Открыть список участников: ${chat.title}` : `Открыть профиль: ${chat.title}`} aria-haspopup="dialog" aria-expanded={chat.kind === 'meeting' ? details : Boolean(profile)} onClick={() => chat.kind === 'meeting' ? setDetails(true) : setProfile(contact)} />
          </div>
          <div className="chat-header-actions"><button ref={searchTrigger} type="button" className="chat-icon-button chat-header-menu-button" aria-label="Действия с чатом" aria-haspopup="menu" aria-expanded={Boolean(headerMenu)} onClick={event => setHeaderMenu(event.currentTarget)}><Icon name="more" /></button></div>
        </header>
        {searchOpen && <ChatSearch key={selected} chat={chat} members={members} onClose={closeSearch} onResult={showResult} />}
        {chat.messages.some(message => message.pinned) && <button type="button" className="chat-pinned-message" onClick={() => { const pinned = chat.messages.filter(message => message.pinned).at(-1); const node = conversation.current?.querySelector(`[data-message-id="${pinned.id}"] .chat-bubble`); node?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); node?.focus({ preventScroll: true }); }}><Icon name="pin" /><span><strong>Закреплённое сообщение</strong><span>{messageSummary(chat.messages.filter(message => message.pinned).at(-1))}</span></span><Icon name="chevron" /></button>}
        {selectedMessages.length > 0 && <div className="chat-selection-bar"><button type="button" className="chat-icon-button" aria-label="Отменить выделение" onClick={() => setSelectedMessages([])}><Icon name="close" /></button><span>{selectedMessageCount(selectedMessages.length)}</span><button type="button" onClick={() => setForwarding(chat.messages.filter(message => selectedMessages.includes(message.id)))}><Icon name="forward" />Переслать</button></div>}
        <div ref={conversation} className="chat-message-list" role="region" aria-label={`Сообщения: ${chat.title}`} tabIndex={0}>
          {chat.messages[0] && <div className="chat-date-divider"><span>{chatDateLabel(chat.messages[0].day)}</span></div>}
          {chat.kind === 'meeting' && <div className="chat-meeting-card"><span className="chat-meeting-card-icon"><Icon name="chat-video" /></span><div><span>Встреча</span><h3>{chat.meeting}</h3><p>{chat.duration}<span aria-hidden="true"> · </span>{participantCount(chat.participants.length)}</p></div><button type="button" className="chat-icon-button" aria-label="Перейти к встрече" onClick={() => openLobby({ name: name.trim() || 'Гость', title: chat.meeting, code: chat.code, joining: true })}><Icon name="arrow" /></button></div>}
          <div className="chat-message-stack" key={selected}>
            {chat.messages.map((message, index) => <Fragment key={message.id}>{index > 0 && startsChatDay(chat.messages, index) && <div className="chat-date-divider"><span>{chatDateLabel(message.day)}</span></div>}<ChatMessage mobile={narrow} highlighted={messageScroll.highlighted === message.id} onQuote={showQuotedMessage} message={message} group={chat.kind === 'meeting'} contact={authorContact(message)} selected={selectedMessages.includes(message.id)} selecting={selectedMessages.length > 0} onProfile={setProfile} onReply={() => replyTo(message)} onMenu={anchor => { setContextMenu(null); setMessageMenu({ id: message.id, anchor }); }} onSelect={() => toggleMessage(message.id)} /></Fragment>)}
            {!chat.messages.length && <div className="chat-empty-conversation"><Icon name="chat" /><h3>Сообщений пока нет</h3><p>Напишите первое сообщение.</p></div>}
          </div>
        </div>
        <div className="chat-compose-area">{chat.blocked && <div className="chat-blocked-banner"><span>Пользователь заблокирован</span><button type="button" onClick={() => setChats(current => current.map(item => item.id === selected ? { ...item, blocked: false } : item))}>Разблокировать</button></div>}{emojis && !chat.blocked && <div className="chat-emoji-picker" role="group" aria-label="Добавить эмодзи">{['🙂', '👍', '💙', '🙌', '✨', '☕'].map(emoji => <button key={emoji} type="button" aria-label={`Добавить ${emoji}`} onClick={() => { setDrafts(current => ({ ...current, [selected]: (current[selected] || '') + emoji })); setEmojis(false); composer.current.focus(); }}>{emoji}</button>)}</div>}
          {reply && <div className="chat-compose-reply"><Icon name="reply" /><button type="button" className="chat-compose-reply-jump" aria-label={`Перейти к сообщению ${reply.author}: ${reply.text}`} onClick={() => showQuotedMessage(reply.id)}><strong>{reply.author}</strong><span>{reply.text}</span></button><button type="button" className="chat-icon-button" aria-label="Отменить ответ" onClick={() => setReplies(current => ({ ...current, [selected]: null }))}><Icon name="close" /></button></div>}
          <form className="chat-compose" data-voice-phase={voicePhase} data-voice-status={voice.status} onSubmit={send} onPaste={pasteImages} onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }} onDrop={event => { if (event.dataTransfer.files.length) { event.preventDefault(); if (voice.status === 'idle') attachFiles(event.dataTransfer.files); } }}>
            {voice.status === 'idle' ? <><input ref={attachmentInput} className="visually-hidden" type="file" multiple tabIndex={-1} aria-label="Выбрать вложения" onChange={event => attachFiles(event.target.files)} /><button type="button" className="chat-icon-button chat-attach-button" aria-label="Прикрепить файл" title="Прикрепить файл, до 20 МБ" disabled={chat.blocked || !workspaceReady} onClick={() => attachmentInput.current?.click()}><Icon name="plus" /></button><button type="button" className="chat-icon-button" aria-label="Выбрать эмодзи" disabled={chat.blocked} aria-expanded={emojis} onClick={() => setEmojis(!emojis)}><Icon name="smile" /></button><label className="visually-hidden" htmlFor="chat-message">Сообщение</label><textarea ref={composer} id="chat-message" disabled={chat.blocked || !workspaceReady} rows={1} maxLength={4000} placeholder="Сообщение…" value={draft} onChange={event => setDrafts(current => ({ ...current, [selected]: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(event); } }} /></> : <><button type="button" className="chat-icon-button" aria-label="Удалить запись" disabled={voice.status === 'cancelling'} onClick={() => voice.cancel({ animate: true })}><Icon name="trash" /></button>{voice.status === 'preview' ? <audio className="chat-voice-preview" controls src={voice.clip.url} aria-label="Прослушать запись" /> : <div className="chat-recording-status" role="status"><span className="chat-recording-dot" /><span className="chat-recording-label">{voice.status === 'requesting' ? 'Включение микрофона…' : voice.status === 'stopping' ? 'Подготовка записи…' : voice.status === 'cancelling' ? 'Отменено' : 'Запись'}</span><time>{Math.floor(voice.seconds / 60)}:{String(voice.seconds % 60).padStart(2, '0')}</time><span className="chat-recording-wave" aria-hidden="true">{voice.levels.map((level, i) => <i key={i} style={{ '--bar': `${2 + level * 24}px` }} />)}</span></div>}</>}
            {(draft.trim() && voice.status === 'idle') || voice.status === 'preview' ? <button type="submit" className="chat-send" aria-label="Отправить сообщение" disabled={chat.blocked}><Icon name="send" /></button> : <HoldToRecordButton voice={voice} disabled={chat.blocked || !workspaceReady} onSend={sendVoice} onPhaseChange={setVoicePhase} />}
          </form>
          <p className="chat-compose-error" role="status">{voice.error}</p>
        </div>
        </> : <div className="chat-no-selection"><Icon name="chat" /><h2 id="chat-title">Выберите чат</h2><button type="button" onClick={() => setNewChat(true)}>Написать сообщение</button></div>}
      </section>
    </div>
    <span className="visually-hidden" role="status">{announcement}</span>
    {pendingAttachments && <ChatPhotoComposer files={pendingAttachments.files} onClose={() => setPendingAttachments(null)} onAdd={files => {
      const accepted = files.filter(file => file.size <= 20 * 1024 * 1024 && isImageFile({ type: file.type, title: file.name })).slice(0, 5 - pendingAttachments.files.length);
      if (accepted.length) setPendingAttachments(current => ({ ...current, files: [...current.files, ...accepted] }));
      return accepted.length < files.length ? 'Можно добавить до 5 изображений размером до 20 МБ каждое.' : '';
    }} onSend={async (caption, asFile) => {
      await sendFiles(pendingAttachments.files, pendingAttachments.chatId, caption, pendingAttachments.reply, asFile);
      setReplies(current => current[pendingAttachments.chatId]?.id === pendingAttachments.reply?.id ? { ...current, [pendingAttachments.chatId]: null } : current);
      setPendingAttachments(null);
    }} />}
    {(details || profile) && <ChatProfileDialog profile={details ? chat : profile} chat={details ? chat : chats.find(item => item.id === profile?.id)} members={members} onClose={() => { setDetails(false); setProfile(null); }} onPerson={member => { setDetails(false); setProfile(chatContacts.find(item => item.id === member.id) || { ...member, userId: 'local' }); }} onWrite={startPersonal} onCall={() => { const person = details ? chat : profile; openLobby({ name: name.trim() || 'Гость', title: details ? chat.meeting : `Встреча: ${person.title}`, code: details ? chat.code : makeCode(), joining: details }); }} onCopy={copyText} />}
    {headerMenu && <ChatActionMenu anchor={headerMenu} label="Действия с чатом" onClose={() => setHeaderMenu(null)} onAction={headerAction} items={[{ id: 'mute', icon: 'speaker', label: chat.notifications === 'off' ? 'Включить уведомления' : 'Выключить уведомления' }, { id: 'call', icon: 'chat-video', label: 'Начать встречу' }, { id: 'search', icon: 'search', label: 'Поиск' }, { id: 'delete', icon: 'trash', label: 'Удалить чат', danger: true }, { id: 'block', icon: 'block', label: chat.blocked ? 'Разблокировать' : 'Заблокировать', danger: !chat.blocked }]} />}
    {contextMenu && <ChatContextMenu chat={chats.find(item => item.id === contextMenu.id)} anchor={contextMenu.anchor} onClose={closeMenu} onAction={menuAction} />}
    {messageMenu && (() => { const message = chat.messages.find(item => item.id === messageMenu.id); return message && <ChatActionMenu anchor={messageMenu.anchor} label="Действия с сообщением" onClose={closeMessageMenu} onAction={messageAction} items={messageActions(chat, message)} />; })()}
    {removedMessage && <div className="chat-delete-notice" role="status"><span>Сообщение удалено</span><button type="button" onClick={undoMessage}>Восстановить</button><button type="button" className="chat-icon-button" aria-label="Скрыть уведомление" onClick={() => setRemovedMessage(null)}><Icon name="close" /></button></div>}
    {forwarding && <Modal id="chat-forward-dialog" className="chat-new-dialog" labelledBy="chat-forward-title" onClose={() => setForwarding(null)}><CloseButton label="Закрыть пересылку" onClick={() => setForwarding(null)} /><h2 id="chat-forward-title">Переслать в чат</h2><div className="chat-contact-list">{activeChats.filter(item => !item.blocked).map(item => <button type="button" key={item.id} onClick={() => forwardTo(item.id)}><ChatAvatar chat={item} /><span>{item.title}</span><Icon name="forward" /></button>)}</div></Modal>}
    {deleted && <div className="chat-delete-notice" role="status"><span>Чат удалён</span><button type="button" onClick={undoDelete}>Восстановить</button><button type="button" className="chat-icon-button" aria-label="Скрыть уведомление" onClick={() => setDeleted(null)}><Icon name="close" /></button></div>}
    {newChat && <Modal id="new-chat-dialog" className="chat-new-dialog" labelledBy="new-chat-title" onClose={() => setNewChat(false)}><CloseButton label="Закрыть новый чат" onClick={() => setNewChat(false)} /><h2 id="new-chat-title">Новый чат</h2><div className="chat-contact-list">{chatContacts.map(contact => <button key={contact.id} type="button" onClick={() => startPersonal(contact)}><ChatAvatar chat={contact} /><span>{contact.title}</span><Icon name="arrow" /></button>)}</div></Modal>}
  </main>;
}
