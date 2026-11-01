import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icons';
import { CloseButton, ErrorMessage, Modal, TextField } from '../components/Primitives';
import { useApp } from '../context';

export default function AuthPage() {
  const { signInPreview } = useApp();
  const [register, setRegister] = useState(() => location.hash === '#register');
  const tabs = useRef(null);
  const [errors, setErrors] = useState({}), [result, setResult] = useState(false), [recovery, setRecovery] = useState(false), [recoveryEmail, setRecoveryEmail] = useState(''), [recoveryError, setRecoveryError] = useState(''), [recovered, setRecovered] = useState(false);
  useEffect(() => {
    const update = () => setRegister(location.hash === '#register');
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => { if (recovery && recovered) document.getElementById('auth-recovery-title')?.focus(); }, [recovery, recovered]);
  function select(next) { setRegister(next); setErrors({}); history.replaceState(null, '', next ? '#register' : '#login'); }
  function submit(event) {
    event.preventDefault();
    const form = event.currentTarget, email = form.querySelector('#auth-email').value.trim(), password = form.querySelector('#auth-password').value;
    const next = {};
    if (register && !form.querySelector('#auth-name').value.trim()) next.name = 'Введите имя, которое увидят участники.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Введите почту в формате name@example.com.';
    if (!password || (register && password.length < 8)) next.password = register ? 'Используйте не менее 8 символов.' : 'Введите пароль.';
    setErrors(next);
    if (Object.keys(next).length) { form.querySelector(`#auth-${Object.keys(next)[0]}`).focus(); return; }
    form.querySelector('#auth-password').value = '';
    signInPreview();
    setResult(true);
  }
  return <main className="auth-main" id="auth-main">
    <div className="auth-layout" data-mode={register ? 'register' : 'login'}>
      <section className="auth-story" aria-labelledby="auth-story-title">
        <div className="auth-story-art" aria-hidden="true"><img src="/assets/auth-air-ring-v1.webp" alt="" width="1254" height="1254" decoding="async" fetchPriority="high" /></div>
        <div className="auth-story-copy"><span className="auth-story-mark" aria-hidden="true"><Icon name="air" /></span><h1 id="auth-story-title">Ближе{' '}<br />друг к другу<span>.</span></h1></div>
        <div className="auth-story-footer" aria-hidden="true"><span className="auth-story-spark">✳</span></div>
      </section>
      <section className="auth-card" aria-labelledby="auth-title">
        <div ref={tabs} className="auth-mode-switch" style={{ '--auth-mode': register ? '100%' : '0%' }} role="tablist" aria-label="Вход или регистрация" onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault(); const next = event.key === 'Home' ? false : event.key === 'End' ? true : !register;
          select(next); tabs.current.querySelector(next ? '#register-tab' : '#login-tab').focus();
        }}><span className="auth-mode-indicator" aria-hidden="true" />{[false, true].map(mode => <button type="button" role="tab" key={String(mode)} id={mode ? 'register-tab' : 'login-tab'} aria-selected={register === mode} aria-controls="auth-form-panel" tabIndex={register === mode ? 0 : -1} onClick={() => select(mode)}>{mode ? 'Регистрация' : 'Вход'}</button>)}</div>
        <div className="auth-form-panel" id="auth-form-panel" role="tabpanel" aria-labelledby={register ? 'register-tab' : 'login-tab'}>
          <div className="auth-form-heading"><span className="auth-emblem"><Icon name="person" /></span><div key={String(register)} className="auth-heading-copy"><h2 id="auth-title">{register ? 'Создайте аккаунт' : 'Войти в Созвон'}</h2></div></div>
          <form className="auth-form" noValidate onSubmit={submit} onChange={() => setErrors({})}>
            <div className={`auth-name-reveal${register ? ' is-open' : ''}`} aria-hidden={!register} inert={!register}><div><AuthField id="auth-name" label="Имя" icon="person" placeholder="Саша" autoComplete="name" disabled={!register} error={errors.name} /></div></div>
            <AuthField id="auth-email" label="Почта" icon="mail" type="email" autoComplete="email" placeholder="name@example.com" error={errors.email} />
            <AuthField id="auth-password" label="Пароль" icon="lock" type="password" autoComplete={register ? 'new-password' : 'current-password'} error={errors.password} />
            {register && <p className="product-field-hint">Не менее 8 символов. Пароль не сохраняется в макете.</p>}
            <div className="auth-password-note" aria-hidden={register}>{!register && <button type="button" onClick={() => { setRecovery(true); setRecovered(false); setRecoveryError(''); }}>Забыли пароль?</button>}</div>
            <button type="submit" className="primary-button auth-submit" data-press-feedback="css"><span>{register ? 'Создать аккаунт' : 'Войти'}</span><span className="button-tail" aria-hidden="true"><Icon name="arrow" /></span></button>
          </form>
        </div>
        <div className="auth-card-footer"><a className="auth-guest-link" href={`guest.html${location.search}`}>Продолжить без аккаунта<Icon name="arrow" /></a><p className="auth-preview-note"><Icon name="info" />Режим предпросмотра. Данные никуда не отправляются.</p></div>
      </section>
    </div>
    {result && <Modal id="auth-result" className="product-dialog" labelledBy="auth-result-title" onClose={() => setResult(false)}><CloseButton onClick={() => setResult(false)} /><span className="product-dialog-symbol"><Icon name="check" /></span><p className="product-eyebrow">Предпросмотр</p><h2 id="auth-result-title">{register ? 'Всё готово для знакомства' : 'Можно продолжить'}</h2><p>Вы проверили форму {register ? 'регистрации' : 'входа'}. В этом макете можно изучить чаты и встречи без аккаунта.</p><a className="product-button is-primary" href="chats.html">Открыть чаты<Icon name="arrow" /></a></Modal>}
    {recovery && <Modal id="auth-recovery" className="product-dialog" labelledBy="auth-recovery-title" onClose={() => setRecovery(false)} initialFocus="#recovery-email"><CloseButton onClick={() => setRecovery(false)} /><span className="product-dialog-symbol"><Icon name={recovered ? 'mail' : 'lock'} /></span><h2 id="auth-recovery-title" tabIndex={-1}>{recovered ? 'Проверьте почту' : 'Восстановить доступ'}</h2>{recovered ? <><p>В готовом сервисе письмо со ссылкой придёт на <strong>{recoveryEmail}</strong>. В предпросмотре письмо не отправляется.</p><button className="product-button is-primary" onClick={() => setRecovery(false)}>Вернуться ко входу</button></> : <form noValidate onSubmit={event => { event.preventDefault(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) { setRecoveryError('Введите почту в формате name@example.com.'); return; } setRecovered(true); }}><p>Укажите почту, с которой создавали аккаунт.</p><TextField id="recovery-email" label="Почта" type="email" icon="mail" autoComplete="email" value={recoveryEmail} onChange={event => { setRecoveryEmail(event.target.value); setRecoveryError(''); }} error={recoveryError} /><button className="product-button is-primary" type="submit">Продолжить<Icon name="arrow" /></button></form>}</Modal>}
  </main>;
}

function AuthField({ id, label, icon, type = 'text', error, ...props }) {
  const [visible, setVisible] = useState(false);
  const password = type === 'password';
  return <div className={`field glass-field auth-field${password ? ' auth-password-field' : ''}`}><label htmlFor={id}>{label}</label><span className="input-shell"><Icon name={icon} /><input id={id} name={id.replace('auth-', '')} type={password && visible ? 'text' : type} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />{password && <button type="button" className="auth-password-toggle" data-press-feedback="css" aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'} aria-pressed={visible} onClick={() => setVisible(current => !current)}><span className="auth-eye" aria-hidden="true"><Icon name="eye" className="auth-eye-open" /><Icon name="eye-closed" className="auth-eye-closed" /></span></button>}</span><ErrorMessage id={`${id}-error`} message={error} /></div>;
}
