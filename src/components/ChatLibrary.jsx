import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './Icons';
import { CloseButton, Modal } from './Primitives';
import { AttachmentPreview, saveAttachment, isImageFile, attachmentUrl } from './ChatAttachment';
import ChatAvatar from './ChatAvatar';
import VoiceMessage from './VoiceMessage';
import { contactPresenceLabel } from '../lib/chatPresence';
import useHorizontalPager from '../lib/useHorizontalPager';
import { messageAttachments } from '../lib/chatMessages';

export function ChatMaterials({ chat, members = [], onPerson, group = false }) {
  const [tab, setTab] = useState(group ? 'people' : 'media'), [preview, setPreview] = useState(null);
  const id = useId(), minimumHeight = useRef(0);
  const [panelHeight, setPanelHeight] = useState(null);
  const messages = chat?.messages || [];
  const files = messages.flatMap(message => messageAttachments(message).map((file, index) => ({ ...file, id: `${message.id}-${index}`, author: message.self ? 'Вы' : message.author })));
  const gif = file => file.type === 'image/gif' || /\.gif$/i.test(file.title);
  const media = files.filter(file => (isImageFile(file) || file.type?.startsWith('video/')) && !gif(file));
  const gifs = files.filter(gif);
  const documents = files.filter(file => !isImageFile(file) && !file.type?.startsWith('video/') && !gif(file));
  const recordings = messages.filter(message => message.voice).map(message => ({ ...message.voice, id: message.id, author: message.self ? 'Вы' : message.author, time: message.time }));
  const links = messages.flatMap(message => [...(message.text || '').matchAll(/https?:\/\/[^\s<>]+/g)].map(match => ({ url: match[0].replace(/[.,!?)]$/, ''), id: `${message.id}-${match.index}`, author: message.self ? 'Вы' : message.author })));
  const tabs = [{ id: 'people', label: 'Участники', count: group ? members.length : 0 }, { id: 'media', label: 'Медиа', count: media.length }, { id: 'voice', label: 'Голосовые', count: recordings.length }, { id: 'links', label: 'Ссылки', count: links.length }, { id: 'files', label: 'Файлы', count: documents.length }, { id: 'gifs', label: 'GIF', count: gifs.length }].filter(item => item.count > 0 || (group && item.id === 'people'));
  const active = tabs.some(item => item.id === tab) ? tab : tabs[0]?.id;
  const pager = useHorizontalPager({ index: Math.max(0, tabs.findIndex(item => item.id === active)), count: tabs.length, resetKey: chat?.id || id, onChange: index => setTab(tabs[index].id) });
  const tabIds = tabs.map(item => item.id).join(',');
  useLayoutEffect(() => {
    const panel = pager.viewport.current?.querySelector(`[data-material-page="${active}"]`);
    if (!panel) return;
    const measure = () => {
      const height = panel.getBoundingClientRect().height;
      minimumHeight.current = Math.min(320, Math.max(minimumHeight.current, height));
      setPanelHeight(Math.max(height, minimumHeight.current));
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(panel);
    pager.viewport.current.querySelectorAll('[aria-hidden=true] audio,[aria-hidden=true] video').forEach(media => media.pause());
    return () => observer.disconnect();
  }, [active, tabIds]);
  function renderContent(section) { return <>
    {section === 'people' && <ul className="chat-members-list">{members.map(member => { const role = { owner: 'Владелец', admin: 'Админ' }[member.role]; return <li key={member.id}><button type="button" onClick={() => onPerson?.(member)}><ChatAvatar chat={member} /><span>{member.title}<small className={`chat-member-presence${member.online ? ' is-online' : ''}`}>{contactPresenceLabel(member)}</small></span>{role && <span className="chat-member-role">{role}</span>}</button></li>; })}</ul>}
    {(section === 'media' || section === 'gifs') && <div className="profile-media-grid">{(section === 'gifs' ? gifs : media).map(file => file.type?.startsWith('video/') ? <video key={file.id} controls preload="metadata" src={attachmentUrl(file)} aria-label={file.title} /> : <button key={file.id} type="button" onClick={() => setPreview(file)} aria-label={`Открыть изображение: ${file.title}`}><img src={attachmentUrl(file)} alt={file.title} loading="lazy" /></button>)}</div>}
    {section === 'voice' && recordings.map(recording => <div className="profile-voice-row" key={recording.id}><p>{recording.author} · {recording.time}</p><VoiceMessage voice={recording} /></div>)}
    {section === 'files' && documents.map(file => <div className="library-file" key={file.id}><button type="button" onClick={() => setPreview(file)}><span className="library-file-symbol"><Icon name="file" /></span><span><strong>{file.title}</strong><small>{file.author} · {file.detail}</small></span></button><button type="button" aria-label={`Скачать: ${file.title}`} disabled={file.unavailable} onClick={() => saveAttachment(file)}><Icon name="download" /></button></div>)}
    {section === 'links' && links.map(link => <a className="library-link" key={link.id} href={link.url} target="_blank" rel="noreferrer"><span className="library-file-symbol"><Icon name="link" /></span><span><strong>{link.url}</strong><small>{link.author} · В новой вкладке</small></span><Icon name="arrow" /></a>)}
  </>; }
  return <section className="profile-materials" aria-label="Общие материалы">{!group && <h3>Общие материалы</h3>}{!tabs.length ? <p className="profile-materials-empty">Здесь появятся фотографии, голосовые, ссылки и файлы из переписки.</p> : <><div className="profile-material-tabs" role="tablist" aria-label="Материалы профиля" onKeyDown={event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); const index = tabs.findIndex(item => item.id === active), next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    setTab(tabs[next].id); event.currentTarget.querySelectorAll('[role=tab]')[next].focus();
  }}>{tabs.map(item => <button key={item.id} id={`${id}-${item.id}`} type="button" role="tab" aria-selected={active === item.id} aria-controls={`${id}-${item.id}-panel`} tabIndex={active === item.id ? 0 : -1} onClick={() => setTab(item.id)}>{item.label}<span>{item.count}</span></button>)}</div><div ref={pager.viewport} className="horizontal-pager profile-material-viewport" style={{ height: panelHeight ?? undefined }} {...pager.bindings}><div ref={pager.track} className="horizontal-pager-track">{tabs.map(item => <div key={item.id} data-material-page={item.id} id={`${id}-${item.id}-panel`} role="tabpanel" aria-labelledby={`${id}-${item.id}`} aria-hidden={active !== item.id || undefined} inert={active !== item.id} className="horizontal-pager-page profile-material-panel">{renderContent(item.id)}</div>)}</div>
  </div></>}{preview && <AttachmentPreview file={preview} onClose={() => setPreview(null)} />}</section>;
}

export default function ChatLibrary({ chat, onClose }) {
  return <Modal id="chat-library" className="product-dialog chat-library-dialog" labelledBy="library-title" onClose={onClose}><CloseButton onClick={onClose} /><p className="product-eyebrow">{chat.title}</p><h2 id="library-title">Общие материалы</h2><ChatMaterials chat={chat} /></Modal>;
}

