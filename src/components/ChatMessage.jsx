import { Icon } from './Icons';
import { messageSummary } from '../lib/chatMessages';
import MessageDelivery from './MessageDelivery';
import ChatAttachment, { isImageFile } from './ChatAttachment';
import VoiceMessage from './VoiceMessage';

export default function ChatMessage({ message, group, contact, selected, selecting, onProfile, onReply, onMenu, onSelect, mobile = false }) {
  const person = contact || { title: message.author, initials: message.author?.[0], tone: message.tone };
  return <article data-message-id={message.id} className={`chat-message${message.self ? ' is-self' : ''}${selected ? ' is-message-selected' : ''}`} aria-label={`${message.self ? 'Вы' : message.author}, ${message.time}`}>
    {selecting && <button type="button" className="chat-message-select" aria-label={selected ? 'Снять выделение сообщения' : 'Выделить сообщение'} aria-pressed={selected} onClick={onSelect}><Icon name="check" /></button>}
    {!message.self && <button type="button" className="chat-message-avatar" data-tone={message.tone} aria-label={`Открыть профиль: ${person.title}`} onClick={() => onProfile(person)}>{message.author?.slice(0, 1)}</button>}
    <div className="chat-message-body">
      <div className="chat-message-toolbar"><button type="button" aria-label="Действия с сообщением" aria-haspopup="menu" onClick={event => onMenu(event.currentTarget)}><Icon name="more" /></button></div>
      <div className={`chat-bubble${message.file ? ' has-file' : ''}${message.voice ? ' has-voice' : ''}${message.file && isImageFile(message.file) && !message.file.unavailable ? ' has-photo' : ''}`} tabIndex={0} role="group" aria-label={`Сообщение: ${messageSummary(message)}`} aria-haspopup="menu" onClick={event => { if (mobile && !event.target.closest('button,a,input,audio,video')) { if (selecting) onSelect(); else onMenu(event.currentTarget); } }} onContextMenu={event => { event.preventDefault(); onMenu(event.currentTarget); }} onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey) || (mobile && ['Enter', ' '].includes(event.key))) { event.preventDefault(); onMenu(event.currentTarget); }
      }}>
        {message.pinned && <span className="chat-message-annotation"><Icon name="pin" />Закреплено</span>}
        {message.forwarded && <span className="chat-message-annotation"><Icon name="forward" />Переслано: <bdi>{message.forwarded}</bdi></span>}
        {!message.self && group && <button type="button" className="chat-message-author" data-tone={message.tone} aria-label={`Открыть профиль: ${person.title}`} onClick={() => onProfile(person)}>{message.author}</button>}
        {message.reply && <blockquote className="chat-reply-quote"><strong>{message.reply.author}</strong><span>{message.reply.text}</span></blockquote>}
        {message.text && <p className="chat-message-text">{message.text}{!message.file && !message.voice && <span className="chat-time-space" aria-hidden="true" />}</p>}
        {message.file && <ChatAttachment file={message.file} />}
        {message.voice && <VoiceMessage voice={message.voice} />}
        <span className="chat-message-meta"><time>{message.time}</time><MessageDelivery message={message} /></span>
      </div>
    </div>
    {mobile && <span className="chat-swipe-reply-icon" aria-hidden="true"><Icon name="reply" /></span>}
  </article>;
}
