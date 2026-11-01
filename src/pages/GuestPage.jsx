import { useRef, useState } from 'react';
import { Icon } from '../components/Icons';
import { TextField } from '../components/Primitives';
import { getCode, makeCode } from '../lib/meetings';

export default function GuestPage({ name: savedName, setName, openLobby }) {
  const [name, changeName] = useState(savedName);
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('room') || '');
  const [errors, setErrors] = useState({});
  const form = useRef(null);
  function submit(event) {
    event.preventDefault();
    const create = event.nativeEvent.submitter?.value === 'create';
    if (!name.trim()) {
      setErrors({ name: 'Введите имя.' });
      form.current.querySelector('#guest-name').focus();
      return;
    }
    const meetingCode = create ? makeCode() : getCode(code);
    if (!meetingCode) {
      setErrors({ code: 'Введите код вида air-kite-482 или вставьте ссылку на встречу.' });
      form.current.querySelector('#guest-code').focus();
      return;
    }
    setErrors({});
    setName(name.trim());
    openLobby({ name: name.trim(), code: meetingCode, joining: !create, title: create ? 'Встреча' : 'Встреча по ссылке' });
  }
  return <main className="guest-main" id="guest-main">
    <section className="auth-card guest-card" aria-labelledby="guest-title">
      <span className="auth-emblem"><Icon name="video" /></span>
      <h1 id="guest-title">Встреча без аккаунта</h1>
      <form ref={form} className="guest-form" noValidate onSubmit={submit}>
        <TextField id="guest-name" label="Имя" icon="person" autoComplete="nickname" placeholder="Саша" maxLength={60} value={name} error={errors.name} onChange={event => { changeName(event.target.value); setErrors(current => ({ ...current, name: '' })); }} />
        <TextField id="guest-code" label="Ссылка или код" icon="link" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="air-kite-482" value={code} error={errors.code} onChange={event => { setCode(event.target.value); setErrors(current => ({ ...current, code: '' })); }} />
        <button type="submit" name="action" value="join" className="primary-button auth-submit" data-press-feedback="css"><span>Присоединиться</span><span className="button-tail" aria-hidden="true"><Icon name="arrow" /></span></button>
        <span className="guest-divider">или</span>
        <button type="submit" name="action" value="create" className="auth-guest-link" data-press-feedback="css"><Icon name="plus" />Создать встречу</button>
      </form>
      <a className="guest-auth-link" href="auth.html#login">Войти в аккаунт<Icon name="arrow" /></a>
    </section>
  </main>;
}
