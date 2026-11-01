import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context';
import { dayKey, nextSlot, pad } from '../lib/meetings';
import { DateField, TimeField } from './DateTimeFields';
import { ErrorMessage, TextField } from './Primitives';
import { Icon } from './Icons';

export default function ScheduleForm({ day: fixedDay, initialTitle = '', meeting, onSaved, compact = false, active = true }) {
  const { saveMeeting, updateMeeting } = useApp();
  const [initial] = useState(nextSlot);
  const [day, setDay] = useState(meeting ? dayKey(new Date(meeting.date)) : fixedDay || initial.day), [time, setTime] = useState(meeting ? `${pad(new Date(meeting.date).getHours())}:${pad(new Date(meeting.date).getMinutes())}` : fixedDay && fixedDay !== initial.day ? '10:00' : initial.time);
  const [title, setTitle] = useState(meeting?.title || initialTitle), [error, setError] = useState(null);
  const form = useRef(null), prefix = compact ? 'calendar' : 'schedule';
  const currentDraft = useRef(null);
  currentDraft.current = { title, initialTitle, day, time };
  useEffect(() => {
    if (!active || compact) return;
    const draft = currentDraft.current;
    if (!draft.title.trim()) setTitle(draft.initialTitle);
    if (new Date(`${draft.day}T${draft.time}`).getTime() <= Date.now()) {
      const slot = nextSlot(); setDay(slot.day); setTime(slot.time);
    }
    setError(null);
  }, [active, compact]);
  async function submit(event) {
    event.preventDefault(); setError(null);
    try { const saved = meeting ? updateMeeting(meeting.code, title, day, time, { duration: meeting.duration, reminder: meeting.reminder }) : saveMeeting(title, day, time); onSaved(saved); }
    catch (failure) {
      setError({ field: failure.field, message: failure.message });
      form.current.querySelector(failure.field === 'title' ? 'input[name="title"]' : '.time-field-button')?.focus();
    }
  }
  return <form ref={form} id={compact ? 'calendar-add-form' : 'schedule-form'} noValidate onSubmit={submit} onChange={() => setError(null)}>
    <TextField id={compact ? 'calendar-meeting-name' : 'scheduled-name'} name="title" label="Название" value={title} onChange={event => setTitle(event.target.value)} placeholder="Встреча команды" maxLength={90} error={error?.field === 'title' ? error.message : ''} />
    <div className={compact && !meeting ? undefined : 'planning-date-row'}>
      {(!compact || meeting) && <DateField value={day} onChange={key => { setDay(key); setError(null); }} />}
      <TimeField id={compact ? 'calendar-meeting-time' : 'scheduled-clock'} label="Время" value={time} day={day} onChange={value => { setTime(value); setError(null); }} error={error?.field === 'time'} describedBy={error?.field !== 'title' ? `${prefix}-error` : undefined} />
    </div>
    <ErrorMessage id={`${prefix}-error`} message={error?.field !== 'title' ? error?.message : ''} />
    <button type="submit" className={`primary-button${compact ? '' : ' meeting-primary-action'}`}>{compact ? meeting ? 'Сохранить изменения' : 'Запланировать' : <><span className="primary-action-label">Запланировать</span><span className="button-tail" aria-hidden="true"><Icon name="arrow" /></span></>}</button>
  </form>;
}
