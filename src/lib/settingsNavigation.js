function knownSource(value, current) {
  if (!value) return null;
  let url;
  try { url = new URL(value, current); } catch { return null; }
  if (url.origin !== current.origin) return null;
  const base = new URL('./', current).pathname;
  const labels = new Map([
    [base, 'На главную'], [`${base}index.html`, 'На главную'],
    [`${base}chats.html`, 'В чаты'], [`${base}meetings.html`, 'В «Мои встречи»'],
    [`${base}auth.html`, 'К входу'], [`${base}guest.html`, 'К входу без аккаунта'],
    [`${base}meeting.html`, `В «${url.searchParams.get('title')?.trim() || 'Встреча'}»`],
  ]);
  const label = labels.get(url.pathname);
  return label ? { href: url.href, label } : null;
}

export function settingsReturn(currentHref, referrer = '') {
  const current = new URL(currentHref);
  const destination = knownSource(current.searchParams.get('returnTo'), current) || knownSource(referrer, current) || { href: new URL('./', current).href, label: 'На главную' };
  let canGoBack = false;
  try {
    const previous = new URL(referrer), target = new URL(destination.href);
    canGoBack = previous.origin === target.origin && previous.pathname === target.pathname && previous.search === target.search;
  } catch { /* A direct visit uses the destination link. */ }
  return { ...destination, canGoBack };
}

export function settingsHref(section = '', sourceHref = location.href) {
  const source = new URL(sourceHref), target = new URL('./profile.html', source);
  if (source.pathname === target.pathname) target.search = source.search;
  else target.searchParams.set('returnTo', source.pathname + source.search + source.hash);
  if (section) target.hash = section;
  return target.href;
}
