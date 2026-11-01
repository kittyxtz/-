import { Icon } from './Icons';
export default function ChatAvatar({ chat, small = false }) {
  return <span className={`chat-avatar${small ? ' is-small' : ''}`} data-tone={chat.tone} aria-hidden="true">{chat.kind === 'meeting' ? <Icon name="chat-video" /> : chat.initials}</span>;
}
