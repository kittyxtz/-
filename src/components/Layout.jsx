import { useState } from 'react';
import { useApp } from '../context';
import { Icon } from './Icons';
import SettingsLink from './SettingsLink';
import UserProfileButton from './UserProfileButton';
import useMediaQuery from '../lib/useMediaQuery';

export function Brand() {
  return <a className="brand" href="./" aria-label="Созвон — главная"><span className="brand-mark"><Icon name="air" /></span><span>созвон<span className="brand-dot">.</span></span></a>;
}
export function Header({ page, name, tone, openMeetings }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const links = [{ id: 'chats', href: 'chats.html', icon: 'chat', label: 'Чаты' }, { id: 'meetings', href: 'meetings.html', icon: 'calendar', label: 'Встречи' }, { id: 'profile', href: 'profile.html', icon: 'settings', label: 'Настройки' }];
  const navigation = !['auth', 'guest', 'meeting', 'home'].includes(page);
  const { navigateTab, navigationTarget, authenticated } = useApp();
  const active = navigationTarget || (profileOpen ? 'self' : page);
  const index = ({ chats: 0, meetings: 1, profile: 2, self: 3 })[active] ?? 0;
  function navigate(event, href) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (href === 'meetings.html') { event.preventDefault(); openMeetings(); return; }
    if (!navigateTab) return;
    event.preventDefault(); navigateTab(href);
  }
  return <><header className="header page-width product-header"><Brand /><div className="header-actions">
    {navigation && <nav className="product-navigation" style={{ '--nav-index': Math.min(2,index) }} aria-label="Основная навигация"><span className="desktop-nav-indicator" aria-hidden="true" />{links.map(link => <a key={link.id} href={link.href} aria-current={active === link.id ? 'page' : undefined} onClick={event => navigate(event, link.href)}><Icon name={link.icon} /><span>{link.label}</span></a>)}</nav>}
    {page === 'home' && <a href={authenticated ? 'chats.html' : 'auth.html#login'} className="profile-link profile-avatar-only" aria-label={authenticated ? 'Открыть чаты' : 'Войти в аккаунт'}><span className="profile-avatar" id="header-avatar" data-tone={tone}>{authenticated ? (name.trim() || 'Я').slice(0,1).toUpperCase() : <Icon name="person" />}</span></a>}
    {['auth', 'guest'].includes(page) && <a className="product-header-back" href="./"><Icon name="arrow" />На главную</a>}
  </div></header>{(navigation || page === 'home') && <nav className={`product-mobile-nav${page === 'home' ? ' is-home-navigation' : ''}`} style={{ '--nav-index': index }} aria-label="Основная навигация"><span className="mobile-nav-indicator" aria-hidden="true" />{links.map(link => <a key={link.id} href={link.href} aria-current={active === link.id ? 'page' : undefined} onClick={event => navigate(event, link.href)}><Icon name={link.icon} /><span>{link.label}</span></a>)}<UserProfileButton name={name} tone={tone} className="mobile-profile-tab" asTab onOpenChange={setProfileOpen}><Icon name="person" /><span>Профиль</span></UserProfileButton></nav>}</>;
}
export function Footer({ openMeetings, compact = false }) {
  const { setHelpOpen } = useApp();
  const narrow = useMediaQuery('(max-width: 760px)');
  return <footer className="footer site-footer page-width"><div className="footer-main"><div className="footer-identity"><Brand /></div><nav className="footer-nav" aria-label="Навигация внизу страницы"><a href="./#main">Создать встречу</a><a href="meetings.html" aria-haspopup={narrow ? undefined : 'dialog'} aria-controls={narrow ? undefined : 'meetings-modal'} onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); openMeetings(); }}>Мои встречи</a><a href="chats.html">Чаты</a><SettingsLink>Настройки</SettingsLink>{!compact && <a href="auth.html">Вход и регистрация</a>}<button type="button" id="help-button" onClick={() => setHelpOpen(true)}>Справка</button></nav></div><div className="footer-base"><p>© <span>{new Date().getFullYear()}</span> Созвон</p></div></footer>;
}
