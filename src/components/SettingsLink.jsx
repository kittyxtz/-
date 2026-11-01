import { settingsHref } from '../lib/settingsNavigation';

export default function SettingsLink({ section = '', children, onClick, ...props }) {
  return <a {...props} href={settingsHref(section)} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    event.currentTarget.href = settingsHref(section);
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!location.pathname.endsWith('/profile.html')) return;
    event.preventDefault();
    history.replaceState(history.state, '', settingsHref(section || 'profile'));
    window.dispatchEvent(new Event('hashchange'));
  }}>{children}</a>;
}
