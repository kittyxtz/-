import { Children, Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../context';
import { dayKey, formatDate, formatDay, meetingUrl, nextSlot, parseDay, plural } from '../lib/meetings';
import Calendar from './Calendar';
import { Icon } from './Icons';
import { CloseButton, Modal } from './Primitives';
import ScheduleForm from './ScheduleForm';
import useMediaQuery from '../lib/useMediaQuery';
import useMotion from '../lib/useMotion';
import ChatActionMenu from './ChatActionMenu';
import { exportMeeting } from '../lib/downloads';

export default function MeetingsView({ standalone = false, created, onClose }) {
  const { meetings, selectedDay, setSelectedDay, cancelMeeting, restoreMeeting } = useApp();
  const [adding, setAdding] = useState(false), [saved, setSaved] = useState(created), [celebrating, setCelebrating] = useState(Boolean(created));
  const [notice, setNotice] = useState(null), [editing, setEditing] = useState(null);
  const [live, setLive] = useState('');
  const [agendaRevision, setAgendaRevision] = useState(0);
  const addButton = useRef(null);
  const contentRoot = useRef(null), agenda = useRef(null), noticeRef = useRef(null), dialogRef = useRef(null), closing = useRef(false), announce = useRef(false);
  const focusUndo = useRef(false);
  const modalMotion = useMotion(), agendaMotion = useMotion(), savedMotion = useMotion();
  const date = parseDay(selectedDay), today = dayKey(new Date());
  const daily = meetings.filter(item => dayKey(new Date(item.date)) === selectedDay);
  const upcoming = daily.filter(item => Date.parse(item.date) >= Date.now()), past = daily.filter(item => Date.parse(item.date) < Date.now());
  const savedMeeting = meetings.find(item => item.code === saved);
  useLayoutEffect(() => {
    if (!announce.current) return;
    announce.current = false; agendaMotion.clear();
    agendaMotion.animate(agenda.current, [{ opacity: 0, transform: 'translateX(12px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 300, easing: 'cubic-bezier(.22,.75,.2,1)' });
  }, [selectedDay, meetings, agendaRevision, agendaMotion]);
  useLayoutEffect(() => {
    if (focusUndo.current && notice?.undo) { focusUndo.current = false; noticeRef.current?.querySelector('button')?.focus({ preventScroll: true }); }
  }, [notice]);
  useLayoutEffect(() => {
    savedMotion.clear();
    if (!savedMeeting) return;
    const node = contentRoot.current;
    savedMotion.animate(node.querySelector('.calendar-page-heading p'), [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 400, easing: 'cubic-bezier(.2,.8,.2,1)' });
    savedMotion.animate([...node.querySelectorAll('.agenda-meeting')].find(item => item.dataset.code === saved), [{ opacity: .3, transform: 'translateY(10px)', backgroundColor: 'rgba(80,135,230,.24)' }, { opacity: 1, transform: 'translateY(0)', backgroundColor: 'rgba(80,135,230,.15)', offset: .35 }, { opacity: 1, transform: 'translateY(0)', backgroundColor: 'transparent' }], { duration: 1500, easing: 'cubic-bezier(.2,.8,.2,1)' });
    savedMotion.animate(node.querySelector('#meetings-calendar .month-day.is-selected'), [{ boxShadow: 'inset 0 0 0 2px rgba(49,91,216,.6)' }, { boxShadow: 'inset 0 0 0 2px transparent' }], { duration: 1500 });
  }, [saved, savedMeeting?.date, savedMotion]);
  useEffect(() => {
    if (!celebrating) return;
    const timer = setTimeout(() => setCelebrating(false), 1900);
    return () => clearTimeout(timer);
  }, [celebrating]);
  useEffect(() => {
    if (!standalone) return;
    const url = new URL(location.href); url.searchParams.set('day', selectedDay); history.replaceState(null, '', url);
  }, [selectedDay, standalone]);
  function selectDay(key) { announce.current = true; setAgendaRevision(n => n + 1); setSelectedDay(key); setSaved(null); setCelebrating(false); setLive(`${formatDay(key)}: ${plural(meetings.filter(item => dayKey(new Date(item.date)) === key).length)}`); }
  function openAdd() {
    if (selectedDay < today) return;
    const slot = nextSlot();
    if (selectedDay === today && slot.day !== today) setSelectedDay(slot.day);
    setAdding(true);
  }
  function onSaved(meeting) {
    setAdding(false); setEditing(null); setSelectedDay(dayKey(new Date(meeting.date))); setNotice(null); setSaved(meeting.code); setCelebrating(!editing); setLive(editing ? `Изменения встречи «${meeting.title}» сохранены` : `Встреча «${meeting.title}» запланирована`);
  }
  function cancel(item) {
    try { announce.current = true; cancelMeeting(item); setSaved(null); setCelebrating(false); focusUndo.current = true; setNotice({ text: 'Встреча отменена', undo: true }); }
    catch { setNotice({ text: 'Не удалось отменить встречу. Попробуйте ещё раз.' }); }
  }
  function undo() {
    try { announce.current = true; const meeting = restoreMeeting(); if (meeting) setSelectedDay(dayKey(new Date(meeting.date))); setNotice({ text: 'Встреча восстановлена' }); addButton.current.focus(); }
    catch (error) { setNotice({ text: error.message, undo: true }); }
  }
  async function closeCalendar() {
    if (closing.current) return;
    closing.current = true; modalMotion.clear();
    const animation = modalMotion.animate(dialogRef.current, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-16px)' }], { duration: 180, easing: 'ease-in', fill: 'both' });
    if (animation) { try { await animation.finished; } catch { /* Reduced motion completes the close immediately. */ } }
    if (dialogRef.current) onClose();
  }
  const heading = <div className="calendar-page-heading"><div>{standalone ? <h1>Мои встречи</h1> : <h2 id="calendar-modal-title" tabIndex={-1}>Мои встречи</h2>}{savedMeeting && <p className="is-saved" role="status"><Icon name="check-circle" /><span>Запланировано на {formatDate(new Date(savedMeeting.date), { hour: '2-digit', minute: '2-digit' })}</span></p>}</div></div>;
  const content = <>{heading}<ResponsiveCalendarLayout><section className={`day-agenda${daily.length ? '' : ' is-empty'}`} id="day-agenda" aria-labelledby="agenda-title"><div className="agenda-heading"><span className="section-kicker">Выбранный день</span><span className="agenda-count" id="agenda-count">{daily.length ? plural(daily.length) : 'Свободно'}</span></div><h2 id="agenda-title">{formatDate(date, { day: 'numeric', month: 'long' })}</h2><p className="agenda-weekday" id="agenda-weekday">{formatDate(date, { weekday: 'long' }).replace(/^./, letter => letter.toUpperCase())} · {date.getFullYear()}</p>
    <div ref={agenda} className="agenda-scroll" id="agenda-list" role="region" aria-label="Встречи выбранного дня" tabIndex={0}>
      {!daily.length && <div className="agenda-empty"><div className="agenda-empty-symbol" aria-hidden="true"><Icon name="calendar-plus" /></div><h3>Встреч нет</h3><p>{selectedDay < today ? 'Выберите другой день в календаре.' : 'Добавьте встречу на этот день.'}</p></div>}
      {[upcoming, past].map((group, index) => <Fragment key={index}>{index === 1 && group.length > 0 && <div className="agenda-past-divider">Прошедшие</div>}{group.map(item => <MeetingItem key={item.code} meeting={item} past={index === 1} onCancel={() => cancel(item)} onEdit={() => setEditing(item)} onStatus={setLive} />)}</Fragment>)}
    </div><button type="button" ref={addButton} className="primary-button agenda-add" id="agenda-add" disabled={selectedDay < today} onClick={openAdd}><Icon name="plus" />Добавить встречу</button><p className="calendar-live" id="calendar-live" role="status">{live}</p></section>
    <section className="calendar-board" id="calendar-board" aria-label="Календарь встреч"><Calendar id="meetings-calendar" selected={selectedDay} meetings={meetings} onSelect={selectDay} /><div className="calendar-legend"><span><i />Сегодня</span><span><i />Есть встречи</span></div>
      {celebrating && savedMeeting && <div className="calendar-success" aria-hidden="true" onClick={() => setCelebrating(false)}><div className="calendar-success-symbol"><svg viewBox="0 0 96 96"><circle className="success-track" cx="48" cy="48" r="36" /><circle className="success-ring" cx="48" cy="48" r="36" /><path className="success-check" d="m30 48 12 12 24-26" /></svg></div><strong>Встреча запланирована</strong><span>{formatDate(new Date(savedMeeting.date), { day: 'numeric', month: 'long' })} · {formatDate(new Date(savedMeeting.date), { hour: '2-digit', minute: '2-digit' })}</span></div>}
    </section></ResponsiveCalendarLayout>
    <div className="calendar-notice-slot">{notice && <div ref={noticeRef} className="calendar-undo" role="status"><span>{notice.text}</span>{notice.undo && <button type="button" onClick={undo}>Восстановить</button>}<button type="button" className="undo-dismiss" aria-label="Скрыть уведомление" onClick={() => { setNotice(null); addButton.current.focus(); }}><Icon name="close" /></button></div>}</div>
    {editing && <Modal id="calendar-edit-dialog" className="calendar-add-dialog" labelledBy="calendar-edit-title" onClose={() => setEditing(null)} initialFocus="input[name=title]"><CloseButton onClick={() => setEditing(null)} label="Закрыть редактирование встречи" /><span className="dialog-emblem"><Icon name="compose" /></span><h2 id="calendar-edit-title">Изменить встречу</h2><p className="product-field-hint">Ссылка на встречу останется прежней.</p><ScheduleForm key={editing.code} compact meeting={editing} onSaved={onSaved} /></Modal>}
    {adding && <Modal id="calendar-add-dialog" className="calendar-add-dialog" labelledBy="calendar-add-title" onClose={() => setAdding(false)} initialFocus="input[name=title]"><CloseButton onClick={() => setAdding(false)} label="Закрыть добавление встречи" /><span className="dialog-emblem"><Icon name="calendar" /></span><h2 id="calendar-add-title">Новая встреча</h2><p id="calendar-add-day">{formatDay(selectedDay)}</p><ScheduleForm compact day={selectedDay} onSaved={onSaved} /></Modal>}
  </>;
  if (standalone) return <main ref={contentRoot} id="calendar-main" className="calendar-main page-width">{content}</main>;
  return <Modal elementRef={dialogRef} id="meetings-modal" className="meetings-modal" labelledBy="calendar-modal-title" onClose={closeCalendar} onOpen={node => modalMotion.animate(node, [{ opacity: 0, transform: 'translateY(-28px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 440, easing: 'cubic-bezier(.16,.8,.2,1)' })} initialFocus="#calendar-modal-title"><CloseButton id="close-meetings-modal" onClick={closeCalendar} label="Закрыть календарь встреч" /><div ref={contentRoot} className="calendar-modal-content">{content}</div></Modal>;
}

function ResponsiveCalendarLayout({ children }) {
  const narrow = useMediaQuery('(max-width: 850px)');
  const panels = Children.toArray(children);
  return <div className="calendar-layout">{narrow ? panels.reverse() : panels}</div>;
}

function MeetingItem({ meeting, past, onCancel, onEdit, onStatus }) {
  const [menu, setMenu] = useState(null);
  const [copied, setCopied] = useState(false), [fallback, setFallback] = useState(false), input = useRef(null);
  const article = useRef(null), cancelling = useRef(false), [busy, setBusy] = useState(false);
  const motion = useMotion();
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(false), 2000); return () => clearTimeout(timer); }, [copied]);
  useEffect(() => { if (fallback) { input.current.focus(); input.current.select(); } }, [fallback]);
  async function copy() {
    try { await navigator.clipboard.writeText(meetingUrl(meeting.code)); setCopied(true); onStatus('Ссылка скопирована'); }
    catch { setFallback(true); onStatus('Скопируйте выделенную ссылку через меню браузера.'); }
  }
  async function cancel() {
    if (cancelling.current) return;
    cancelling.current = true; setBusy(true);
    const exit = motion.animate(article.current, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(12px)' }], { duration: 220, easing: 'ease-out' });
    if (exit) { try { await exit.finished; } catch { /* Reduced motion skips the exit. */ } }
    if (article.current) { onCancel(); cancelling.current = false; setBusy(false); }
  }
  return <><article ref={article} className={`agenda-meeting${past ? ' is-past' : ''}`} data-code={meeting.code}><time className="agenda-time" dateTime={meeting.date}>{formatDate(new Date(meeting.date), { hour: '2-digit', minute: '2-digit' })}</time><div className="agenda-meeting-info"><h3>{meeting.title}</h3><p className="agenda-meeting-meta">{meeting.duration || 30} минут{meeting.reminder ? ` · Напомнить за ${meeting.reminder} мин` : ''}</p>{fallback && <input ref={input} className="agenda-copy-fallback" aria-label="Ссылка на встречу" value={meetingUrl(meeting.code)} readOnly />}</div><div className="agenda-meeting-actions"><a className="agenda-open" href={meetingUrl(meeting.code)}><Icon name="video" /><span>Открыть</span></a><button type="button" className="agenda-copy" aria-label={`Действия со встречей: ${meeting.title}`} aria-haspopup="menu" disabled={busy} onClick={event => setMenu(event.currentTarget)}><Icon name="more" /></button></div></article>{menu && <ChatActionMenu anchor={menu} label="Действия со встречей" onClose={() => setMenu(null)} onAction={action => { setMenu(null); if (action === 'edit') onEdit(); if (action === 'copy') copy(); if (action === 'calendar') exportMeeting(meeting, meetingUrl(meeting.code)); if (action === 'cancel') cancel(); }} items={[...(!past ? [{ id: 'edit', icon: 'compose', label: 'Изменить встречу' }] : []), { id: 'copy', icon: 'copy', label: 'Скопировать ссылку' }, { id: 'calendar', icon: 'calendar-plus', label: 'Добавить в календарь' }, { id: 'cancel', icon: 'trash', label: 'Отменить встречу', danger: true }]} />}</>;
}

