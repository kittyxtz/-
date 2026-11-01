import { useEffect, useState } from 'react';
import { Icon } from './Icons';
import { readDevicePreferences } from '../lib/devicePreferences';
import { write } from '../lib/storage';

export default function DeviceSettings() {
  const [devices, setDevices] = useState([]), [selected, setSelected] = useState(readDevicePreferences), [status, setStatus] = useState('');
  async function refresh() {
    try { if (!navigator.mediaDevices?.enumerateDevices) { setStatus('Выбор устройств недоступен в этом браузере. Будут использованы системные настройки.'); return; } setDevices(await navigator.mediaDevices.enumerateDevices()); setStatus('Список устройств обновлён.'); }
    catch { setStatus('Не удалось получить список устройств. Проверьте разрешения браузера и обновите список.'); }
  }
  useEffect(() => { refresh(); navigator.mediaDevices?.addEventListener('devicechange', refresh); return () => navigator.mediaDevices?.removeEventListener('devicechange', refresh); }, []);
  function choose(key, value) {
    const next = { ...selected, [key]: value }; setSelected(next);
    try { write('sozvon-devices', next); setStatus('Выбор сохранён. Применится при следующем включении устройства.'); } catch { setStatus('Не удалось сохранить выбор. Разрешите хранение данных в браузере.'); }
  }
  return <div className="settings-group"><div className="settings-group-title"><h3>Устройства</h3><button type="button" className="settings-inline-link" onClick={refresh}><Icon name="reply" />Обновить</button></div><div className="device-select-grid">{[['mic', 'audioinput', 'Микрофон', 'mic'], ['camera', 'videoinput', 'Камера', 'video'], ['speaker', 'audiooutput', 'Вывод звука', 'speaker']].map(([key, kind, title, icon]) => <label key={key} className="product-select"><span><Icon name={icon} />{title}</span><select value={selected[key]} onChange={event => choose(key, event.target.value)}><option value="default">Как в системе</option>{devices.filter(device => device.kind === kind && device.deviceId && device.deviceId !== 'default').map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `${title} ${index + 1}`}</option>)}</select></label>)}</div><p className="settings-description">Названия устройств появятся после разрешения доступа к камере или микрофону. Поддержка выбора вывода зависит от браузера.</p><p className="settings-status" role="status">{status}</p></div>;
}
