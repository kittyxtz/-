import { useEffect, useId, useRef, useState } from 'react';
import Calendar from './Calendar';
import ClockTimePicker from './ClockTimePicker';
import { Icon } from './Icons';
import { Popover } from './Primitives';
import { clampTime, dayKey, formatDate, parseDay } from '../lib/meetings';

export function DateField({ value, onChange, error }) {
  const [open, setOpen] = useState(false), anchor = useRef(null), id = useId();
  const close = () => { setOpen(false); anchor.current?.focus({ preventScroll: true }); };
  return <div className="field glass-field"><label id={`${id}-label`} htmlFor={`${id}-trigger`}>Дата</label><button ref={anchor} id={`${id}-trigger`} type="button" className="date-field-button" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} aria-invalid={Boolean(error)} onClick={() => setOpen(!open)}><Icon name="calendar" /><span id={`${id}-value`}>{parseDay(value) ? formatDate(parseDay(value), { day: 'numeric', month: 'short' }) : 'Выбрать дату'}</span></button>
    {open && <Popover id={id} className="date-picker-dialog" anchor={anchor} onClose={() => setOpen(false)} label="Выберите дату"><div className="date-picker-heading"><h2>Выберите дату</h2><button type="button" className="icon-button" aria-label="Закрыть выбор даты" onClick={close}><Icon name="close" /></button></div><Calendar compact selected={value} minDate={dayKey(new Date())} onSelect={key => { onChange(key); close(); }} /></Popover>}
  </div>;
}

export function TimeField({ id, value, day, onChange, error, label = 'Время', describedBy }) {
  const [open, setOpen] = useState(false), anchor = useRef(null), popupId = useId();
  const safe = clampTime(value, day);
  useEffect(() => { if (safe !== value) onChange(safe); }, [safe, value, onChange]);
  const close = () => { setOpen(false); anchor.current?.focus({ preventScroll: true }); };
  return <div className="field glass-field"><label id={`${id}-label`} htmlFor={`${id}-trigger`}>{label}</label><input id={id} type="hidden" value={value} readOnly />
    <button ref={anchor} type="button" id={`${id}-trigger`} className="date-field-button time-field-button" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? popupId : undefined} aria-invalid={Boolean(error)} aria-describedby={describedBy} onClick={() => setOpen(!open)}><Icon name="clock" /><span id={`${id}-value`}>{value || 'Выбрать время'}</span></button>
    {open && <Popover id={popupId} className="time-picker-dialog radial-time-picker" anchor={anchor} onClose={() => setOpen(false)} label="Выбор времени"><ClockTimePicker value={value} day={day} onCancel={close} onConfirm={time => { onChange(time); close(); }} /></Popover>}
  </div>;
}
