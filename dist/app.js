'use strict';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const storage = {
  get(key, fallback = null) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
};
let mode = 'create';
let currentMeeting = null;
let inCall = false;
let cameraStream = null;
let micStream = null;
let screenStream = null;
let timer = null;
let toastTimer = null;
const cameraPending = { value: false };
const micPending = { value: false };
const words = ['air', 'sky', 'wave', 'kite', 'wind', 'blue', 'flow', 'cloud'];
const makeCode = () => `${words[crypto.getRandomValues(new Uint8Array(1))[0] % words.length]}-${words[crypto.getRandomValues(new Uint8Array(1))[0] % words.length]}-${100 + crypto.getRandomValues(new Uint16Array(1))[0] % 900}`;
const codePattern = /^[a-z0-9]{2,12}-[a-z0-9]{2,12}-\d{3}$/i;
function meetingUrl(code) { const url = new URL(location.href); url.search = ''; url.hash = ''; url.searchParams.set('room', code); return url.href; }
function getCode(value) { let code = value.trim(); try { code = new URL(code).searchParams.get('room') || ''; } catch {} return codePattern.test(code) ? code.toLowerCase() : null; }
function notify(message) {
  const toast = $('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  if (toast.showPopover && !toast.matches(':popover-open')) toast.showPopover();
  toast.classList.add('visible');
  toastTimer = setTimeout(() => { toast.classList.remove('visible'); if (toast.hidePopover && toast.matches(':popover-open')) toast.hidePopover(); toast.textContent = ''; }, 4200);
}
function setMode(nextMode, focus = false) {
  mode = nextMode;
  const join = mode === 'join';
  for (const tab of [$('#create-tab'), $('#join-tab')]) {
    const selected = tab.id === (join ? 'join-tab' : 'create-tab');
    tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  }
  $('#meeting-form-panel').setAttribute('aria-labelledby', join ? 'join-tab' : 'create-tab');
  $('#form-title').textContent = join ? 'Войти во встречу' : 'Начать встречу';
  $('#form-description').textContent = join ? 'Вставьте приглашение — и вы на месте.' : 'Одна ссылка для всех, кого ждёте.';
  $('#room-field').hidden = join; $('#join-field').hidden = !join;
  $('#submit-label').textContent = join ? 'Присоединиться' : 'Создать встречу';
  $('#schedule-button').hidden = join;
  clearErrors();
}
$('#create-tab').addEventListener('click', () => setMode('create'));
$('#join-tab').addEventListener('click', () => setMode('join'));
$('.mode-switch').addEventListener('keydown', (event) => {
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); setMode(event.key === 'Home' ? 'create' : event.key === 'End' ? 'join' : mode === 'create' ? 'join' : 'create', true); }
});
function fieldError(input, output, message) { input.setAttribute('aria-invalid', 'true'); output.textContent = message; output.hidden = false; }
function clearErrors() { for (const id of ['display-name', 'meeting-code']) $(`#${id}`).removeAttribute('aria-invalid'); for (const id of ['name-error', 'code-error']) { $(`#${id}`).hidden = true; $(`#${id}`).textContent = ''; } }
$('#display-name').value = storage.get('sozvon-name', '');
$('#header-avatar').textContent = (storage.get('sozvon-name', '') || 'Я').slice(0, 1).toUpperCase();
const avatarTone = storage.get('sozvon-avatar', 'blue');
if (['blue','mint','lavender'].includes(avatarTone)) $('#header-avatar').dataset.tone = avatarTone;
$('#display-name').addEventListener('input', () => { $('#display-name').removeAttribute('aria-invalid'); $('#name-error').hidden = true; });
$('#meeting-code').addEventListener('input', () => { $('#meeting-code').removeAttribute('aria-invalid'); $('#code-error').hidden = true; });
$('#meeting-form').addEventListener('submit', (event) => {
  event.preventDefault(); clearErrors();
  const name = $('#display-name').value.trim();
  if (!name) { fieldError($('#display-name'), $('#name-error'), 'Введите имя, которое увидят собеседники.'); $('#display-name').focus(); return; }
  const code = mode === 'join' ? getCode($('#meeting-code').value) : makeCode();
  if (!code) { fieldError($('#meeting-code'), $('#code-error'), 'Вставьте ссылку Созвона или код в формате air-kite-482.'); $('#meeting-code').focus(); return; }
  storage.set('sozvon-name', name);
  $('#header-avatar').textContent = name.slice(0, 1).toUpperCase();
  openLobby({ name, code, title: mode === 'join' ? 'Встреча по приглашению' : $('#room-name').value.trim() || 'Наш созвон' });
});
function openLobby(meeting) {
  currentMeeting = meeting;
  const tone = storage.get('sozvon-avatar', 'blue');
  for (const id of ['lobby-avatar','room-avatar']) $(`#${id}`).dataset.tone = ['blue','mint','lavender'].includes(tone) ? tone : 'blue';
  $('#lobby-meeting-name').textContent = meeting.title;
  $('#share-link').value = meetingUrl(meeting.code);
  $('#lobby-avatar').textContent = meeting.name.slice(0, 1).toUpperCase();
  $('#device-error').textContent = '';
  $('#copy-link').setAttribute('aria-label', 'Скопировать ссылку на встречу');
  $('#lobby-dialog').showModal();
}
async function copyLink(button) {
  if (!currentMeeting) return;
  try {
    await navigator.clipboard.writeText(meetingUrl(currentMeeting.code));
    button.setAttribute('aria-label', 'Ссылка скопирована'); notify('Ссылка скопирована');
  } catch {
    if ($('#lobby-dialog').open) { $('#share-link').focus(); $('#share-link').select(); $('#device-error').textContent = 'Скопируйте выделенную ссылку сочетанием Ctrl+C или через меню браузера.'; }
    else { $('#help-dialog').showModal(); const p = document.createElement('p'); p.textContent = `Скопируйте ссылку: ${meetingUrl(currentMeeting.code)}`; p.style.overflowWrap = 'anywhere'; $('#help-dialog').append(p); }
  }
}
$('#copy-link').addEventListener('click', () => copyLink($('#copy-link')));
$('#room-copy').addEventListener('click', () => copyLink($('#room-copy')));
function deviceMessage(message) { $('#device-error').textContent = message; $('#room-device-error').textContent = message; }
function refreshDevices() {
  const cameraOn = Boolean(cameraStream?.getVideoTracks().some(track => track.readyState === 'live'));
  const micOn = Boolean(micStream?.getAudioTracks().some(track => track.readyState === 'live'));
  $$('.camera-toggle').forEach(button => { button.setAttribute('aria-pressed', String(cameraOn)); button.setAttribute('aria-label', cameraOn ? 'Выключить камеру' : 'Включить камеру'); });
  $$('.mic-toggle').forEach(button => { button.setAttribute('aria-pressed', String(micOn)); button.setAttribute('aria-label', micOn ? 'Выключить микрофон' : 'Включить микрофон'); });
  for (const id of ['preview-video', 'room-video']) { const video = $(`#${id}`); video.srcObject = cameraStream; video.hidden = !cameraOn; }
  $('#lobby-avatar').hidden = cameraOn; $('#room-avatar').hidden = cameraOn;
  $('#preview-caption').hidden = cameraOn;
  $('#tile-device-state').textContent = micOn ? 'Микрофон включён' : 'Микрофон выключен';
}
async function toggleDevice(type) {
  const isCamera = type === 'camera';
  const pending = isCamera ? cameraPending : micPending;
  if (pending.value) return;
  let stream = isCamera ? cameraStream : micStream;
  if (stream) { stream.getTracks().forEach(track => track.stop()); if (isCamera) cameraStream = null; else micStream = null; refreshDevices(); deviceMessage(''); return; }
  if (!navigator.mediaDevices?.getUserMedia) { deviceMessage('Браузер не поддерживает доступ к устройствам. Попробуйте открыть сайт в современном браузере по HTTPS.'); return; }
  pending.value = true;
  $$(`.${type}-toggle`).forEach(button => { button.disabled = true; });
  deviceMessage('');
  try {
    stream = await navigator.mediaDevices.getUserMedia(isCamera ? { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false } : { video: false, audio: { echoCancellation: true, noiseSuppression: true } });
    if (!inCall && !$('#lobby-dialog').open) { stream.getTracks().forEach(track => track.stop()); return; }
    if (isCamera) cameraStream = stream; else micStream = stream;
    stream.getTracks().forEach(track => track.addEventListener('ended', () => { if (isCamera) cameraStream = null; else micStream = null; refreshDevices(); }));
  } catch (error) {
    const device = isCamera ? 'камере' : 'микрофону';
    deviceMessage(error.name === 'NotAllowedError' ? `Разрешите доступ к ${device} в настройках браузера и попробуйте снова.` : error.name === 'NotFoundError' ? `Устройство не найдено. Подключите ${isCamera ? 'камеру' : 'микрофон'} и попробуйте снова.` : `Не удалось подключиться к ${device}. Закройте программы, которые используют устройство, и попробуйте снова.`);
  } finally { pending.value = false; $$(`.${type}-toggle`).forEach(button => { button.disabled = false; }); refreshDevices(); }
}
$$('.camera-toggle').forEach(button => button.addEventListener('click', () => toggleDevice('camera')));
$$('.mic-toggle').forEach(button => button.addEventListener('click', () => toggleDevice('mic')));
function stopDevices() {
  for (const stream of [cameraStream, micStream, screenStream]) stream?.getTracks().forEach(track => track.stop());
  cameraStream = null; micStream = null; screenStream = null;
  $('#screen-preview').srcObject = null; $('#screen-preview').hidden = true;
  $('#share-screen').setAttribute('aria-pressed', 'false'); $('#share-screen').setAttribute('aria-label', 'Показать экран');
  refreshDevices();
}
$('#lobby-dialog').addEventListener('close', () => { if (!inCall) stopDevices(); });
function setPageInert(value) { for (const element of [$('.skip'), $('.header'), $('#main'), $('.footer')]) element.inert = value; }
$('#enter-room').addEventListener('click', () => {
  inCall = true; $('#lobby-dialog').close(); setPageInert(true);
  $('#call-room').hidden = false; document.body.style.overflow = 'hidden';
  $('#call-title').textContent = currentMeeting.title; $('#tile-name').textContent = `${currentMeeting.name} · Вы`; $('#room-avatar').textContent = currentMeeting.name.slice(0, 1).toUpperCase();
  document.title = `${currentMeeting.title} — Созвон`;
  const started = Date.now(); $('#call-timer').textContent = '00:00';
  clearInterval(timer); timer = setInterval(() => { const seconds = Math.floor((Date.now() - started) / 1000); $('#call-timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }, 1000);
  $('#call-title').tabIndex = -1; $('#call-title').focus(); refreshDevices();
});
$('#leave-room').addEventListener('click', () => {
  inCall = false; clearInterval(timer); stopDevices(); $('#call-room').hidden = true; setPageInert(false); document.body.style.overflow = ''; document.title = 'Созвон — ближе, где бы вы ни были';
  $('#meeting-form button[type=submit]').focus(); notify('Вы вышли из демокомнаты');
});
$('#share-screen').addEventListener('click', async () => {
  if (screenStream) { screenStream.getTracks().forEach(track => track.stop()); finishSharing(); return; }
  if (!navigator.mediaDevices?.getDisplayMedia) { deviceMessage('Показ экрана недоступен в этом браузере. Попробуйте настольный Chrome, Edge или Firefox.'); return; }
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    if (!inCall) { screenStream.getTracks().forEach(track => track.stop()); screenStream = null; return; }
    $('#screen-preview').srcObject = screenStream; $('#screen-preview').hidden = false;
    $('#share-screen').setAttribute('aria-pressed', 'true'); $('#share-screen').setAttribute('aria-label', 'Остановить показ экрана');
    screenStream.getVideoTracks()[0].addEventListener('ended', finishSharing, { once: true }); deviceMessage('');
  } catch (error) { if (error.name !== 'NotAllowedError') deviceMessage('Не удалось показать экран. Выберите доступное окно и попробуйте снова.'); }
});
function finishSharing() { screenStream = null; $('#screen-preview').srcObject = null; $('#screen-preview').hidden = true; $('#share-screen').setAttribute('aria-pressed', 'false'); $('#share-screen').setAttribute('aria-label', 'Показать экран'); }
$('#demo-button').addEventListener('click', () => { $('#help-dialog').close(); openLobby({ code: makeCode(), title: 'Знакомство с Созвоном', name: $('#display-name').value.trim() || 'Гость' }); });
$('#help-button').addEventListener('click', () => $('#help-dialog').showModal());
$('#room-help').addEventListener('click', () => $('#help-dialog').showModal());
$$('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$$('dialog').forEach(dialog => dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }));
function localDateTime(date) { const pad = n => String(n).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function openSchedule() {
  const next = new Date(Date.now() + 60 * 60 * 1000); next.setMinutes(Math.ceil(next.getMinutes() / 15) * 15, 0, 0);
  $('#scheduled-time').min = localDateTime(new Date()); $('#scheduled-time').value = localDateTime(next);
  $('#scheduled-name').value = $('#room-name').value.trim(); $('#schedule-error').hidden = true;
  $('#scheduled-name').removeAttribute('aria-invalid'); $('#scheduled-time').removeAttribute('aria-invalid');
  $('#schedule-dialog').showModal();
}
$('#schedule-button').addEventListener('click', openSchedule);
$('#plan-from-list').addEventListener('click', () => { $('#meetings-dialog').close(); openSchedule(); });
$('#schedule-form').addEventListener('submit', (event) => {
  event.preventDefault(); const title = $('#scheduled-name').value.trim(); const date = new Date($('#scheduled-time').value);
  $('#scheduled-name').removeAttribute('aria-invalid'); $('#scheduled-time').removeAttribute('aria-invalid');
  const invalid = !title ? $('#scheduled-name') : !Number.isFinite(date.getTime()) || date.getTime() <= Date.now() ? $('#scheduled-time') : null;
  if (invalid) { $('#schedule-error').textContent = !title ? 'Введите название, чтобы найти встречу в списке.' : 'Выберите дату и время в будущем.'; $('#schedule-error').hidden = false; invalid.setAttribute('aria-invalid', 'true'); invalid.setAttribute('aria-describedby', 'schedule-error'); invalid.focus(); return; }
  const meetings = storage.get('sozvon-meetings', []);
  const meeting = { code: makeCode(), title, date: date.toISOString() };
  if (!storage.set('sozvon-meetings', [...(Array.isArray(meetings) ? meetings : []), meeting])) { $('#schedule-error').textContent = 'Не удалось сохранить встречу. Разрешите хранение данных в браузере и попробуйте снова.'; $('#schedule-error').hidden = false; return; }
  $('#schedule-dialog').close(); renderMeetings(); $('#meetings-dialog').showModal(); notify('Встреча сохранена в этом браузере');
});
function renderMeetings() {
  const list = $('#meetings-list'); list.replaceChildren();
  const data = storage.get('sozvon-meetings', []);
  const meetings = (Array.isArray(data) ? data : []).filter(meeting => meeting && typeof meeting.title === 'string' && codePattern.test(meeting.code) && Number.isFinite(Date.parse(meeting.date))).sort((a,b) => Date.parse(a.date) - Date.parse(b.date));
  if (!meetings.length) { const p = document.createElement('p'); p.className = 'empty-list'; p.textContent = 'Здесь будут ваши планы на разговор. Создайте первую встречу — и она появится в списке.'; list.append(p); return; }
  for (const meeting of meetings) {
    const item = document.createElement('article'); item.className = 'saved-meeting';
    const title = document.createElement('h3'); title.textContent = meeting.title;
    const date = document.createElement('p'); date.textContent = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(meeting.date));
    const actions = document.createElement('div'); actions.className = 'saved-actions';
    const open = document.createElement('button'); open.textContent = 'Открыть'; open.addEventListener('click', () => { $('#meetings-dialog').close(); openLobby({ ...meeting, name: $('#display-name').value.trim() || storage.get('sozvon-name', '') || 'Гость' }); });
    const download = document.createElement('button'); download.textContent = 'В календарь'; download.addEventListener('click', () => downloadCalendar(meeting));
    actions.append(open, download); item.append(title, date, actions); list.append(item);
  }
}
function downloadCalendar(meeting) {
  const escape = value => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const stamp = date => new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sozvon//Meetings//RU', 'BEGIN:VEVENT', `UID:${meeting.code}@sozvon`, `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(meeting.date)}`, `DTEND:${stamp(Date.parse(meeting.date) + 3600000)}`, `SUMMARY:${escape(meeting.title)}`, `DESCRIPTION:${escape('Демонстрационная встреча в Созвоне. ' + meetingUrl(meeting.code))}`, `URL:${meetingUrl(meeting.code)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `sozvon-${meeting.code}.ics`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#my-meetings').addEventListener('click', () => { renderMeetings(); $('#meetings-dialog').showModal(); });
function themeLabel() { $('#theme-toggle').setAttribute('aria-label', document.documentElement.dataset.theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'); }
themeLabel();
$('#theme-toggle').addEventListener('click', () => {
  const root = document.documentElement; root.classList.add('theme-changing');
  const dark = root.dataset.theme !== 'dark'; root.dataset.theme = dark ? 'dark' : 'light';
  try { localStorage.setItem('sozvon-theme', dark ? 'dark' : 'light'); } catch {}
  $('meta[name=theme-color]').content = dark ? '#101722' : '#f8f9fc';
  themeLabel(); void root.offsetHeight; requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-changing')));
});
const requestedCode = getCode(new URL(location.href).searchParams.get('room') || '');
if (requestedCode) { setMode('join'); $('#meeting-code').value = requestedCode; $('#display-name').focus(); }
if (!requestedCode && new URL(location.href).searchParams.get('view') === 'meetings') { renderMeetings(); $('#meetings-dialog').showModal(); }
window.addEventListener('pagehide', stopDevices);
refreshDevices();
