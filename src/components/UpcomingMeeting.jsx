import { useApp } from '../context';
import { formatDate, meetingUrl } from '../lib/meetings';
import { exportMeeting } from '../lib/downloads';
import { Icon } from './Icons';

export default function UpcomingMeeting() {
  const { meetings } = useApp();
  const next = meetings.find(meeting => new Date(meeting.date).getTime() >= Date.now());
  if (!next) return null;
  return <section className="upcoming-meeting" aria-labelledby="upcoming-title"><span className="upcoming-symbol"><Icon name="calendar" /></span><div className="upcoming-copy"><p className="product-eyebrow">Ближайшая встреча</p><h2 id="upcoming-title">{next.title}</h2><p>{formatDate(new Date(next.date), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}<span aria-hidden="true"> · </span>{next.duration || 30} минут</p></div><div className="upcoming-actions"><button type="button" className="product-button" onClick={() => exportMeeting(next, meetingUrl(next.code))}><Icon name="calendar-plus" /><span>В календарь</span></button><a className="product-button is-primary" href={meetingUrl(next.code)}>К встрече<Icon name="arrow" /></a></div></section>;
}
