import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { clampTime, minimumTime, pad } from '../lib/meetings';
import { clockBlocked, clockPosition, clockSize, clockValueAt, innerRadius, outerRadius, shortestClockTurn } from '../lib/clock';
import useMotion from '../lib/useMotion';
import { Icon } from './Icons';

export default function ClockTimePicker({ value, day, onConfirm, onCancel }) {
  const [initial] = useState(() => (clampTime(value, day) || '10:00').split(':'));
  const [digits, setDigits] = useState({ hour: initial[0], minute: initial[1] });
  const [part, setPart] = useState('hour'), [manual, setManual] = useState(false), [error, setError] = useState(''), [, setTick] = useState(0);
  const face = useRef(null), faceStage = useRef(null), inputs = useRef({}), pointer = useRef(null), previousPart = useRef(part), pendingFace = useRef(null), stepTimer = useRef(null);
  const [dragging, setDragging] = useState(false);
  const id = useId(), motion = useMotion();
  const hour = Number(digits.hour), minute = Number(digits.minute), minimum = minimumTime(day);
  const valid = /^\d{1,2}$/.test(digits.hour) && /^\d{1,2}$/.test(digits.minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  const selected = part === 'hour' ? hour : minute;
  const blocked = number => clockBlocked(number, part, hour, minimum);
  const numbers = part === 'hour' ? Array.from({ length: 24 }, (_, i) => i) : [...new Set([...Array.from({ length: 12 }, (_, i) => i * 5), ...(valid && minute % 5 ? [minute] : [])])];
  const angle = valid ? (part === 'hour' ? selected % 12 * 30 : selected * 6) : 0;
  const radius = valid && part === 'hour' && selected >= 12 ? innerRadius : outerRadius;
  const [rotation, setRotation] = useState(angle);
  useLayoutEffect(() => { setRotation(current => shortestClockTurn(current, angle)); }, [angle]);
  useEffect(() => () => clearTimeout(stepTimer.current), []);
  useEffect(() => { face.current?.querySelector('[aria-checked="true"]')?.focus({ preventScroll: true }); }, []);
  useEffect(() => { const timer = setInterval(() => setTick(n => n + 1), 30000); return () => clearInterval(timer); }, []);
  useLayoutEffect(() => {
    if (previousPart.current !== part) {
      const ghost = pendingFace.current; pendingFace.current = null;
      if (ghost) {
        const exit = motion.animate(ghost, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-out', fill: 'both' });
        exit?.finished.then(() => motion.remove(ghost), () => motion.remove(ghost));
      }
      if (!manual) motion.animate(face.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 210, easing: 'cubic-bezier(.2,0,0,1)' });
      previousPart.current = part;
    }
  }, [part, manual, motion]);
  function changePart(next) {
    clearTimeout(stepTimer.current);
    if (next === part) return;
    motion.clear();
    if (!manual && face.current && faceStage.current) {
      const node = face.current;
      const ghost = motion.snapshot(node, faceStage.current, 'clock-face-ghost');
      if (ghost) {
        Object.assign(ghost.style, { position: 'absolute', margin: '0', left: `${node.offsetLeft}px`, top: `${node.offsetTop}px`, width: `${node.offsetWidth}px`, height: `${node.offsetHeight}px`, pointerEvents: 'none' });
        for (const selector of ['.clock-hand-rotor', '.clock-reach', '.clock-selection']) {
          const original = node.querySelector(selector), copy = ghost.querySelector(selector);
          if (original && copy) { copy.style.transform = getComputedStyle(original).transform; copy.style.transition = 'none'; }
        }
      }
      pendingFace.current = ghost;
    }
    setPart(next);
  }
  function select(number, finish = false) {
    if (blocked(number)) return;
    const next = clampTime(`${pad(part === 'hour' ? number : hour)}:${pad(part === 'minute' ? number : minute)}`, day);
    if (!next) return;
    const [h, m] = next.split(':'); setDigits({ hour: h, minute: m }); setError('');
    if (finish && part === 'hour') {
      clearTimeout(stepTimer.current);
      stepTimer.current = setTimeout(() => { changePart('minute'); requestAnimationFrame(() => face.current?.querySelector('[aria-checked="true"]')?.focus({ preventScroll: true })); }, motion.enabled ? 160 : 0);
    }
  }
  function pick(event, finish = false) {
    const rect = face.current.getBoundingClientRect();
    const number = clockValueAt(event.clientX - rect.left, event.clientY - rect.top, rect.width, part);
    if (number !== null) select(number, finish);
  }
  function confirm() {
    if (!valid) { setError('Введите часы от 0 до 23 и минуты от 0 до 59.'); inputs.current[hour > 23 || !digits.hour ? 'hour' : 'minute']?.focus(); return; }
    if (hour * 60 + minute < minimumTime(day)) { setError('Выберите время позже текущего.'); return; }
    onConfirm(`${pad(hour)}:${pad(minute)}`);
  }
  function toggleManual() {
    clearTimeout(stepTimer.current); motion.clear();
    if (manual && !valid) {
      const [h, m] = (clampTime(value, day) || '10:00').split(':'); setDigits({ hour: h, minute: m });
    }
    setError(''); setManual(!manual);
    if (!manual) requestAnimationFrame(() => inputs.current[part]?.focus());
  }
  return <div className="pixel-clock" data-input-mode={manual ? 'keyboard' : 'dial'}>
    <div className="date-picker-heading"><h2>Выбор времени</h2><button type="button" className="icon-button" aria-label="Закрыть выбор времени" onClick={onCancel}><Icon name="close" /></button></div>
    <div className="clock-digital" role={manual ? undefined : 'tablist'} aria-label="Часы и минуты" onKeyDown={event => {
      if (manual || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); const next = event.key === 'Home' ? 'hour' : event.key === 'End' ? 'minute' : part === 'hour' ? 'minute' : 'hour'; changePart(next);
      event.currentTarget.querySelector(`[data-part="${next}"]`).focus();
    }}>
      {['hour', 'minute'].map((kind, index) => <span key={kind} className="clock-digital-unit">{index === 1 && <span className="clock-colon" aria-hidden="true">:</span>}
        {manual ? <label className="clock-digit-input"><input ref={node => { inputs.current[kind] = node; }} aria-label={kind === 'hour' ? 'Часы' : 'Минуты'} inputMode="numeric" autoComplete="off" maxLength={2} value={digits[kind]} onChange={event => { setDigits(current => ({ ...current, [kind]: event.target.value.replace(/\D/g, '').slice(0, 2) })); setError(''); }} onFocus={() => changePart(kind)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); confirm(); } }} /></label> :
          <button type="button" role="tab" id={`${id}-${kind}-tab`} data-part={kind} aria-label={`${kind === 'hour' ? 'Часы' : 'Минуты'}: ${pad(Number(digits[kind]))}`} aria-selected={part === kind} aria-controls={`${id}-panel`} tabIndex={part === kind ? 0 : -1} onClick={() => changePart(kind)}><span>{pad(Number(digits[kind]))}</span></button>}
      </span>)}
    </div>
    <div ref={faceStage} role="tabpanel" id={`${id}-panel`} aria-labelledby={manual ? undefined : `${id}-${part}-tab`} aria-label={manual ? 'Циферблат' : undefined} inert={manual} aria-hidden={manual} className="clock-face-panel"><div ref={face} className={`clock-face${dragging ? ' is-dragging' : ''}`} role="radiogroup" aria-label={part === 'hour' ? 'Выберите часы' : 'Выберите минуты'} onPointerDown={event => {
      if (event.button !== 0) return;
      event.preventDefault(); clearTimeout(stepTimer.current); pointer.current = event.pointerId; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); pick(event);
    }} onPointerMove={event => { if (pointer.current === event.pointerId) pick(event); }} onPointerUp={event => {
      if (pointer.current !== event.pointerId) return;
      pointer.current = null; setDragging(false); pick(event, true); event.currentTarget.releasePointerCapture(event.pointerId);
    }} onPointerCancel={() => { pointer.current = null; setDragging(false); }}>
      <svg viewBox={`0 0 ${clockSize} ${clockSize}`} className="clock-hand" aria-hidden="true"><g className="clock-hand-rotor" style={{ transform: `rotate(${rotation}deg)` }}><line className="clock-reach" x1="140" y1="140" x2="140" y2={140 - outerRadius} style={{ transform: `scaleY(${radius / outerRadius})` }} /><circle className="clock-selection" cx="140" cy="140" r="21" style={{ transform: `translateY(${-radius}px)` }} /></g><circle className="clock-center" cx="140" cy="140" r="4" /></svg>
      {numbers.map(number => {
        const point = clockPosition(number, part), checked = valid && selected === number && !blocked(number);
        return <button key={`${part}-${number}`} type="button" role="radio" className={`clock-number${part === 'hour' && number >= 12 ? ' clock-number-inner' : ''}`} data-value={number} style={{ left: `${point.x / clockSize * 100}%`, top: `${point.y / clockSize * 100}%` }} aria-label={`${part === 'hour' ? 'Часы' : 'Минуты'}: ${pad(number)}`} aria-checked={checked} disabled={blocked(number)} tabIndex={checked ? 0 : -1} onClick={event => { if (event.detail === 0) select(number, true); }} onKeyDown={event => {
          const maximum = part === 'hour' ? 23 : 59;
          const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 1, ArrowDown: -1, Home: -number, End: maximum - number }[event.key];
          if (delta === undefined) return;
          event.preventDefault(); event.stopPropagation();
          let next = Math.max(0, Math.min(maximum, number + delta)); while (next >= 0 && next <= maximum && blocked(next)) next += Math.sign(delta) || 1;
          if (next < 0 || next > maximum) return;
          select(next); requestAnimationFrame(() => face.current?.querySelector(`[data-value="${next}"]`)?.focus({ preventScroll: true }));
        }}>{part === 'minute' ? pad(number) : number}</button>;
      })}
    </div></div>
    {(error || minimum >= 1440) && <p className="clock-hint clock-error" role="alert">{error || 'На сегодня времени не осталось. Выберите другую дату.'}</p>}
    <div className="clock-actions"><button type="button" className="icon-button clock-input-toggle" aria-label={manual ? 'Выбрать на циферблате' : 'Ввести время с клавиатуры'} onClick={toggleManual}>{manual ? <Icon name="clock" /> : <Icon name="keyboard" />}</button><button type="button" className="clock-cancel" onClick={onCancel}>Отмена</button><button type="button" className="clock-confirm" onClick={confirm} disabled={minimum >= 1440}>Выбрать</button></div>
  </div>;
}
