'use strict';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const storage = {
  get(key, fallback = null) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
};
let mode = 'create';
const modeReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let modeAnimation = null;
let footerAnimations=[],footerGhost=null;
function clearFooterMotion(){footerAnimations.forEach(animation=>animation.cancel());footerAnimations=[];footerGhost?.remove();footerGhost=null;}
function animateFooter(previous,next,direction,duration){
  clearFooterMotion();if(modeReducedMotion.matches)return;
  const ghost=previous.cloneNode(true);ghost.removeAttribute('id');ghost.hidden=false;ghost.inert=true;ghost.setAttribute('aria-hidden','true');ghost.classList.add('footer-ghost');$('.meeting-actions').append(ghost);footerGhost=ghost;
  const options={duration,easing:'cubic-bezier(.2,.8,.2,1)'};
  const outgoing=ghost.animate([{transform:'translateY(0)',opacity:1},{transform:`translateY(${-direction*24}px)`,opacity:0}],options);footerAnimations.push(outgoing);
  if(next)footerAnimations.push(next.animate([{transform:`translateY(${direction*24}px)`,opacity:0},{transform:'translateY(0)',opacity:1}],options));
  outgoing.finished.then(()=>{ghost.remove();if(footerGhost===ghost)footerGhost=null;}).catch(()=>ghost.remove());
}
let scheduleReturnMode = 'create';
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
  const fromSchedule = mode === 'schedule';
  const direction = nextMode === 'join' ? 1 : -1;
  const changed = mode !== nextMode;
  modeAnimation?.cancel();
  mode = nextMode;
  $('.meeting-panel').dataset.view = mode;
  $('.mode-switch').hidden = false;
  $('.mode-switch').inert = false;
  $('#meeting-form-panel').hidden = false;
  $('#meeting-form-panel').inert = false;
  $('#schedule-panel').hidden = true;
  $('#schedule-panel').inert = true;
  $('#schedule-back').hidden = true;
  const join = mode === 'join';
  $('.mode-switch').style.setProperty('--mode-position', join ? '100%' : '0%');
  for (const tab of [$('#create-tab'), $('#join-tab')]) {
    const selected = tab.id === (join ? 'join-tab' : 'create-tab');
    tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  }
  $('#meeting-form-panel').setAttribute('aria-labelledby', join ? 'join-tab' : 'create-tab');
  $('#form-title').textContent = join ? 'Присоединиться ко встрече' : 'Начать встречу';
  $('#form-description').textContent = join ? 'Вставьте приглашение — и вы на месте.' : 'Одна ссылка для всех, кого ждёте.';
  $('#room-field').hidden = join; $('#join-field').hidden = !join;
  $('#submit-label').textContent = join ? 'Присоединиться' : 'Создать встречу';
  $('#schedule-button').hidden = join;
  if(fromSchedule)animateFooter($('#schedule-back'),join?null:$('#schedule-button'),-1,320);else clearFooterMotion();
  clearErrors();
  if (changed && !modeReducedMotion.matches && typeof $('#meeting-form-panel').animate === 'function') {
    modeAnimation = $('#meeting-form-panel').animate([
      { transform: fromSchedule ? 'translateY(-24px)' : `translateX(${direction * 24}px)`, opacity: .25 },
      { transform: 'translateX(0)', opacity: 1 }
    ], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
}
modeReducedMotion.addEventListener('change', () => { if (modeReducedMotion.matches) {modeAnimation?.cancel();clearFooterMotion();} });
$('#create-tab').addEventListener('click', () => setMode('create'));
$('#join-tab').addEventListener('click', () => setMode('join'));
$('.mode-switch').addEventListener('keydown', (event) => {
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); setMode(event.key === 'Home' ? 'create' : event.key === 'End' ? 'join' : mode === 'create' ? 'join' : 'create', true); }
});
let titleExpanded = $('#room-field').open;
let titleAnimation = null;
const titleSummary = $('#room-field summary');
titleSummary.addEventListener('click', event => {
  event.preventDefault();
  const details = $('#room-field');
  const reveal = $('.title-reveal');
  const startHeight = details.open ? reveal.getBoundingClientRect().height : 0;
  const startOpacity = details.open ? Number(getComputedStyle(reveal).opacity) : 0;
  const startTransform = details.open ? getComputedStyle(reveal).transform : 'translateY(-12px)';
  titleAnimation?.cancel();
  titleExpanded = !titleExpanded;
  const expanding = titleExpanded;
  titleSummary.querySelector('.title-toggle-label').textContent = expanding ? 'Скрыть название' : 'Добавить название';
  $('#room-field').dataset.expanded = String(expanding);
  if (modeReducedMotion.matches || typeof reveal.animate !== 'function') { details.open = expanding; return; }
  details.open = true;
  const animation = reveal.animate([
    { height: `${startHeight}px`, opacity: startOpacity, transform: startTransform === 'none' ? 'translateY(0)' : startTransform },
    { height: `${expanding ? reveal.scrollHeight : 0}px`, opacity: expanding ? 1 : 0, transform: expanding ? 'translateY(0)' : 'translateY(-12px)' }
  ], { duration: expanding ? 310 : 240, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
  titleAnimation = animation;
  animation.finished.then(() => {
    if (titleAnimation !== animation) return;
    details.open = expanding; animation.cancel(); titleAnimation = null;
  }).catch(() => {});
});
modeReducedMotion.addEventListener('change', () => { if (modeReducedMotion.matches) { titleAnimation?.cancel(); titleAnimation = null; $('#room-field').open = titleExpanded; } });
function fieldError(input, output, message) { input.setAttribute('aria-invalid', 'true'); output.textContent = message; output.hidden = false; }
function clearErrors() { for (const id of ['display-name', 'meeting-code']) $(`#${id}`).removeAttribute('aria-invalid'); for (const id of ['name-error', 'code-error']) { $(`#${id}`).hidden = true; $(`#${id}`).textContent = ''; } }
$('#display-name').value = storage.get('sozvon-name', '');
function updateStudioIdentity() {
  const name = $('#display-name').value.trim();
  $('#studio-preview-name').textContent = name || 'Вы';
  $('#studio-preview-avatar').textContent = (name || 'Я').slice(0, 1).toUpperCase();
  const tone = storage.get('sozvon-avatar', 'blue');
  if (['blue','mint','lavender'].includes(tone)) $('#studio-preview-avatar').dataset.tone = tone;
}
$('#display-name').addEventListener('input', updateStudioIdentity); updateStudioIdentity();
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
  (mode === 'schedule' ? $('#schedule-back') : $('#meeting-form button[type=submit]')).focus(); notify('Вы вышли из демокомнаты');
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
function openDemoRoom() { if ($('#help-dialog').open) $('#help-dialog').close(); openLobby({ code: makeCode(), title: 'Знакомство с Созвоном', name: $('#display-name').value.trim() || 'Гость' }); }
$('#demo-button').addEventListener('click', openDemoRoom);
$('#try-room').addEventListener('click', openDemoRoom);
$$('[data-device-preview]').forEach(button => button.addEventListener('click', () => {
  openDemoRoom();
  const selector = button.dataset.devicePreview === 'mic' ? '#lobby-dialog .mic-toggle' : button.dataset.devicePreview === 'camera' ? '#lobby-dialog .camera-toggle' : '#enter-room';
  $(selector).focus();
}));
$('#help-button').addEventListener('click', () => $('#help-dialog').showModal());
$('#room-help').addEventListener('click', () => $('#help-dialog').showModal());
$$('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$$('dialog:not(#meetings-modal)').forEach(dialog => dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }));
function localDateTime(date) { const pad = n => String(n).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
const planningCalendar = SozvonCalendar.mount($('#plan-date-calendar'), {
  compact: true,
  minDate: SozvonCalendar.dayKey(new Date()),
  selectedDate: SozvonCalendar.dayKey(new Date()),
  onSelect(key) {
    $('#scheduled-time').value = `${key}T${$('#scheduled-clock').value || '10:00'}`;
    syncPlanningControls(); $('#plan-date-dialog').hidePopover(); dateTrigger.focus({preventScroll:true});
  }
});
function syncPlanningControls() {
  const [key,time] = $('#scheduled-time').value.split('T');
  if (!SozvonCalendar.parseDay(key)) return;
  $('#schedule-date-label').textContent = new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short'}).format(SozvonCalendar.parseDay(key));
  $('#scheduled-clock').value = time?.slice(0,5) || '';
  window.SozvonTime?.setDate($('#scheduled-clock'),key);
  const actualTime=$('#scheduled-clock').value;
  $('#scheduled-time').value = `${key}T${actualTime}`;
  planningCalendar.setSelected(key);
}
const datePopover=$('#plan-date-dialog'),dateTrigger=$('#schedule-date-trigger');
function placeDatePopover(){if(!datePopover.matches(':popover-open'))return;const rect=dateTrigger.getBoundingClientRect(),width=Math.min(320,innerWidth-24);datePopover.style.width=`${width}px`;datePopover.style.left=`${Math.max(12,Math.min(rect.left,innerWidth-width-12))}px`;datePopover.style.top=`${rect.bottom+8}px`;datePopover.style.maxHeight=`${Math.max(160,innerHeight-rect.bottom-20)}px`;}
dateTrigger.setAttribute('aria-controls','plan-date-dialog');dateTrigger.setAttribute('aria-expanded','false');
dateTrigger.addEventListener('click',()=>{if(datePopover.matches(':popover-open')){datePopover.hidePopover();return;}syncPlanningControls();datePopover.showPopover();placeDatePopover();planningCalendar.focusDay(planningCalendar.selected);});
datePopover.addEventListener('toggle',()=>{dateTrigger.setAttribute('aria-expanded',String(datePopover.matches(':popover-open')));});
$('#close-plan-date').addEventListener('click',()=>{datePopover.hidePopover();dateTrigger.focus({preventScroll:true});});
addEventListener('resize',placeDatePopover);addEventListener('scroll',placeDatePopover,{passive:true});
$('#scheduled-clock').addEventListener('input', () => {
  const key = $('#scheduled-time').value.split('T')[0] || SozvonCalendar.dayKey(new Date());
  $('#scheduled-time').value = `${key}T${$('#scheduled-clock').value}`;
  $('#scheduled-clock').removeAttribute('aria-invalid'); $('#schedule-error').hidden = true;
});
function openSchedule(event) {
  const next = new Date(Date.now() + 60 * 60 * 1000); next.setMinutes(Math.ceil(next.getMinutes() / 15) * 15, 0, 0);

  if (!Number.isFinite(Date.parse($('#scheduled-time').value)) || Date.parse($('#scheduled-time').value) <= Date.now()) $('#scheduled-time').value = localDateTime(next);
  if (!$('#scheduled-name').value.trim()) $('#scheduled-name').value = $('#room-name').value.trim();
  $('#schedule-error').hidden = true;
  $('#scheduled-name').removeAttribute('aria-invalid'); $('#scheduled-clock').removeAttribute('aria-invalid'); $('#schedule-date-trigger').removeAttribute('aria-invalid');
  syncPlanningControls();
  if (mode !== 'schedule') scheduleReturnMode = mode;
  modeAnimation?.cancel(); mode = 'schedule';
  $('.meeting-panel').dataset.view = 'schedule';
  $('.mode-switch').hidden = true; $('.mode-switch').inert = true;
  $('#meeting-form-panel').hidden = true; $('#meeting-form-panel').inert = true;
  $('#schedule-panel').hidden = false; $('#schedule-panel').inert = false;
  $('#schedule-button').hidden = true; $('#schedule-back').hidden = false;
  animateFooter($('#schedule-button'),$('#schedule-back'),1,420);
  if (!modeReducedMotion.matches && typeof $('#schedule-panel').animate === 'function') {
    modeAnimation = $('#schedule-panel').animate([{ transform: 'translateY(70%)', opacity: .2 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  if (event?.currentTarget !== $('#schedule-button')) $('.meeting-panel').scrollIntoView({ block: 'center', behavior: modeReducedMotion.matches ? 'instant' : 'smooth' });
  $('#schedule-title').focus({ preventScroll: true });
}
$('#schedule-button').addEventListener('click', openSchedule);
function closeSchedule() { setMode(scheduleReturnMode); (scheduleReturnMode === 'create' ? $('#schedule-button') : $('#join-tab')).focus({ preventScroll: true }); }
$('#schedule-back').addEventListener('click', closeSchedule);
$('.meeting-panel').addEventListener('keydown', event => { if (event.key === 'Escape' && mode === 'schedule') { event.preventDefault(); closeSchedule(); } });
$('#schedule-form').addEventListener('submit', (event) => {
  event.preventDefault(); const title = $('#scheduled-name').value.trim(); const date = new Date($('#scheduled-time').value);
  $('#scheduled-name').removeAttribute('aria-invalid'); $('#scheduled-clock').removeAttribute('aria-invalid'); $('#schedule-date-trigger').removeAttribute('aria-invalid');
  const invalid = !title ? $('#scheduled-name') : !Number.isFinite(date.getTime()) || date.getTime() <= Date.now() ? $('#scheduled-clock') : null;
  if (invalid) { $('#schedule-error').textContent = !title ? 'Введите название, чтобы найти встречу в списке.' : 'Выберите дату и время в будущем.'; $('#schedule-error').hidden = false; invalid.setAttribute('aria-invalid', 'true'); invalid.setAttribute('aria-describedby', 'schedule-error'); window.SozvonTime.focus(invalid); return; }
  const meetings = storage.get('sozvon-meetings', []);
  const existing = SozvonCalendar.conflict(Array.isArray(meetings)?meetings:[],date);
  if(existing){$('#schedule-error').textContent='На это время уже запланирована встреча. Выберите другое время.';$('#schedule-error').hidden=false;$('#scheduled-clock').setAttribute('aria-invalid','true');window.SozvonTime.focus($('#scheduled-clock'));return;}
  const meeting = { code: makeCode(), title, date: date.toISOString() };
  if (!storage.set('sozvon-meetings', [...(Array.isArray(meetings) ? meetings : []), meeting])) { $('#schedule-error').textContent = 'Не удалось сохранить встречу. Разрешите хранение данных в браузере и попробуйте снова.'; $('#schedule-error').hidden = false; return; }
  window.SozvonMeetings.open(SozvonCalendar.dayKey(date), {created:meeting.code});
});

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
if (requestedCode) { setMode('join'); $('#meeting-code').value = requestedCode; $('#display-name').focus({preventScroll:true}); }
if (!requestedCode && new URL(location.href).searchParams.get('view') === 'meetings') window.SozvonMeetings.open();
$$('[data-start-meeting]').forEach(link => link.addEventListener('click', () => { setMode('create'); requestAnimationFrame(() => $('#display-name').focus({ preventScroll: true })); }));
const scenarioStories = {
  work: { label: 'СОБРАТЬСЯ ПО ДЕЛУ', number: '01', headline: ['Одна команда.', 'Разные координаты.'], description: 'Сверить планы, показать проект, найти решение. Встретьтесь там, где удобно всем, — в разговоре.', detail: 'Обсудить. Показать. Договориться.' },
  close: { label: 'ОСТАТЬСЯ РЯДОМ', number: '02', headline: ['Рядом.', 'Даже издалека.'], description: 'Увидеть улыбку, рассказать о своём дне, остаться ещё на чашку чая. Между вами города, а разговор — совсем близко.', detail: 'Услышать. Улыбнуться. Обнять голосом.' },
  ideas: { label: 'ПРИДУМАТЬ ЧТО-ТО НОВОЕ', number: '03', headline: ['А если…', 'сделать вместе?'], description: 'Набросать замысел, подхватить неожиданную мысль, найти единомышленников. Дайте идее голос — и посмотрите, что получится.', detail: 'Предложить. Подхватить. Придумать.' }
};
const scenarioTabs = $$('[data-scenario]');
function positionScenarioMarker(animate = true) {
  const list = $('.scenario-tabs');
  const marker = $('.scenario-marker');
  const active = scenarioTabs.find(tab => tab.getAttribute('aria-selected') === 'true');
  if (!active) return;
  const number = active.querySelector('.scenario-number');
  let x=number.offsetLeft,y=number.offsetTop,parent=number.offsetParent;
  while(parent&&parent!==list){x+=parent.offsetLeft;y+=parent.offsetTop;parent=parent.offsetParent;}
  if (!animate) list.classList.remove('marker-motion');
  marker.style.transform = `translate3d(${x + (number.offsetWidth - marker.offsetWidth)/2}px, ${y + (number.offsetHeight - marker.offsetHeight)/2}px, 0)`;
  marker.style.opacity = '1';
  if (!animate) { void marker.offsetWidth; list.classList.add('marker-motion'); }
}
const scenarioReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const wavePatterns={work:[5,14,9,23,16,7,20,12,5],close:[4,8,16,24,19,13,8,5,3],ideas:[12,5,20,9,25,7,16,22,10]};
let waveAnimations=[];
function updateScenarioWave(key,animate=true){
  const bars=[...$('#scenario-page').querySelectorAll('.scenario-wave i')],heights=bars.map(bar=>getComputedStyle(bar).height);waveAnimations.forEach(animation=>animation.cancel());waveAnimations=[];
  bars.forEach((bar,index)=>{const height=wavePatterns[key][index];bar.style.height=`${height}px`;if(animate&&!scenarioReducedMotion.matches)waveAnimations.push(bar.animate([{height:heights[index]},{height:`${Math.max(3,height*.4)}px`,offset:.2},{height:`${Math.min(26,height*1.15)}px`,offset:.48},{height:`${height*.5}px`,offset:.72},{height:`${height}px`}],{duration:560,delay:index*30,easing:'ease-in-out'}));});
}
let scenarioAnimation = null;
let scenarioGhostAnimation = null;
let scenarioGhost = null;
function clearScenarioAnimation() {
  scenarioAnimation?.cancel(); scenarioGhostAnimation?.cancel(); scenarioGhost?.remove();
  scenarioAnimation = null; scenarioGhostAnimation = null; scenarioGhost = null;
}
scenarioReducedMotion.addEventListener('change', () => { if (scenarioReducedMotion.matches) {clearScenarioAnimation();waveAnimations.forEach(animation=>animation.cancel());} });
function selectScenario(key, focus = false, directionHint = 0) {
  const story = scenarioStories[key];
  if (!story) return;
  const panel = $('#scenario-panel');
  const page = $('#scenario-page');
  const previous = scenarioTabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
  const next = scenarioTabs.findIndex(tab => tab.dataset.scenario === key);
  if (previous === next) { if (focus) scenarioTabs[next].focus(); return; }
  const animate = !scenarioReducedMotion.matches && typeof page.animate === 'function';
  const currentStyle = getComputedStyle(page);
  const previousTransform = currentStyle.transform;
  const previousOpacity = currentStyle.opacity;
  clearScenarioAnimation();
  if (animate) {
    scenarioGhost = page.cloneNode(true);
    scenarioGhost.removeAttribute('id');
    scenarioGhost.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    scenarioGhost.classList.add('scenario-ghost');
    scenarioGhost.setAttribute('aria-hidden', 'true'); scenarioGhost.inert = true;
    Object.assign(scenarioGhost.style, { left: `${page.offsetLeft}px`, top: `${page.offsetTop}px`, width: `${page.offsetWidth}px`, height: `${page.offsetHeight}px` });
    panel.append(scenarioGhost);
  }
  for (const tab of scenarioTabs) {
    const selected = tab.dataset.scenario === key;
    tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
    if (selected) { panel.setAttribute('aria-labelledby', tab.id); if (focus) tab.focus(); }
  }
  positionScenarioMarker();
  panel.dataset.scene = key;
  $('#scenario-headline').replaceChildren(document.createTextNode(story.headline[0]), document.createElement('br'), document.createTextNode(story.headline[1]));
  $('#scenario-description').textContent = story.description;
  $('#scenario-detail').textContent = story.detail;
  updateScenarioWave(key);
  if (animate) {
    const direction = directionHint || Math.sign(next - previous);
    const distance = panel.clientHeight + 16;
    const easing = 'cubic-bezier(.22,.75,.2,1)';
    const ghost = scenarioGhost;
    const outgoing = ghost.animate([
      { transform: previousTransform === 'none' ? 'translateY(0)' : previousTransform, opacity: Number(previousOpacity) },
      { transform: `translateY(${-direction * distance}px)`, opacity: .15 }
    ], { duration: 420, easing, fill: 'both' });
    scenarioGhostAnimation = outgoing;
    outgoing.finished.then(() => { ghost.remove(); if (scenarioGhost === ghost) { scenarioGhost = null; scenarioGhostAnimation = null; } }).catch(() => {});
    const incoming = page.animate([
      { transform: `translateY(${direction * distance}px)`, opacity: .3 },
      { transform: 'translateY(0)', opacity: 1 }
    ], { duration: 480, easing });
    scenarioAnimation = incoming;
    incoming.finished.then(() => { if (scenarioAnimation === incoming) scenarioAnimation = null; }).catch(() => {});
  }
}
scenarioTabs.forEach(tab => tab.addEventListener('click', () => selectScenario(tab.dataset.scenario)));
$('.scenario-tabs').addEventListener('keydown', event => {
  if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const active = scenarioTabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? scenarioTabs.length - 1 : (active + (['ArrowUp','ArrowLeft'].includes(event.key) ? -1 : 1) + scenarioTabs.length) % scenarioTabs.length;
  const direction = event.key === 'Home' ? -1 : event.key === 'End' ? 1 : ['ArrowUp','ArrowLeft'].includes(event.key) ? -1 : 1;
  selectScenario(scenarioTabs[next].dataset.scenario, true, direction);
});
const scenarioNarrow = matchMedia('(max-width: 760px)');
const updateScenarioOrientation = () => { $('.scenario-tabs').setAttribute('aria-orientation', scenarioNarrow.matches ? 'horizontal' : 'vertical'); positionScenarioMarker(false); };
scenarioNarrow.addEventListener('change', updateScenarioOrientation); updateScenarioOrientation();
new ResizeObserver(() => positionScenarioMarker(false)).observe($('.scenario-tabs'));
updateScenarioWave('work',false);
document.fonts.ready.then(() => positionScenarioMarker(false));
window.addEventListener('pagehide', stopDevices);
refreshDevices();

if(new URL(location.href).searchParams.has('help'))$('#help-dialog').showModal();
