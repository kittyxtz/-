import { Icon } from './Icons';
import { messageDelivery } from '../lib/messageDelivery';

export default function MessageDelivery({ message, className = '' }) {
  const state = messageDelivery(message);
  return state && <span className={`chat-delivery ${className}`} data-delivery={message.delivery || 'sent'} role="img" aria-label={state.label} title={state.label}><Icon name={state.icon} /></span>;
}
