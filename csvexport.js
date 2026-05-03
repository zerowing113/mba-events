const HEADERS = ['Name', 'School', 'Date', 'Time', 'Timezone', 'Format', 'Description', 'Location', 'Registration URL'];

function eventToRow(e) {
  return [e.title, e.school, e.date, e.time, e.timezone, e.format, e.description, e.location, e.registrationUrl]
    .map(v => (String(v ?? '').includes(',') ? `"${v}"` : (v ?? '')))
    .join(',');
}

export function eventsToCSV(events) {
  return [HEADERS.join(','), ...events.map(eventToRow)].join('\n');
}

export function mergeEvents(existing, scraped) {
  const key = e => `${e.school}|${e.date}|${e.title}`;
  const seen = new Set(existing.map(key));
  return [...existing, ...scraped.filter(e => !seen.has(key(e)))];
}

export function downloadCSV(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
