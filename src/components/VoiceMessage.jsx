import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';
import { decodeWaveform, waveformBars } from '../lib/audioWaveform';

const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export default function VoiceMessage({ voice }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false), [current, setCurrent] = useState(0), [duration, setDuration] = useState(voice.duration || 1), [error, setError] = useState('');
  const [waveform, setWaveform] = useState(voice.waveform || Array(waveformBars).fill(0));
  useEffect(() => {
    let active = true;
    setWaveform(voice.waveform || Array(waveformBars).fill(0));
    if (!voice.waveform && !voice.unavailable) (async () => {
      try {
        const blob = voice.blob || await fetch(voice.url).then(response => { if (!response.ok) throw new Error(); return response.blob(); });
        const values = await decodeWaveform(blob); if (active && values) setWaveform(values);
      } catch { /* An undecodable waveform stays flat; playback remains available. */ }
    })();
    return () => { active = false; };
  }, [voice.blob, voice.url, voice.waveform, voice.unavailable]);
  async function toggle() {
    const node = audio.current;
    if (playing) { node.pause(); return; }
    try { if (node.ended) node.currentTime = 0; await node.play(); setError(''); }
    catch { setError('Не удалось воспроизвести. Нажмите ещё раз.'); }
  }
  if (voice.unavailable) return <p className="product-field-hint">Запись недоступна. Отправьте её повторно.</p>;
  return <div className="voice-message-player" data-playing={playing}>
    <audio ref={audio} src={voice.url} preload="metadata" onLoadedMetadata={event => { if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration); }} onTimeUpdate={event => setCurrent(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    <button type="button" className="voice-message-play" aria-label={playing ? 'Приостановить голосовое сообщение' : 'Воспроизвести голосовое сообщение'} onClick={toggle}><Icon name={playing ? 'pause' : 'play'} /></button>
    <div className="voice-message-track"><div className="voice-message-wave" aria-hidden="true" style={{ '--played': `${Math.min(100, current / duration * 100)}%` }}>{waveform.map((level, i) => <i key={i} style={{ height: `${2 + Math.min(1, Math.max(0, level)) * 18}px` }} />)}</div><input aria-label="Перемотка голосового сообщения" aria-valuetext={`${clock(current)} из ${clock(duration)}`} type="range" min="0" max={duration} step="0.1" value={Math.min(current, duration)} onChange={event => { audio.current.currentTime = Number(event.target.value); setCurrent(Number(event.target.value)); }} /><span className="voice-message-duration">{clock(playing || current > 0 ? current : duration)}<Icon name="mic" /></span></div>
    {error && <p className="voice-message-error" role="status">{error}</p>}
  </div>;
}
