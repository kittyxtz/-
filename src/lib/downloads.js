export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const escapeCalendar = value => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
export function meetingCalendar(meeting, url, now = new Date()) {
  const start = new Date(meeting.date), end = new Date(start.getTime() + (meeting.duration || 30) * 60000);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sozvon//Meetings//RU', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${meeting.code}@sozvon.local`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escapeCalendar(meeting.title)}`, `DESCRIPTION:${escapeCalendar(`Встреча в Созвоне\n${url}`)}`, `URL:${url}`, ...(meeting.reminder ? ['BEGIN:VALARM', `TRIGGER:-PT${meeting.reminder}M`, 'ACTION:DISPLAY', 'DESCRIPTION:Скоро встреча', 'END:VALARM'] : []), 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
}
export function exportMeeting(meeting, url) {
  downloadBlob(new Blob([meetingCalendar(meeting, url)], { type: 'text/calendar;charset=utf-8' }), `${meeting.title.replace(/[<>:"/\\|?*]/g, '').slice(0, 80) || 'Встреча'}.ics`);
}
