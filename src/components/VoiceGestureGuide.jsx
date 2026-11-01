import { Icon } from './Icons';

export default function VoiceGestureGuide({ phase, progress, cancelled, onLock }) {
  if (phase === 'locked') return <span className="chat-voice-locked" role="status"><Icon name="lock" />Запись закреплена</span>;
  const up = cancelled ? 0 : 1 - (1 - progress.up) ** 2, left = cancelled ? 1 : 1 - (1 - progress.left) ** 2;
  return <span className={`chat-voice-guide${phase === 'locking' ? ' is-locking' : ''}${cancelled ? ' is-cancelled' : ''}`} style={{ '--voice-up': up, '--voice-left': left }}>
    <span className="visually-hidden" role="status">{cancelled ? 'Запись отменена' : phase === 'locking' ? 'Подержите, чтобы закрепить запись' : 'Потяните вверх к замку для закрепления или влево к корзине для отмены'}</span>
    <span className="chat-voice-lock-track" data-active={up > .6}>
      <button type="button" className="chat-voice-lock-target" aria-label="Закрепить запись" onClick={onLock}><svg className="chat-voice-lock-ring" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" pathLength="1" /></svg><Icon name="lock" /></button>
      <span className="chat-voice-arrow-up" aria-hidden="true"><span /><Icon name="chevron" /></span>
    </span>
    <span className="chat-voice-cancel-track" aria-hidden="true" data-active={left > .6}>
      <span className="chat-voice-trash-target"><Icon name="trash" /></span>
      <span className="chat-voice-cancel-hint">{cancelled ? 'Отменено' : 'Влево — отмена'}</span><span className="chat-voice-arrow-left"><Icon name="chevron" /></span>
    </span>
  </span>;
}
