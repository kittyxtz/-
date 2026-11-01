import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context';
import { readNotifications } from '../lib/notificationPreferences';
import { meetingUrl } from '../lib/meetings';
import { Icon } from './Icons';

export default function ReminderBanner() {
  const { meetings } = useApp();
  const [settings, setSettings] = useState(readNotifications), [meeting, setMeeting] = useState(null);
  const seen = useRef(new Set());
  useEffect(() => { const update = () => setSettings(readNotifications()); window.addEventListener('sozvon-notifications', update); return () => window.removeEventListener('sozvon-notifications', update); }, []);
  useEffect(() => {
    const check = () => {
      if (!settings.reminders) return;
      const now = Date.now(), next = meetings.find(item => item.reminder && !seen.current.has(`${item.code}:${item.date}`) && new Date(item.date).getTime() > now && new Date(item.date).getTime() - now <= item.reminder * 60000);
      setMeeting(current => current && !meetings.some(item => item.code === current.code && item.date === current.date && new Date(item.date).getTime() > now) ? null : current);
      if (next) { seen.current.add(`${next.code}:${next.date}`); setMeeting(next); }
    };
    check(); const timer = setInterval(check, 30000); return () => clearInterval(timer);
  }, [meetings, settings.reminders]);
  if (!meeting || !settings.reminders) return null;
  return <aside className="product-reminder" aria-label="Напоминание о встрече"><span className="upcoming-symbol"><Icon name="calendar" /></span><div><p className="product-eyebrow" role="status">Скоро встреча</p><strong>{meeting.title}</strong><a href={meetingUrl(meeting.code)}>Присоединиться<Icon name="arrow" /></a></div><button type="button" className="chat-icon-button" aria-label="Закрыть напоминание" onClick={() => setMeeting(null)}><Icon name="close" /></button></aside>;
}
