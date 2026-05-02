export function filterEvents(events, { schools = [], format = null } = {}) {
  return events.filter(e => {
    if (schools.length > 0 && !schools.includes(e.school)) return false;
    if (format !== null && e.format !== format) return false;
    return true;
  });
}
