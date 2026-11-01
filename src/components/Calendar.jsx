import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { addMonths, dayKey, formatDate, parseDay, plural } from '../lib/meetings';
import { Icon } from './Icons';
import useMotion from '../lib/useMotion';
import { ease } from '../lib/motion';
import useMediaQuery from '../lib/useMediaQuery';
import useHorizontalPager from '../lib/useHorizontalPager';

export default function Calendar({ selected, onSelect, minDate, compact = false, meetings = [], id }) {
  const [month, setMonth] = useState(() => parseDay(selected) || new Date());
  const [focused, setFocused] = useState(selected);
  const [view, setView] = useState('days');
  const [pickerYear, setPickerYear] = useState(month.getFullYear());
  const root = useRef(null), title = useRef(null), pendingFocus = useRef(null), wheel = useRef({ distance: 0, last: 0 });
  const stage = useRef(null), grid = useRef(null), chooser = useRef(null), pendingMotion = useRef(null);
  const motion = useMotion();
  const narrow = useMediaQuery('(max-width: 760px)');
  const [page, setPage] = useState(1);
  const swipeAnimation = useRef(null);
  const today = dayKey(new Date());
  const allowed = key => !minDate || key >= minDate;
  const period = date => date.getFullYear() * 12 + date.getMonth();
  const minimum = parseDay(minDate);
  const firstYear = Math.floor(pickerYear / 12) * 12;
  const previousDisabled = Boolean(minimum && (view === 'days' ? period(month) <= period(minimum) : view === 'months' ? pickerYear <= minimum.getFullYear() : firstYear <= minimum.getFullYear()));
  const monthLabel = formatDate(month, { month: 'long', year: 'numeric' }).replace(' г.', '');
  const label = view === 'days' ? monthLabel[0].toUpperCase() + monthLabel.slice(1) : view === 'months' ? String(pickerYear) : `${firstYear}–${firstYear + 11}`;
  const pager = useHorizontalPager({ index: page, count: 3, enabled: narrow && !compact && view === 'days', resetKey: `${period(month)}-${view}`, canChange: next => next !== 0 || !previousDisabled, onChange: setPage, onSettled: next => {
    if (next === 1) return;
    const nextMonth = addMonths(new Date(month.getFullYear(), month.getMonth(), 1, 12), next - 1);
    setMonth(nextMonth); setFocused(minDate && dayKey(nextMonth) < minDate ? minDate : dayKey(nextMonth)); setPage(1);
  } });
  useEffect(() => {
    if (!parseDay(selected)) return;
    setMonth(parseDay(selected)); setFocused(selected); setView('days'); setPage(1);
  }, [selected]);
  useLayoutEffect(() => {
    if (pendingFocus.current) {
      grid.current?.querySelector(`[data-day="${pendingFocus.current}"]`)?.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  });
  useLayoutEffect(() => {
    const change = pendingMotion.current; pendingMotion.current = null;
    if (!change) return;
    if (narrow && !compact) {
      if (change.kind === 'surface') {
        const node = view === 'days' ? grid.current : chooser.current;
        swipeAnimation.current?.cancel();
        swipeAnimation.current = node?.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 160, easing: ease });
      }
      return;
    }
    if (change.kind === 'surface') {
      motion.animate(view === 'days' ? grid.current : chooser.current, [{ opacity: 0, transform: `translateX(${change.direction * 20}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 220, easing: ease });
      return;
    }
    const { direction, ghost, transform, opacity } = change;
    const options = { duration: 240, easing: ease };
    motion.animate(grid.current, [{ transform: `translateX(${direction * 22}%)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], options);
    if (ghost) {
      const outgoing = motion.animate(ghost, [{ transform: transform === 'none' ? 'translateX(0)' : transform, opacity }, { transform: `translateX(${-direction * 22}%)`, opacity: 0 }], options);
      outgoing?.finished.then(() => motion.remove(ghost), () => motion.remove(ghost));
    }
  }, [month, view, pickerYear, motion, narrow, compact]);
  useEffect(() => () => swipeAnimation.current?.cancel(), []);
  function prepareMonth(next) {
    const offset = period(next) - period(month);
    if (!offset) return;
    const current = getComputedStyle(grid.current), transform = current.transform, opacity = Number(current.opacity);
    motion.clear();
    pendingMotion.current = { kind: 'month', direction: Math.sign(offset), transform, opacity, ghost: motion.snapshot(grid.current, stage.current, 'month-ghost') };
  }
  function prepareSurface(direction = 0) {
    motion.clear(); pendingMotion.current = { kind: 'surface', direction };
  }
  function changeView(next) {
    setPage(1); prepareSurface();
    if (view === 'days') setPickerYear(month.getFullYear());
    setView(next);
  }
  function navigate(direction) {
    if (direction < 0 && previousDisabled) return;
    if (view === 'days' && narrow && !compact) { setPage(1 + direction); return; }
    if (view === 'days') {
      const next = addMonths(new Date(month.getFullYear(), month.getMonth(), 1, 12), direction);
      prepareMonth(next);
      setMonth(next); setFocused(minDate && dayKey(next) < minDate ? minDate : dayKey(next));
    } else { prepareSurface(direction); setPickerYear(year => year + direction * (view === 'years' ? 12 : 1)); }
  }
  const navigateRef = useRef(navigate); navigateRef.current = navigate;
  useEffect(() => {
    const node = root.current;
    const handler = event => {
      if (event.ctrlKey || Math.abs(event.deltaX) + Math.abs(event.deltaY) < 2) return;
      event.preventDefault();
      const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1);
      const now = performance.now();
      if (now - wheel.current.last > 140 || Math.sign(delta) !== Math.sign(wheel.current.distance)) wheel.current.distance = 0;
      wheel.current.distance += delta; wheel.current.last = now;
      if (Math.abs(wheel.current.distance) >= 55) { navigateRef.current(Math.sign(delta)); wheel.current.distance = 0; }
    };
    node.addEventListener('wheel', handler, { passive: false });
    return () => node.removeEventListener('wheel', handler);
  }, []);
  function select(key) {
    if (!allowed(key)) return;
    if (view === 'days') prepareMonth(parseDay(key)); else prepareSurface();
    setMonth(parseDay(key)); setFocused(key); setView('days'); pendingFocus.current = key; onSelect(key);
  }
  function keydown(event, date) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) return;
    event.preventDefault();
    const weekday = (date.getDay() + 6) % 7;
    const next = event.key.startsWith('Page') ? addMonths(date, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1)) : new Date(date.getFullYear(), date.getMonth(), date.getDate() + ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday }[event.key]), 12);
    const key = allowed(dayKey(next)) ? dayKey(next) : minDate;
    setMonth(parseDay(key)); setFocused(key); pendingFocus.current = key;
  }
  const focusKey = allowed(focused) ? focused : minDate;
  function renderGrid(displayMonth, activePage = true) {
    const start = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1, 12);
    start.setDate(1 - (start.getDay() + 6) % 7);
    return <div ref={activePage ? grid : undefined} className="month-grid" role="grid" aria-label={formatDate(displayMonth, { month: 'long', year: 'numeric' })} aria-colcount={7} style={{ visibility: view === 'days' ? undefined : 'hidden' }} inert={!activePage || view !== 'days'} aria-hidden={!activePage || undefined}>
      <div className="month-weekdays" role="row">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => <span key={day} role="columnheader">{day}</span>)}</div>
      {Array.from({ length: 6 }, (_, week) => <div key={week} className="month-week" role="row">{Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start); date.setDate(start.getDate() + week * 7 + index);
        const key = dayKey(date), count = meetings.filter(item => dayKey(new Date(item.date)) === key).length;
        return <div key={key} className="month-cell" role="gridcell" aria-selected={key === selected}><button type="button" data-day={key} tabIndex={key === focusKey ? 0 : -1} disabled={!allowed(key)} aria-current={key === today ? 'date' : undefined}
          className={`month-day${date.getMonth() !== displayMonth.getMonth() ? ' outside-month' : ''}${key === today ? ' is-today' : ''}${key === selected ? ' is-selected' : ''}${key < today ? ' is-past-day' : ''}`}
          aria-label={`${formatDate(date, { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}${key === selected ? ', выбрано' : ''}${count ? `, ${plural(count)}` : ''}`}
          onClick={() => select(key)} onKeyDown={event => keydown(event, date)}><span className="month-day-number">{date.getDate()}</span>{count > 0 && <span className="month-day-events" aria-hidden="true">{plural(count)}</span>}</button></div>;
      })}</div>)}
    </div>;
  }
  return <div ref={root} id={id} className={`month-calendar${compact ? ' is-compact' : ''}`} data-calendar-view={view} onKeyDown={event => {
    if (event.key === 'Escape' && view !== 'days') { event.preventDefault(); event.stopPropagation(); changeView('days'); title.current.focus(); }
  }}>
    <div className="month-toolbar"><button ref={title} type="button" className="month-title month-title-button" aria-live="polite" aria-expanded={view !== 'days'} aria-label={`${view === 'days' ? 'Выбрать месяц' : 'Выбрать год'}: ${label}`} onClick={() => changeView(view === 'days' ? 'months' : view === 'months' ? 'years' : 'months')}>{label}</button>
      <div className="month-nav"><button type="button" className="month-today" disabled={!allowed(today)} onClick={() => select(today)}>Сегодня</button>{[-1, 1].map(direction => <button type="button" key={direction} className={`month-arrow ${direction < 0 ? 'previous' : 'next'}`} aria-label={direction < 0 ? view === 'days' ? 'Предыдущий месяц' : 'Предыдущий год' : view === 'days' ? 'Следующий месяц' : 'Следующий год'} disabled={direction < 0 && previousDisabled} onClick={() => navigate(direction)}><Icon name="chevron" /></button>)}</div>
    </div>
    <div ref={stage} className="month-stage">
      {narrow && !compact && view === 'days' ? <div ref={pager.viewport} className="horizontal-pager calendar-month-pager" {...pager.bindings}><div ref={pager.track} className="horizontal-pager-track">{[-1, 0, 1].map(offset => <div className="horizontal-pager-page" key={offset}>{renderGrid(addMonths(new Date(month.getFullYear(), month.getMonth(), 1, 12), offset), offset === 0)}</div>)}</div></div> : renderGrid(month)}
      {view !== 'days' && <div ref={chooser} className="month-chooser" role="group" aria-label={view === 'years' ? 'Выбор года' : 'Выбор месяца'}>{Array.from({ length: 12 }, (_, index) => {
        const year = view === 'years' ? firstYear + index : pickerYear;
        const past = view === 'years' ? year < new Date().getFullYear() : year * 12 + index < period(new Date());
        const disabled = Boolean(minimum && (view === 'years' ? year < minimum.getFullYear() : year * 12 + index < period(minimum)));
        const text = view === 'years' ? String(year) : formatDate(new Date(year, index, 1), { month: 'short' }).replace('.', '');
        return <button type="button" key={index} className={`month-choice${!compact && past ? ' is-past-period' : ''}`} disabled={disabled} aria-pressed={year === month.getFullYear() && (view === 'years' || index === month.getMonth())} onClick={() => {
          prepareSurface();
          if (view === 'years') { setPickerYear(year); setView('months'); }
          else { const next = new Date(year, index, 1, 12); setMonth(next); setFocused(allowed(dayKey(next)) ? dayKey(next) : minDate); setView('days'); }
          title.current.focus();
        }} onKeyDown={event => {
          const shift = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3, Home: -index, End: 11 - index }[event.key];
          if (shift === undefined) return;
          event.preventDefault(); let target = Math.max(0, Math.min(11, index + shift)); const buttons = event.currentTarget.parentElement.children;
          while (buttons[target]?.disabled) target += Math.sign(shift) || 1;
          buttons[target]?.focus();
        }}><span className="month-choice-label">{text[0].toUpperCase() + text.slice(1)}</span></button>;
      })}</div>}
    </div>
  </div>;
}
