import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getCode, dayKey, makeCode } from '../lib/meetings';
import { write } from '../lib/storage';
import { Icon } from './Icons';
import { TextField } from './Primitives';
import ScheduleForm from './ScheduleForm';
import AnimatedDisclosure from './AnimatedDisclosure';
import useMotion from '../lib/useMotion';
import { ease } from '../lib/motion';
import useMediaQuery from '../lib/useMediaQuery';

export default function MeetingPanel({ name, setName, mode, setMode, openLobby, openMeetings }) {
  const [title, setTitle] = useState(''), [expanded, setExpanded] = useState(false), [code, setCode] = useState(() => getCode(new URLSearchParams(location.search).get('room') || '') || '');
  const [errors, setErrors] = useState({});
  const panel = useRef(null), previousMode = useRef('create');
  const lastMode = useRef(mode), formPanel = useRef(null), schedulePanel = useRef(null), footer = useRef(null), scheduleButton = useRef(null), backButton = useRef(null);
  const transition = useMotion(), footerMotion = useMotion();
  const narrow = useMediaQuery('(max-width: 760px)');
  const mobileAnimations = useRef(null), settledHeight = useRef(0);
  const join = mode === 'join';
  useLayoutEffect(() => {
    if (!narrow) return;
    const node = panel.current;
    settledHeight.current = node.getBoundingClientRect().height;
    const observer = new ResizeObserver(() => { if (!mobileAnimations.current) settledHeight.current = node.getBoundingClientRect().height; });
    observer.observe(node);
    return () => { observer.disconnect(); mobileAnimations.current?.forEach(animation => animation.cancel()); mobileAnimations.current = null; };
  }, [narrow]);
  useLayoutEffect(() => {
    const previous = lastMode.current; lastMode.current = mode;
    if (previous === mode) return;
    transition.clear(); footerMotion.clear();
    if (narrow) {
      const node = panel.current;
      const from = mobileAnimations.current ? node.getBoundingClientRect().height : settledHeight.current;
      mobileAnimations.current?.forEach(animation => animation.cancel());
      const to = node.getBoundingClientRect().height;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const options = { duration: reduced ? 140 : 320, easing: ease };
      const incoming = mode === 'schedule' ? schedulePanel.current : formPanel.current;
      const button = mode === 'schedule' ? backButton.current : mode === 'create' ? scheduleButton.current : null;
      const animations = [];
      if (!reduced && from > 0 && from !== to) animations.push(node.animate([{ height: `${from}px` }, { height: `${to}px` }], options));
      for (const content of [incoming, button, mode !== 'schedule' && node.querySelector('.mode-switch')].filter(Boolean)) {
        animations.push(content.animate(reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], options));
      }
      mobileAnimations.current = animations;
      Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
        if (mobileAnimations.current !== animations) return;
        mobileAnimations.current = null; settledHeight.current = node.getBoundingClientRect().height;
      });
      return;
    }
    const planningTransition = mode === 'schedule' || previous === 'schedule';
    if (mode === 'schedule') {
      transition.animate(schedulePanel.current, [{ transform: 'translateY(24px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 280, easing: ease });
    } else {
      transition.animate(formPanel.current, [{ transform: previous === 'schedule' ? 'translateY(-24px)' : `translateX(${mode === 'join' ? 24 : -24}px)`, opacity: .25 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 240, easing: ease });
    }
    const entering = mode === 'schedule', direction = entering ? 1 : -1;
    const distance = planningTransition ? 24 : 8;
    const oldButton = previous === 'schedule' ? backButton.current : previous === 'create' ? scheduleButton.current : null;
    const nextButton = mode === 'schedule' ? backButton.current : mode === 'create' ? scheduleButton.current : null;
    const ghost = footerMotion.snapshot(oldButton, footer.current, 'footer-ghost');
    const options = { duration: planningTransition ? entering ? 280 : 320 : 280, easing: ease };
    if (ghost) {
      const outgoing = footerMotion.animate(ghost, [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${-direction * distance}px)`, opacity: 0 }], options);
      outgoing?.finished.then(() => footerMotion.remove(ghost), () => footerMotion.remove(ghost));
    }
    footerMotion.animate(nextButton, [{ transform: `translateY(${direction * distance}px)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], options);
  }, [mode, narrow, transition, footerMotion]);
  useEffect(() => { setErrors({}); }, [mode]);
  useEffect(() => {
    if (mode === 'schedule') panel.current.querySelector('#schedule-title')?.focus({ preventScroll: true });
  }, [mode]);
  function submit(event) {
    event.preventDefault();
    if (!name.trim()) { setErrors({ name: 'Введите имя.' }); panel.current.querySelector('#display-name').focus(); return; }
    const meetingCode = join ? getCode(code) : makeCode();
    if (!meetingCode) { setErrors({ code: 'Введите код вида air-kite-482 или вставьте ссылку на встречу.' }); panel.current.querySelector('#meeting-code').focus(); return; }
    try { write('sozvon-name', name.trim()); } catch { /* The meeting can be previewed without persistence. */ }
    setName(name.trim());
    openLobby({ name: name.trim(), code: meetingCode, joining: join, title: join ? 'Встреча по ссылке' : title.trim() || 'Встреча' });
  }
  function back() { setMode(previousMode.current); requestAnimationFrame(() => panel.current.querySelector('#schedule-button')?.focus({ preventScroll: true })); }
  return <div ref={panel} className="meeting-panel" data-view={mode} onKeyDown={event => { if (event.key === 'Escape' && mode === 'schedule' && !event.defaultPrevented) { event.preventDefault(); back(); } }}>
    <div className="mode-switch" aria-hidden={mode === 'schedule'} inert={mode === 'schedule'} role="tablist" aria-label="Действие со встречей" style={{ '--mode-position': join ? '100%' : '0%' }} onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); const next = event.key === 'Home' ? 'create' : event.key === 'End' ? 'join' : join ? 'create' : 'join';
      setMode(next); panel.current.querySelector(`#${next}-tab`).focus();
    }}>{['create', 'join'].map(kind => <button key={kind} type="button" id={`${kind}-tab`} role="tab" aria-selected={mode === kind} aria-controls="meeting-form-panel" tabIndex={mode === kind ? 0 : -1} onClick={() => setMode(kind)}>{kind === 'create' ? 'Новая встреча' : 'По ссылке'}</button>)}<span className="mode-indicator" aria-hidden="true" /></div>
    <div className="meeting-view-stack">
      <section ref={schedulePanel} id="schedule-panel" hidden={mode !== 'schedule'} inert={mode !== 'schedule'} className="schedule-panel" aria-labelledby="schedule-title"><div className="form-heading"><span className="meeting-emblem"><Icon name="calendar" /></span><h2 id="schedule-title" tabIndex={-1}>Дата и время</h2></div><ScheduleForm active={mode === 'schedule'} initialTitle={title} onSaved={meeting => openMeetings(dayKey(new Date(meeting.date)), { created: meeting.code })} /></section>
        <section ref={formPanel} id="meeting-form-panel" hidden={mode === 'schedule'} inert={mode === 'schedule'} role="tabpanel" aria-labelledby={`${join ? 'join' : 'create'}-tab`}><div className="form-heading"><span className="meeting-emblem"><Icon name="video" /></span><h2 id="form-title">{join ? 'Встреча по ссылке' : 'Новая встреча'}</h2></div>
          <form id="meeting-form" noValidate onSubmit={submit}>
            <TextField id="display-name" name="displayName" label="Имя" icon="person" value={name} onChange={event => { setName(event.target.value); setErrors({}); }} autoComplete="nickname" placeholder="Саша" maxLength={60} error={errors.name} />
            {join ? <TextField id="meeting-code" name="meetingCode" label="Ссылка или код" icon="link" value={code} onChange={event => { setCode(event.target.value); setErrors({}); }} placeholder="air-kite-482" autoCapitalize="none" spellCheck={false} error={errors.code} /> :
              <AnimatedDisclosure expanded={expanded} onExpanded={setExpanded}><TextField id="room-name" name="roomName" label="Название" placeholder="Планы на выходные" maxLength={90} value={title} onChange={event => setTitle(event.target.value)} /></AnimatedDisclosure>}
            <button className="primary-button meeting-primary-action" type="submit"><span id="submit-label" className="primary-action-label">{join ? 'Присоединиться' : 'Создать встречу'}</span><span className="button-tail" aria-hidden="true"><Icon name="arrow" /></span></button>
          </form>
        </section>
    </div>
    <div ref={footer} className="meeting-actions"><button ref={backButton} hidden={mode !== 'schedule'} type="button" className="schedule-button plan-back meeting-secondary-action" id="schedule-back" onClick={back}><span className="schedule-symbol meeting-secondary-icon"><Icon name="chevron" /></span><span>К новой встрече</span></button><button ref={scheduleButton} hidden={mode !== 'create'} type="button" className="schedule-button meeting-secondary-action" id="schedule-button" onClick={() => { previousMode.current = mode; setMode('schedule'); }}><span className="schedule-symbol meeting-secondary-icon"><Icon name="calendar" /></span><span>Запланировать</span></button></div>
  </div>;
}
