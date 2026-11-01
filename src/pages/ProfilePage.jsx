import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { read, saveProfile, write } from '../lib/storage';
import { readAudioPreferences, normalizeAudioPreferences } from '../lib/audioPreferences';
import useMediaQuery from '../lib/useMediaQuery';
import { Icon } from '../components/Icons';
import { TextField } from '../components/Primitives';
import { helpQuestions } from '../lib/help';
import { formatPercent } from '../lib/formatText';
import { settingsReturn } from '../lib/settingsNavigation';
import { themes, themeMode } from '../lib/themes';
import { advanceOledGesture } from '../lib/oledGesture';
import { useApp } from '../context';
import DeviceSettings from '../components/DeviceSettings';
import { readDevicePreferences } from '../lib/devicePreferences';
import { readNotifications } from '../lib/notificationPreferences';

const sections = [
  { id: 'profile', label: 'Профиль', icon: 'person', description: 'Как вас видят другие участники.' },
  { id: 'privacy', label: 'Конфиденциальность', icon: 'shield', description: 'Данные и доступ к устройствам.' },
  { id: 'audio', label: 'Звук', icon: 'speaker', description: 'Проверьте динамики и настройте микрофон.' },
  { id: 'notifications', label: 'Уведомления', icon: 'speaker', description: 'Звуки и напоминания в этом браузере.' },
  { id: 'appearance', label: 'Оформление', icon: 'sun', description: 'Выберите режим и цветовую палитру.' },
  { id: 'help', label: 'Справка', icon: 'help', description: 'Ответы на частые вопросы о Созвоне.' },
];
const currentSection = () => sections.some(section => section.id === location.hash.slice(1)) ? location.hash.slice(1) : 'profile';

export default function ProfilePage({ name: savedName, setName: commitName, tone: savedTone, setTone: commitTone, theme, selectTheme, monet }) {
  const [name, setName] = useState(savedName), [tone, setTone] = useState(savedTone);
  const compact = useMediaQuery('(max-width: 800px)');
  const [active, setActive] = useState(currentSection);
  const [mobileSectionOpen, setMobileSectionOpen] = useState(() => Boolean(location.hash));
  const [returnTo] = useState(() => settingsReturn(location.href, document.referrer));
  const previousSection = useRef(active);
  const content = useRef(null), view = useRef(null);
  const main = useRef(null), overviewScroll = useRef(0);
  const [contentHeight, setContentHeight] = useState(null);
  const [bio, setBio] = useState(() => { const saved = read('sozvon-bio', ''); return typeof saved === 'string' ? saved : ''; });
  const [error, setError] = useState(''), [status, setStatus] = useState('');
  const section = sections.find(item => item.id === active);
  useLayoutEffect(() => {
    if (!compact || !main.current) return;
    main.current.scrollTop = mobileSectionOpen ? 0 : overviewScroll.current;
    if (mobileSectionOpen) document.getElementById('settings-title')?.focus({ preventScroll: true });
    else main.current.querySelector(`[data-section="${active}"]`)?.focus({ preventScroll: true });
  }, [active, compact, mobileSectionOpen]);
  useLayoutEffect(() => {
    if (!content.current || !view.current) return;
    const measure = () => {
      const style = getComputedStyle(content.current);
      const padding = parseFloat(style.paddingBlockStart) + parseFloat(style.paddingBlockEnd);
      setContentHeight(Math.ceil(Math.max(view.current.getBoundingClientRect().height + padding, parseFloat(style.minHeight) || 0)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(view.current);
    return () => observer.disconnect();
  }, [active, compact, mobileSectionOpen]);
  useEffect(() => {
    const change = () => setActive(currentSection());
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    if (previousSection.current !== active) document.querySelector('#settings-title')?.focus({ preventScroll: true });
    previousSection.current = active;
  }, [active]);
  function navigate(id) { if (compact && !mobileSectionOpen) overviewScroll.current = main.current.scrollTop; setMobileSectionOpen(true); if (id !== active) { history.replaceState(history.state, '', `#${id}`); setActive(id); } }
  function submit(event) {
    event.preventDefault(); setStatus('');
    if (!name.trim()) { setError('Введите имя.'); event.currentTarget.querySelector('#profile-name').focus(); return; }
    try { saveProfile({ name: name.trim(), bio: bio.trim(), tone }); setName(name.trim()); commitName(name.trim()); commitTone(tone); setError(''); setStatus('Профиль сохранён'); }
    catch { setError('Разрешите хранение данных в браузере и сохраните профиль ещё раз.'); }
  }
  return <main ref={main} className="profile-main settings-main" id="profile-main">
    <a className="back-link" href={returnTo.href} onClick={event => {
      if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && returnTo.canGoBack && history.length > 1) { event.preventDefault(); history.back(); }
    }}><Icon name="arrow" />{returnTo.label}</a>
    {compact && mobileSectionOpen ? <button type="button" className="mobile-settings-back" onClick={() => { setMobileSectionOpen(false); history.replaceState(history.state, '', location.pathname + location.search); }}><Icon name="arrow" />Настройки</button> : <div className="profile-heading settings-heading"><h1>Настройки</h1></div>}
    {compact && !mobileSectionOpen && <div className="mobile-settings-overview"><button type="button" className="mobile-settings-account" data-section="profile" onClick={() => navigate('profile')}><span className="profile-avatar" data-tone={tone}>{(name.trim() || 'Я').slice(0,1).toUpperCase()}</span><span><strong>{name.trim() || 'Мой профиль'}</strong><small>Имя, описание и цвет аватара</small></span><Icon name="chevron" /></button><p className="mobile-settings-kicker">Приложение</p><nav aria-label="Разделы настроек" className="mobile-settings-sections">{sections.filter(item => item.id !== 'profile').map(item => <button type="button" key={item.id} data-section={item.id} onClick={() => navigate(item.id)}><span className="mobile-setting-icon"><Icon name={item.icon} /></span><span><strong>{item.id === 'audio' ? 'Звук и устройства' : item.id === 'privacy' ? 'Приватность' : item.label}</strong><small>{item.description}</small></span><Icon name="chevron" /></button>)}</nav><p className="mobile-settings-note">Настройте Созвон под себя</p></div>}
    {(!compact || mobileSectionOpen) && <div className="settings-shell">
      {!compact && <aside className="settings-sidebar"><p className="settings-sidebar-heading">Личное пространство</p><nav aria-label="Разделы настроек">{sections.map(item => <a key={item.id} href={`#${item.id}`} aria-current={active === item.id ? 'page' : undefined} onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(item.id); }}><span className="settings-nav-icon"><Icon name={item.icon} /></span><span>{item.label}</span><Icon name="chevron" className="settings-nav-arrow" /></a>)}</nav></aside>}
      <section ref={content} className="settings-content" aria-labelledby="settings-title" style={{ height: compact || contentHeight === null ? undefined : `${contentHeight}px` }}>
        <div ref={view} key={active} className="settings-view">
          <div className="settings-view-heading"><div><h2 id="settings-title" tabIndex={-1}>{section.label}</h2><p>{section.description}</p></div></div>
          {active === 'profile' && <>
            <div className="settings-profile-card" aria-label="Предпросмотр профиля"><span className="profile-avatar settings-avatar" id="profile-avatar" data-tone={tone}>{(name.trim() || 'Я').slice(0, 1).toUpperCase()}</span><div><h3 id="preview-name">{name.trim() || 'Имя'}</h3><p id="preview-bio">{bio.trim() || 'Ваш профиль во встречах и чатах'}</p></div></div>
            <form id="profile-form" className="settings-profile-form" noValidate onSubmit={submit} onChange={() => { setError(''); setStatus(''); }}>
              <TextField id="profile-name" name="name" label="Имя" icon="person" autoComplete="nickname" placeholder="Саша" maxLength={60} value={name} onChange={event => setName(event.target.value)} error={error} />
              <TextField id="profile-bio" name="bio" label="О себе" placeholder="Дизайнер интерфейсов" maxLength={100} value={bio} onChange={event => setBio(event.target.value)} />
              <fieldset className="avatar-colors settings-avatar-colors"><legend>Цвет аватара</legend>{[['blue', 'Синий'], ['mint', 'Мятный'], ['lavender', 'Сиреневый']].map(([color, label]) => <label key={color}><input type="radio" name="avatarColor" value={color} checked={tone === color} onChange={() => setTone(color)} /><span className={`color-swatch ${color === 'blue' ? '' : color}`} aria-hidden="true" />{label}</label>)}</fieldset>
              <div className="profile-save-row"><button type="button" className="product-button" onClick={() => { setName(savedName); setTone(savedTone); setBio(read('sozvon-bio', '')); setError(''); setStatus('Изменения отменены'); }}>Отменить</button><button type="submit" className="primary-button">Сохранить профиль<Icon name="check" /></button><span className="save-status" id="profile-status" role="status">{status}</span></div>
            </form>
            <div className="settings-profile-footer"><p className="settings-footnote"><Icon name="shield" />Профиль хранится в этом браузере.</p><a className="settings-inline-link" href="auth.html">Вход и регистрация<Icon name="arrow" /></a></div>
          </>}
          {active === 'privacy' && <PrivacySettings />}
          {active === 'audio' && <AudioSettings />}
          {active === 'notifications' && <NotificationSettings />}
          {active === 'appearance' && <AppearanceSettings theme={theme} selectTheme={selectTheme} monet={monet} />}
          {active === 'help' && <HelpSettings />}
        </div>
      </section>
    </div>}
  </main>;
}

function AppearanceSettings({ theme, selectTheme, monet }) {
  const mode = themeMode(theme, monet.systemDark);
  const lastChoice = useRef({ light: 'light', dark: 'dark' });
  const taps = useRef({ count: 0, at: 0 });
  const { notify } = useApp();
  useEffect(() => { if (theme !== 'monet-system') lastChoice.current[mode] = theme; }, [theme, mode]);
  function chooseMode(preset) {
    taps.current = preset.id === 'dark' ? advanceOledGesture(taps.current, Date.now()) : { count: 0, at: 0 };
    if (taps.current.count === 7) {
      taps.current = { count: 0, at: 0 };
      selectTheme('oled'); notify('OLED-чёрная включена.');
      return;
    }
    selectTheme(mode === preset.mode ? preset.id : lastChoice.current[preset.mode]);
  }
  const palettes = themes.filter(preset => preset.mode === mode && preset.id !== mode && !preset.hidden);
  return <div className="settings-appearance">
    <div className="settings-theme-choices" role="group" aria-label="Режим оформления">
      {themes.filter(preset => preset.id === 'light' || preset.id === 'dark').map(preset => <ThemeChoice key={preset.id} preset={preset} selected={mode === preset.mode && theme !== 'monet-system'} onSelect={() => chooseMode(preset)} descriptionId={`mode-description-${preset.id}`} />)}
    </div>
    <button type="button" className="settings-system-theme" aria-pressed={theme === 'monet-system'} onClick={() => { taps.current = { count: 0, at: 0 }; selectTheme('monet-system'); }}>
      <span className="settings-system-symbol" aria-hidden="true"><i /><i /><i /></span>
      <span><strong>Monet</strong><small>Следует теме системы и автоматически подбирает цвета.</small></span>
      <span className="settings-choice-check" aria-hidden="true">{theme === 'monet-system' && <Icon name="check" />}</span>
    </button>
    <h3 className="settings-palette-label">{mode === 'light' ? 'Светлые палитры' : 'Тёмные палитры'}</h3>
    <div className="settings-theme-presets" style={{ '--palette-count': palettes.length }} role="group" aria-label={mode === 'light' ? 'Светлые палитры' : 'Тёмные палитры'}>
      {palettes.map(preset => <ThemeChoice key={preset.id} preset={preset} selected={theme === preset.id} onSelect={() => { taps.current = { count: 0, at: 0 }; selectTheme(preset.id); }} descriptionId={`theme-description-${preset.id}`} />)}
    </div>
  </div>;
}

function ThemeChoice({ preset, selected, onSelect, descriptionId }) {
  return <button type="button" className="settings-theme-choice" aria-label={preset.label} aria-describedby={descriptionId} aria-pressed={selected} onClick={onSelect}>
    <span className="settings-theme-preview" data-preset={preset.id} aria-hidden="true"><i /><i /><i /><b /><em /></span>
    <span className="settings-theme-caption"><Icon name={preset.icon} />{preset.label}<span className="settings-choice-check" aria-hidden="true">{selected && <Icon name="check" />}</span></span>
    <small className="settings-theme-description" id={descriptionId}>{preset.description}</small>
  </button>;
}

function PrivacySettings() {
  const { openMeetings } = useApp();
  const narrow = useMediaQuery('(max-width: 760px)');
  return <div className="settings-privacy">
    <div className="settings-info-card"><span className="settings-info-icon"><Icon name="shield" /></span><h3>Хранение данных</h3><p>Профиль и встречи хранятся в этом браузере и не переносятся на другие устройства.</p></div>
    <div className="settings-info-row"><Icon name="video" /><div><h3>Камера и микрофон</h3><p>Включаются только с вашего разрешения.</p></div></div>
    <div className="settings-info-row"><Icon name="monitor" /><div><h3>Показ экрана</h3><p>Вы выбираете окно или экран. Показ прекращается при выходе из встречи.</p></div></div>
    <div className="settings-info-row"><Icon name="calendar" /><div><h3>Встречи</h3><a className="settings-inline-link" href="meetings.html" aria-haspopup={narrow ? undefined : 'dialog'} aria-controls={narrow ? undefined : 'meetings-modal'} onClick={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); openMeetings();
    }}>Открыть календарь<Icon name="arrow" /></a></div></div>
    <p className="settings-description">Доступ к камере и микрофону можно изменить в настройках браузера.</p>
  </div>;
}

function AudioSettings() {
  const [preferences, setPreferences] = useState(readAudioPreferences);
  const [status, setStatus] = useState(''), [playing, setPlaying] = useState(false);
  const audio = useRef(null);
  useEffect(() => () => { const context = audio.current; audio.current = null; context?.close().catch(() => {}); }, []);
  function update(patch) {
    const next = normalizeAudioPreferences({ ...preferences, ...patch });
    setPreferences(next);
    try { write('sozvon-audio', next); setStatus('Настройки сохранены'); }
    catch { setStatus('Не удалось сохранить настройки. Разрешите хранение данных в браузере.'); }
  }
  async function testSound() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) { setStatus('Проверка звука недоступна. Попробуйте другой браузер.'); return; }
    let context;
    try {
      context = new Audio(); audio.current = context; setPlaying(true); setStatus('');
      await context.resume();
      const output = readDevicePreferences().speaker;
      if (output !== 'default' && typeof context.setSinkId === 'function') await context.setSinkId(output);
      if (audio.current !== context) return;
      const oscillator = context.createOscillator(), gain = context.createGain(), now = context.currentTime;
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(523.25, now);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.08 * preferences.testVolume / 100, now + .03); gain.gain.exponentialRampToValueAtTime(.0001, now + .5);
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(now); oscillator.stop(now + .55);
      oscillator.onended = () => { context.close().catch(() => {}); if (audio.current === context) { audio.current = null; setPlaying(false); setStatus('Не слышно сигнала? Проверьте громкость устройства.'); } };
    } catch {
      context?.close().catch(() => {});
      if (!context || audio.current === context) { audio.current = null; setPlaying(false); setStatus('Не удалось воспроизвести звук. Проверьте настройки браузера.'); }
    }
  }
  return <div className="settings-audio"><DeviceSettings />
    <div className="settings-group"><h3>Вывод звука</h3><div className="settings-device-row"><span className="settings-info-icon"><Icon name="speaker" /></span><div><strong>По умолчанию</strong><p>Динамики или наушники, выбранные в системе.</p></div></div>
      <div className="settings-volume-heading"><label htmlFor="test-volume">Громкость тестового сигнала</label><output htmlFor="test-volume">{formatPercent(preferences.testVolume)}</output></div><input className="settings-range" id="test-volume" type="range" min="0" max="100" step="5" value={preferences.testVolume} onChange={event => update({ testVolume: Number(event.target.value) })} />
      <button type="button" className="settings-secondary-button" onClick={testSound} disabled={playing || preferences.testVolume === 0}><Icon name="speaker" />{playing ? 'Проверка…' : 'Проверить звук'}</button>
    </div>
    <div className="settings-group"><h3>Обработка микрофона</h3><SettingsSwitch label="Шумоподавление" description="Уменьшает фоновый шум." checked={preferences.noiseSuppression} onChange={checked => update({ noiseSuppression: checked })} /><SettingsSwitch label="Устранение эха" description="Убирает эхо от динамиков." checked={preferences.echoCancellation} onChange={checked => update({ echoCancellation: checked })} /><p className="settings-description">Применится при следующем включении микрофона. Поддержка зависит от браузера.</p></div>
    <p className="settings-status" role="status">{status}</p>
  </div>;
}

function SettingsSwitch({ label, description, checked, onChange }) {
  return <label className="settings-switch-row"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" role="switch" checked={checked} onChange={event => onChange(event.target.checked)} /></label>;
}

function HelpSettings() {
  return <div className="settings-help"><div className="settings-faq">{helpQuestions.map(({ question, answer }) => <details key={question}><summary>{question}<Icon name="chevron" /></summary><p>{answer}</p></details>)}</div></div>;
}

function NotificationSettings() {
  const [preferences, setPreferences] = useState(readNotifications), [status, setStatus] = useState('');
  const { notify } = useApp();
  function update(patch) {
    const next = { ...preferences, ...patch }; setPreferences(next);
    try { write('sozvon-notifications', next); window.dispatchEvent(new Event('sozvon-notifications')); setStatus('Настройки сохранены'); }
    catch { setStatus('Разрешите хранение данных в браузере, чтобы сохранить настройки.'); }
  }
  return <div className="settings-notifications"><div className="settings-group"><h3>Сообщения</h3><SettingsSwitch label="Звуки сообщений" description="Воспроизводить звук новых уведомлений." checked={preferences.sound} onChange={sound => update({ sound })} /><SettingsSwitch label="Счётчики непрочитанного" description="Показывать число новых сообщений в списке чатов." checked={preferences.badges} onChange={badges => update({ badges })} /></div><div className="settings-group"><h3>Встречи</h3><SettingsSwitch label="Напоминания во вкладке" description="Показывать напоминание, пока открыт Созвон. Время задаётся у каждой встречи." checked={preferences.reminders} onChange={reminders => update({ reminders })} /></div><div className="notification-example"><span className="upcoming-symbol"><Icon name="chat" /></span><div><strong>Новое сообщение</strong><p>Анна: Посмотрим макеты на созвоне?</p><small>Так выглядит уведомление в макете</small></div></div><button type="button" className="settings-secondary-button" onClick={() => { notify('Анна: Посмотрим макеты на созвоне?'); if (preferences.sound) { try { const Audio = window.AudioContext || window.webkitAudioContext; const audio = new Audio(); const oscillator = audio.createOscillator(), gain = audio.createGain(); oscillator.frequency.value = 660; gain.gain.setValueAtTime(.025, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + .18); oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .2); oscillator.onended = () => audio.close(); } catch { setStatus('Звук недоступен. Проверьте разрешения браузера.'); } } }}><Icon name="eye" />Показать пример</button><p className="settings-status" role="status">{status}</p></div>;
}
