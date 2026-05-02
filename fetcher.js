export function parseEvents(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const raw = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    return {
      title: raw['Name'],
      school: raw['School'],
      date: raw['Date'],
      time: raw['Time'],
      timezone: raw['Timezone'],
      format: raw['Format'],
      description: raw['Description'],
      location: raw['Location'],
      registrationUrl: raw['Registration URL'],
    };
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

export async function fetchEvents() {
  const res = await fetch('events.csv');
  if (!res.ok) throw new Error(`Failed to load events: ${res.status}`);
  return parseEvents(await res.text());
}
