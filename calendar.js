function toDateTimeStr(date, time) {
  const [month, day, year] = date.split('/');
  const [hour, minute] = time.split(':');
  return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}T${hour.padStart(2, '0')}${minute.padStart(2, '0')}00`;
}

function addOneHour(dtStr) {
  const hour = parseInt(dtStr.slice(9, 11), 10);
  return dtStr.slice(0, 9) + String(hour + 1).padStart(2, '0') + dtStr.slice(11);
}

export function googleCalendarUrl(event) {
  const start = toDateTimeStr(event.date, event.time);
  const end = addOneHour(start);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    ctz: event.timezone,
    details: `${event.description}${event.registrationUrl ? '\n\nRegister: ' + event.registrationUrl : ''}`,
    location: event.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function toIcs(event) {
  const start = toDateTimeStr(event.date, event.time);
  const end = addOneHour(start);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MBA Events Tracker//EN',
    'BEGIN:VEVENT',
    `DTSTART;TZID=${event.timezone}:${start}`,
    `DTEND;TZID=${event.timezone}:${end}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description}${event.registrationUrl ? '\\nRegister: ' + event.registrationUrl : ''}`,
    `LOCATION:${event.location ?? ''}`,
    `URL:${event.registrationUrl ?? ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(event) {
  const blob = new Blob([toIcs(event)], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.ics';
  a.click();
  URL.revokeObjectURL(a.href);
}
