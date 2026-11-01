import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';
import { createVoiceGesture } from '../lib/voiceGesture';
import VoiceGestureGuide from './VoiceGestureGuide';
import { voiceCancelDuration } from '../lib/audioWaveform';

export default function HoldToRecordButton({ voice, disabled, onSend, lockedRequest = false, onPhaseChange }) {
  const latest = useRef({ voice, onSend, onPhaseChange }), control = useRef(null), suppressClick = useRef(false), mounted = useRef(true);
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState({ left: 0, up: 0 }), [cancelled, setCancelled] = useState(false);
  latest.current = { voice, onSend, onPhaseChange };
  if (!control.current) control.current = createVoiceGesture({
    start: () => { setCancelled(false); latest.current.voice.start(); },
    send: () => latest.current.voice.stop(latest.current.onSend),
    cancel: () => { if (mounted.current && latest.current.voice.status === 'recording') setCancelled(true); latest.current.voice.cancel({ animate: mounted.current }); },
    change: next => { setPhase(next); latest.current.onPhaseChange?.(next); },
    progress: setProgress,
  });
  const gesture = control.current;
  useEffect(() => {
    if (voice.status === 'idle' || voice.status === 'preview') gesture.reset();
  }, [voice.status, voice.error]);
  useEffect(() => {
    if (lockedRequest && ['requesting', 'recording'].includes(voice.status) && gesture.phase === 'idle') { gesture.begin('single-click'); gesture.lock(); }
  }, [lockedRequest, voice.status]);
  useEffect(() => {
    if (!cancelled) return;
    const timer = setTimeout(() => setCancelled(false), voiceCancelDuration);
    return () => clearTimeout(timer);
  }, [cancelled]);
  useEffect(() => {
    mounted.current = true;
    const blur = () => { if (gesture.phase !== 'locked') gesture.cancel(); };
    const move = event => gesture.move(event.pointerId, { x: event.clientX, y: event.clientY });
    const release = event => gesture.release(event.pointerId);
    const cancel = event => { if (gesture.input === event.pointerId && gesture.phase !== 'locked') gesture.cancel(); };
    window.addEventListener('blur', blur);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', cancel);
    return () => { mounted.current = false; window.removeEventListener('blur', blur); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', cancel); gesture.cancel(); };
  }, []);
  const locked = phase === 'locked', recording = voice.status === 'recording';
  const label = locked ? 'Отправить голосовое сообщение' : recording ? 'Отпустите для отправки, влево — отмена, вверх — закрепить' : 'Удерживайте для записи голосового сообщения';
  return <>
    {(recording || cancelled) && <VoiceGestureGuide phase={phase} progress={progress} cancelled={cancelled} onLock={() => gesture.lock()} />}
    <button type="button" className={`chat-send${locked ? '' : ' is-voice'}${recording && !locked ? ' is-recording' : ''}`} data-press-feedback="css" aria-label={label} title={label} disabled={disabled || ['stopping', 'cancelling'].includes(voice.status)}
      onPointerDown={event => {
        if (event.button !== 0 || event.isPrimary === false || disabled) return;
        if (gesture.phase === 'locked') { suppressClick.current = false; return; }
        event.preventDefault(); event.currentTarget.focus({ preventScroll: true });
        suppressClick.current = true;
        if (voice.status === 'idle' && gesture.begin(event.pointerId, { x: event.clientX, y: event.clientY })) { try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Window listeners keep the gesture active without capture. */ } }
      }}
      onKeyDown={event => {
        if (![' ', 'Enter', 'Escape', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Escape' || event.key === 'ArrowLeft') gesture.cancel();
        else if (event.key === 'ArrowUp') gesture.lock();
        else if (!event.repeat) {
          suppressClick.current = true;
          if (gesture.phase === 'locked') gesture.send();
          else if (voice.status === 'idle') gesture.begin(event.key);
        }
      }}
      onKeyUp={event => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); gesture.release(event.key); } }}
      onClick={event => { event.preventDefault(); if (!suppressClick.current && gesture.phase === 'locked') gesture.send(); suppressClick.current = false; }}
      onContextMenu={event => event.preventDefault()}><Icon name={locked ? 'send' : 'mic'} /></button>
  </>;
}
