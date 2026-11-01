import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { AppContext } from './context';
import { conflict, dayKey, makeCode, normalizeMeetings, parseDay, validateMeeting } from './lib/meetings';
import { read, write } from './lib/storage';
import { exampleAttendees } from './lib/chatExamples';
import { readRoom, storeRoom, roomUrl } from './lib/roomSession';
import useScrollRestoration from './lib/useScrollRestoration';
import useRevealMotion from './lib/useRevealMotion';
import useTheme from './lib/useTheme';
import usePageNavigation from './lib/usePageNavigation';
import { usePressFeedback } from './lib/useMotion';
import { IconSymbols } from './components/Icons';
import Background from './components/Background';
import { Header, Footer } from './components/Layout';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import GuestPage from './pages/GuestPage';
import ChatsPage from './pages/ChatsPage';
import MeetingsView from './components/MeetingsView';
import MeetingSession from './components/MeetingSession';
import HelpDialog from './components/HelpDialog';
import ReminderBanner from './components/ReminderBanner';

const text = value => typeof value === 'string' ? value : '';
const params = new URLSearchParams(location.search);
const loadMeetings = () => normalizeMeetings(read('sozvon-meetings', []));
const sessionStore = () => { try { return sessionStorage; } catch { return null; } };

export default function App() {
  const navigation = usePageNavigation(), { page } = navigation;
  const [name, setName] = useState(() => text(read('sozvon-name', '')));
  const [authenticated, setAuthenticated] = useState(() => read('sozvon-session-preview', false) === true);
  function signInPreview() { try { write('sozvon-session-preview', true); } catch { /* The preview remains available in this tab. */ } setAuthenticated(true); }
  const [tone, setTone] = useState(() => { const saved = read('sozvon-avatar', 'blue'); return ['blue', 'mint', 'lavender'].includes(saved) ? saved : 'blue'; });
  const { theme, selectTheme, monet } = useTheme();
  const [room] = useState(() => page === 'meeting' ? readRoom(params, name, sessionStore()) : null);
  const [meetings, setMeetings] = useState(loadMeetings);
  const [selectedDay, setSelectedDay] = useState(() => {
    const day = params.get(page === 'meetings' ? 'day' : 'calendar'); return parseDay(day) ? day : dayKey(new Date());
  });
  const [calendar, setCalendar] = useState(() => page !== 'meetings' && (params.get('view') === 'meetings' || params.has('calendar')) ? {} : null);
  const [session, setSession] = useState(null), [helpOpen, setHelpOpen] = useState(params.has('help'));
  const [chatRequest, setChatRequest] = useState(null);
  const [toast, setToast] = useState(null);
  const notify = useCallback(message => setToast({ message, key: Date.now() }), []);
  useScrollRestoration();
  useRevealMotion();
  usePressFeedback();
  useEffect(() => { document.body.className = page === 'home' ? '' : `${page}-page`; document.title = ({ chats: 'Чаты — Созвон', meetings: 'Мои встречи — Созвон', profile: 'Настройки — Созвон', home: 'Созвон — на одной волне' })[page] || document.title; }, [page]);
  useEffect(() => { const close = () => { setCalendar(null); setSession(null); setHelpOpen(false); setToast(null); }; window.addEventListener('sozvon-route-change', close); return () => window.removeEventListener('sozvon-route-change', close); }, []);
  useEffect(() => {
    const handler = event => { if (event.key === 'sozvon-meetings' || event.key === null) setMeetings(loadMeetings()); };
    window.addEventListener('storage', handler); return () => window.removeEventListener('storage', handler);
  }, []);
  useEffect(() => {
    if (!calendar || page === 'meetings') return;
    document.body.classList.add('calendar-open'); return () => document.body.classList.remove('calendar-open');
  }, [calendar]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 4200); return () => clearTimeout(timer); }, [toast]);
  function openMeetings(day, options = {}) {
    if (parseDay(day)) setSelectedDay(day);
    if (page === 'meetings') return;
    if (matchMedia('(max-width: 760px)').matches) {
      const query = new URLSearchParams({ day: parseDay(day) ? day : selectedDay });
      if (options.created) query.set('created', options.created);
      navigation.navigateTab(`meetings.html?${query}`);
    } else setCalendar(options);
  }
  function openLobby(meeting, focusDevice) {
    setHelpOpen(false);
    const selected = meeting || { code: makeCode(), title: 'Проверка устройств', name: name.trim() || 'Гость' };
    setSession({ meeting: { ...selected, attendees: selected.attendees || exampleAttendees(selected.code) }, focusDevice });
  }
  function enterMeeting(meeting, devices) {
    storeRoom(meeting, devices, page, sessionStore());
    location.assign(roomUrl(meeting, location.href));
  }
  function openContactChat(contact) {
    if (page === 'chats') { setChatRequest({ contact }); setSession(null); }
    else location.assign(`./chats.html?chat=${encodeURIComponent(contact.id)}`);
  }
  function saveMeeting(title, day, time, options = {}) {
    const current = loadMeetings(), invalid = validateMeeting(title, day, time, current);
    if (invalid) throw Object.assign(new Error(invalid.message), { field: invalid.field });
    const meeting = { code: makeCode(), title: title.trim(), date: new Date(`${day}T${time}`).toISOString(), duration: options.duration || 30, reminder: options.reminder || 0 };
    const next = normalizeMeetings([...current, meeting]);
    try { write('sozvon-meetings', next); } catch { throw new Error('Не удалось сохранить встречу. Разрешите хранение данных в браузере и попробуйте снова.'); }
    setMeetings(next); return meeting;
  }
  function updateMeeting(code, title, day, time, options = {}) {
    const current = loadMeetings(), existing = current.find(meeting => meeting.code === code);
    if (!existing) throw new Error('Встреча больше не найдена. Закройте окно и обновите календарь.');
    const invalid = validateMeeting(title, day, time, current.filter(meeting => meeting.code !== code));
    if (invalid) throw Object.assign(new Error(invalid.message), { field: invalid.field });
    const meeting = { ...existing, title: title.trim(), date: new Date(`${day}T${time}`).toISOString(), duration: options.duration || 30, reminder: options.reminder || 0 };
    const next = normalizeMeetings(current.map(item => item.code === code ? meeting : item));
    try { write('sozvon-meetings', next); } catch { throw new Error('Не удалось сохранить встречу. Разрешите хранение данных в браузере и попробуйте снова.'); }
    setMeetings(next); return meeting;
  }
  function cancelMeeting(meeting) {
    const next = loadMeetings().filter(item => item.code !== meeting.code);
    const previous = localStorage.getItem('sozvon-last-cancelled');
    try { write('sozvon-last-cancelled', meeting); write('sozvon-meetings', next); }
    catch (error) {
      try { if (previous === null) localStorage.removeItem('sozvon-last-cancelled'); else localStorage.setItem('sozvon-last-cancelled', previous); } catch { /* Preserve what storage allows. */ }
      throw error;
    }
    setMeetings(next);
  }
  function restoreMeeting() {
    const cancelled = normalizeMeetings([read('sozvon-last-cancelled', null)])[0];
    if (!cancelled) throw new Error('Отменённая встреча не найдена. Откройте календарь заново.');
    const current = loadMeetings();
    if (conflict(current, cancelled.date)) throw new Error('Это время уже занято. Добавьте встречу на другое время.');
    const next = normalizeMeetings([...current, cancelled]);
    try { write('sozvon-meetings', next); } catch { throw new Error('Не удалось восстановить встречу. Разрешите хранение данных в браузере и попробуйте снова.'); }
    try { localStorage.removeItem('sozvon-last-cancelled'); } catch { /* The restored meeting is already saved. */ }
    setMeetings(next); return cancelled;
  }
  const context = { meetings, selectedDay, setSelectedDay, saveMeeting, updateMeeting, cancelMeeting, restoreMeeting, notify, setHelpOpen, openContactChat, openMeetings, authenticated, signInPreview, navigateTab: navigation.navigateTab, openProfileTab: navigation.openProfileTab, navigationTarget: navigation.target, settleNavigation: navigation.settleNavigation };
  const skipId = page === 'meeting' ? 'meeting-main' : page === 'chats' ? 'chats-main' : page === 'guest' ? 'guest-main' : page === 'auth' ? 'auth-main' : page === 'profile' ? 'profile-main' : page === 'meetings' ? 'calendar-main' : 'main';
  return <AppContext.Provider value={context}><Background /><a className="skip" href={`#${skipId}`}>Перейти к содержимому</a><IconSymbols /><Header {...{ page, name, tone, openMeetings }} />
    <div ref={navigation.view} className="product-route-view"><Fragment key={navigation.version}>{page === 'meeting' ? <div id="meeting-main" className="meeting-session-page">{room ? <MeetingSession standalone meeting={room} tone={tone} onClose={() => location.assign(room.returnTo)} /> : <div className="chat-no-selection"><h1>Встреча не найдена</h1><a href="./chats.html">К чатам</a></div>}</div> : page === 'chats' ? <ChatsPage {...{ name, tone, openLobby, chatRequest }} /> : page === 'guest' ? <GuestPage {...{ name, setName, openLobby }} /> : page === 'auth' ? <AuthPage /> : page === 'home' ? <HomePage {...{ name, setName, tone, openLobby, openMeetings }} /> : page === 'profile' ? <ProfilePage {...{ name, setName, tone, setTone, theme, selectTheme, monet }} /> : <MeetingsView standalone created={new URLSearchParams(location.search).get('created')} />}</Fragment></div>
    {!['guest', 'chats', 'meeting'].includes(page) && <Footer openMeetings={openMeetings} compact={page === 'auth'} />}
    {calendar && page !== 'meetings' && <MeetingsView key={`${calendar.created || 'browse'}`} created={calendar.created} onClose={() => setCalendar(null)} />}
    {session && <MeetingSession {...session} tone={tone} onClose={() => setSession(null)} onEnter={enterMeeting} />}
    {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} onDemo={() => openLobby()} />}
    <ReminderBanner />
    {toast && <Toast key={toast.key} message={toast.message} />}
  </AppContext.Provider>;
}

function Toast({ message }) {
  const ref = useRef(null);
  useEffect(() => { ref.current.showPopover(); }, []);
  return <div ref={ref} id="toast" className="toast visible" role="status" aria-live="polite" popover="manual">{message}</div>;
}
