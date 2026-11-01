import { Icon } from './Icons';
import { CloseButton, Modal } from './Primitives';

export default function ChatNotifications({ chat, onChange, onClose }) {
  const value = chat.notifications === 'hour' && chat.muteUntil <= Date.now() ? 'all' : chat.notifications || 'all';
  return <Modal id="chat-notifications" className="product-dialog" labelledBy="chat-notifications-title" onClose={onClose}><CloseButton onClick={onClose} /><span className="product-dialog-symbol"><Icon name="speaker" /></span><p className="product-eyebrow">{chat.title}</p><h2 id="chat-notifications-title">Уведомления</h2><p>Выберите, какие уведомления получать от этого чата.</p><div className="product-choice-list">{[['all', 'Все сообщения', 'Со звуком и счётчиком непрочитанного'], ['silent', 'Без звука', 'Сообщения остаются в списке чатов'], ['hour', 'Выключить на час', 'Тихая пауза, чтобы сосредоточиться'], ['off', 'Не уведомлять', 'Проверяйте новые сообщения, когда удобно']].map(([id, title, description]) => <label key={id}><Icon name={id === 'all' ? 'speaker' : 'moon'} /><span><strong>{title}</strong><small>{description}</small></span><input type="radio" name="chat-notification" value={id} checked={value === id} onChange={() => onChange(id)} /></label>)}</div><button type="button" className="product-button is-primary" onClick={onClose}>Готово<Icon name="check" /></button></Modal>;
}
