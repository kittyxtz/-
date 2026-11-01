import { useEffect, useRef, useState } from 'react';
import { selectedDevice } from './devicePreferences';
import { microphoneConstraints, readAudioPreferences } from './audioPreferences';
import { decodeWaveform, signalRms, visibleAudioLevel, waveformFromLevels, voiceCancelDuration } from './audioWaveform';

export default function useVoiceRecorder(scope) {
  const [status, setStatus] = useState('idle'), [clip, setClip] = useState(null), [seconds, setSeconds] = useState(0), [error, setError] = useState('');
  const [levels, setLevels] = useState(() => Array(19).fill(0));
  const meter = useRef(null), capturedLevels = useRef([]), cancelTimer = useRef(null);
  const recorder = useRef(null), stream = useRef(null), generation = useRef(0), preview = useRef(null), started = useRef(0), requesting = useRef(false), completion = useRef(null);
  function dispose() {
    clearTimeout(cancelTimer.current); cancelTimer.current = null;
    stopMeter();
    generation.current++;
    requesting.current = false;
    completion.current = null;
    if (recorder.current) { recorder.current.onstop = null; recorder.current.onerror = null; if (recorder.current.state !== 'inactive') recorder.current.stop(); recorder.current = null; }
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    if (preview.current) URL.revokeObjectURL(preview.current.url); preview.current = null;
  }
  function stopMeter() {
    if (!meter.current) return;
    clearInterval(meter.current.timer); meter.current.source?.disconnect();
    meter.current.context.close().catch(() => {}); meter.current = null;
  }
  function startMeter(audio) {
    capturedLevels.current = []; setLevels(Array(19).fill(0));
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return;
    try {
      const context = new Audio(); meter.current = { context };
      const source = context.createMediaStreamSource(audio), analyser = context.createAnalyser();
      analyser.fftSize = 1024; source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      const timer = setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        const level = visibleAudioLevel(signalRms(samples)); capturedLevels.current.push(level);
        setLevels(previous => [...previous.slice(-18), level]);
      }, 80);
      meter.current = { context, source, timer }; context.resume().catch(() => {});
    } catch { stopMeter(); }
  }
  function cancel({ animate = false } = {}) {
    const fading = animate && ['recording', 'preview'].includes(status);
    dispose(); setClip(null); setError('');
    if (fading) {
      setStatus('cancelling');
      cancelTimer.current = setTimeout(() => { cancelTimer.current = null; setStatus('idle'); setSeconds(0); setLevels(Array(19).fill(0)); }, voiceCancelDuration);
    } else { setStatus('idle'); setSeconds(0); setLevels(Array(19).fill(0)); }
  }
  useEffect(() => { cancel(); window.addEventListener('pagehide', cancel); return () => { window.removeEventListener('pagehide', cancel); dispose(); }; }, [scope]);
  useEffect(() => {
    if (status !== 'recording') return;
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started.current) / 1000)), 250);
    return () => clearInterval(timer);
  }, [status]);
  async function start() {
    if (status !== 'idle') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('Запись недоступна. Попробуйте другой браузер.'); return; }
    const request = ++generation.current; requesting.current = true; setStatus('requesting'); setError('');
    try {
      const audio = await navigator.mediaDevices.getUserMedia({ audio: { ...microphoneConstraints(readAudioPreferences()), ...selectedDevice('mic') } });
      if (request !== generation.current) { audio.getTracks().forEach(track => track.stop()); return; }
      requesting.current = false;
      stream.current = audio;
      const media = new MediaRecorder(audio), chunks = []; recorder.current = media;
      media.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      media.onstop = async () => {
        stopMeter();
        audio.getTracks().forEach(track => track.stop()); stream.current = null;
        if (request !== generation.current) return;
        const blob = new Blob(chunks, { type: media.mimeType });
        if (!blob.size) { setError('Звук не записался. Попробуйте ещё раз.'); setStatus('idle'); return; }
        const duration = Math.max(1, Math.round((Date.now() - started.current) / 1000));
        const fallback = waveformFromLevels(capturedLevels.current);
        const waveform = await decodeWaveform(blob) || fallback;
        if (request !== generation.current) return;
        const result = { blob, url: URL.createObjectURL(blob), duration, waveform };
        recorder.current = null;
        const done = completion.current; completion.current = null;
        if (done) { setClip(null); setStatus('idle'); setSeconds(0); done(result); }
        else { preview.current = result; setClip(result); setStatus('preview'); }
      };
      media.onerror = () => { cancel(); setError('Не удалось записать сообщение. Попробуйте ещё раз.'); };
      started.current = Date.now(); media.start(); startMeter(audio); setSeconds(0); setStatus('recording');
    } catch (failure) {
      if (request !== generation.current) return;
      cancel(); setError(failure.name === 'NotAllowedError' ? 'Разрешите доступ к микрофону в настройках браузера и повторите запись.' : 'Не удалось включить микрофон. Проверьте подключение и повторите запись.');
    }
  }
  function stop(onComplete) {
    if (recorder.current?.state === 'recording') {
      completion.current = typeof onComplete === 'function' ? onComplete : null;
      setStatus('stopping');
      recorder.current.stop();
    } else if (requesting.current) {
      // Releasing before microphone permission arrives must not start a late recording.
      cancel();
    }
  }
  return { status, clip, seconds, levels, error, start, cancel, stop, take() { const result = preview.current; preview.current = null; setClip(null); setStatus('idle'); setSeconds(0); return result; } };
}
