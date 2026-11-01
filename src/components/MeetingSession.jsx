import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context';
import { meetingUrl, pad } from '../lib/meetings';
import useDevices from '../lib/useDevices';
import { Icon } from './Icons';
import { CloseButton, Modal } from './Primitives';
import LobbyPresence from './LobbyPresence';
import RoomSidebar from './RoomSidebar';

function Video({ stream, ...props }) {
  const ref = useRef(null);
  useEffect(() => { const node = ref.current; node.srcObject = stream; return () => { node.srcObject = null; }; }, [stream]);
  return <video ref={ref} autoPlay muted playsInline hidden={!stream} {...props} />;
}

function SessionFrame({ standalone, children, labelledBy, initialFocus, onClose, ...props }) {
  const ref = useRef(null);
  useEffect(() => { if (standalone && initialFocus) ref.current?.querySelector(initialFocus)?.focus({ preventScroll: true }); }, [standalone, initialFocus]);
  return standalone ? <section ref={ref} {...props} aria-labelledby={labelledBy}>{children}</section> : <Modal {...props} labelledBy={labelledBy} initialFocus={initialFocus} onClose={onClose}>{children}</Modal>;
}

export default function MeetingSession({ meeting, tone, onClose, focusDevice, standalone = false, onEnter }) {
  const { notify, setHelpOpen } = useApp();
  const [inCall, setInCall] = useState(standalone), [seconds, setSeconds] = useState(0);
  const [reaction, setReaction] = useState('');
  useEffect(() => { if (!reaction) return; const timer = setTimeout(() => setReaction(''), 1800); return () => clearTimeout(timer); }, [reaction]);
  const media = useDevices(), shareInput = useRef(null);
  const letter = meeting.name.slice(0, 1).toUpperCase();
  useEffect(() => {
    if (!inCall) return;
    const started = Date.now(), previousTitle = document.title, previousOverflow = document.body.style.overflow;
    document.title = `${meeting.title} — Созвон`; document.body.style.overflow = 'hidden';
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => { clearInterval(timer); document.title = previousTitle; document.body.style.overflow = previousOverflow; };
  }, [inCall, meeting.title]);
  useEffect(() => {
    if (!standalone) return;
    const timer = setTimeout(() => {
      if (meeting.devices?.mic) media.toggle('mic');
      if (meeting.devices?.camera) media.toggle('camera');
    }, 0);
    return () => clearTimeout(timer);
  }, [standalone]);
  function leave() { media.stop(); onClose(); notify('Вы вышли из встречи'); }
  async function copy() {
    try { await navigator.clipboard.writeText(meetingUrl(meeting.code)); notify('Ссылка скопирована'); }
    catch {
      if (shareInput.current) { shareInput.current.focus(); shareInput.current.select(); }
      media.setError(inCall ? `Скопируйте ссылку: ${meetingUrl(meeting.code)}` : 'Скопируйте выделенную ссылку через меню браузера.');
    }
  }
  const deviceButton = type => <button type="button" className={`device-button ${type}-toggle`} aria-label={`${media[type] ? 'Выключить' : 'Включить'} ${type === 'camera' ? 'камеру' : 'микрофон'}`} aria-pressed={Boolean(media[type])} disabled={media.busy[type]} onClick={() => media.toggle(type)}><Icon name={type === 'camera' ? 'video' : 'mic'} /><span className="off-slash" /></button>;
  if (!inCall) return <SessionFrame standalone={standalone} id="lobby-dialog" className={`lobby-shell${meeting.joining ? ' has-participants' : ''}`} labelledBy="lobby-title" onClose={() => { media.stop(); onClose(); }} initialFocus={focusDevice === 'mic' ? '.mic-toggle' : focusDevice === 'camera' ? '.camera-toggle' : focusDevice === 'screen' ? '#enter-room' : undefined}><div className="lobby-dialog lobby-card"><CloseButton onClick={() => { media.stop(); onClose(); }} label="Закрыть подготовку к встрече" /><div className="lobby-grid"><div className="lobby-preview-column"><div className="preview" id="lobby-preview"><Video id="preview-video" stream={media.camera} /><span className="avatar" id="lobby-avatar" data-tone={tone} hidden={Boolean(media.camera)}>{letter}</span><span className="preview-caption" id="preview-caption" hidden={Boolean(media.camera)}>Камера выключена</span><div className="device-buttons">{deviceButton('mic')}{deviceButton('camera')}</div></div></div><div className="lobby-content"><h2 id="lobby-title">Перед встречей</h2><p id="lobby-meeting-name">{meeting.title}</p><div className="field glass-field share-field"><label htmlFor="share-link">Ссылка на встречу</label><span className="copy-control"><input ref={shareInput} id="share-link" aria-label="Ссылка на встречу" value={meetingUrl(meeting.code)} readOnly /><button type="button" className="icon-button" id="copy-link" aria-label="Скопировать ссылку на встречу" onClick={copy}><Icon name="copy" /></button></span></div><button type="button" className="primary-button" id="enter-room" disabled={media.busy.mic || media.busy.camera} onClick={() => { if (onEnter) onEnter(meeting, { mic: Boolean(media.mic), camera: Boolean(media.camera) }); else { setSeconds(0); setInCall(true); } }}>Присоединиться<Icon name="arrow" /></button><p className="prototype-note">{meeting.attendees?.length ? 'Статусы участников показаны для примера.' : 'Подключение других участников пока недоступно.'}</p><p className="device-error" id="device-error" role="status">{media.error}</p></div></div></div>{meeting.joining && <LobbyPresence attendees={meeting.attendees} />}</SessionFrame>;
  return <SessionFrame standalone={standalone} id="call-room" className="call-room" labelledBy="call-title" onClose={leave} initialFocus="#call-title"><header className="call-header"><span className="brand call-brand"><span className="brand-mark"><Icon name="air" /></span>созвон.</span><div><h1 id="call-title" tabIndex={-1}>{meeting.title}</h1><span className="call-status">Предпросмотр<span aria-hidden="true"> · </span><time id="call-timer">{pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}</time></span></div><button type="button" className="call-invite" id="room-copy" onClick={copy}><Icon name="link" />Скопировать ссылку</button></header><main className="call-main product-call-main"><div className="self-tile"><Video id="room-video" stream={media.camera} /><span className="avatar" id="room-avatar" data-tone={tone} hidden={Boolean(media.camera)}>{letter}</span>{!media.camera && <div className="room-self-caption"><strong>Вы готовы к встрече</strong><span>Камера выключена. Включите её, когда удобно.</span></div>}{reaction && <span className="room-self-reaction" role="status" aria-label={`Ваша реакция: ${reaction}`}>{reaction}</span>}<span className="tile-name" id="tile-name">{meeting.name} · Вы</span><span className="tile-device-state" id="tile-device-state">Микрофон {media.mic ? 'включён' : 'выключен'}</span></div><RoomSidebar meeting={meeting} tone={tone} onInvite={copy} onReaction={emoji => { setReaction(emoji); notify(`Ваша реакция: ${emoji}`); }} /><Video id="screen-preview" stream={media.screen} /></main><footer className="call-controls"><div className="controls-group">{deviceButton('mic')}{deviceButton('camera')}<button type="button" className="device-button" id="share-screen" aria-label={media.screen ? 'Остановить показ экрана' : 'Показать экран'} aria-pressed={Boolean(media.screen)} disabled={media.busy.screen} onClick={() => media.toggle('screen')}><Icon name="monitor" /></button></div><p id="room-device-error" role="status">{media.error}</p><button type="button" className="leave-button" id="leave-room" aria-label="Выйти из встречи" onClick={leave}><Icon name="call-end" /><span>Выйти</span></button></footer></SessionFrame>;
}
