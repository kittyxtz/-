import { useCallback, useEffect, useRef, useState } from 'react';
import { readAudioPreferences, microphoneConstraints } from './audioPreferences';
import { selectedDevice } from './devicePreferences';

export default function useDevices() {
  const streams = useRef({ camera: null, mic: null, screen: null });
  const pending = useRef({ camera: false, mic: false, screen: false });
  const generation = useRef(0), mounted = useRef(true);
  const [devices, setDevices] = useState({ camera: null, mic: null, screen: null });
  const [busy, setBusy] = useState({}), [error, setError] = useState('');
  const sync = useCallback(() => { if (mounted.current) setDevices({ ...streams.current }); }, []);
  const stop = useCallback(() => {
    generation.current++;
    const previous = streams.current;
    streams.current = { camera: null, mic: null, screen: null };
    Object.values(previous).forEach(stream => stream?.getTracks().forEach(track => track.stop()));
    sync();
  }, [sync]);
  useEffect(() => {
    mounted.current = true;
    window.addEventListener('pagehide', stop);
    return () => { mounted.current = false; stop(); window.removeEventListener('pagehide', stop); };
  }, [stop]);
  async function toggle(type) {
    if (pending.current[type]) return;
    if (streams.current[type]) {
      const stream = streams.current[type]; streams.current[type] = null;
      stream.getTracks().forEach(track => track.stop()); sync(); setError(''); return;
    }
    if (!(type === 'screen' ? navigator.mediaDevices?.getDisplayMedia : navigator.mediaDevices?.getUserMedia)) {
      setError(type === 'screen' ? 'Показ экрана недоступен. Попробуйте другой браузер.' : 'Браузер не поддерживает доступ к устройствам. Откройте сайт в современном браузере по HTTPS.'); return;
    }
    const request = generation.current;
    pending.current[type] = true; setBusy({ ...pending.current }); setError('');
    try {
      const stream = type === 'screen' ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }) : await navigator.mediaDevices.getUserMedia(type === 'camera' ? { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user', ...selectedDevice('camera') }, audio: false } : { video: false, audio: { ...microphoneConstraints(readAudioPreferences()), ...selectedDevice('mic') } });
      if (!mounted.current || request !== generation.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streams.current[type] = stream;
      stream.getTracks().forEach(track => track.addEventListener('ended', () => {
        if (streams.current[type] === stream) { streams.current[type] = null; sync(); }
      }, { once: true }));
      sync();
    } catch (failure) {
      if (mounted.current && request === generation.current && !(type === 'screen' && failure.name === 'NotAllowedError')) {
        const device = type === 'camera' ? 'камере' : type === 'mic' ? 'микрофону' : 'экрану';
        setError(failure.name === 'NotAllowedError' ? `Разрешите доступ к ${device} в настройках браузера и попробуйте снова.` : failure.name === 'NotFoundError' ? 'Устройство не найдено. Подключите устройство и попробуйте снова.' : `Не удалось подключиться к ${device}. Закройте программы, которые используют устройство, и попробуйте снова.`);
      }
    } finally {
      pending.current[type] = false;
      if (mounted.current) setBusy({ ...pending.current });
    }
  }
  return { ...devices, busy, error, setError, toggle, stop };
}
