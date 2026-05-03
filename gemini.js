const PROXY = 'https://corsproxy.io/?';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const EVENT_SCHEMA = `Return ONLY a valid JSON array with no explanation, markdown, or code fences.
Each element must have exactly these fields:
- title: event name (string, no commas)
- school: exactly one of: Harvard Business School / Stanford GSB / Wharton / Booth / Kellogg / MIT Sloan / Columbia Business School
- date: M/D/YYYY format (e.g. 5/15/2026)
- time: HH:MM 24-hour format (e.g. 18:00)
- timezone: IANA timezone (e.g. America/New_York)
- format: exactly "Virtual" or "In-Person"
- description: one sentence summary with no commas
- location: physical address or "Online"
- registrationUrl: direct registration URL or empty string

If no events are found return an empty array [].`;

const EXTRACTION_PROMPT = `Extract all upcoming MBA information events from the following HTML.\n${EVENT_SCHEMA}\n\nHTML:\n`;

export async function fetchViaProxy(url) {
  const res = await fetch(PROXY + encodeURIComponent(url));
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  return res.text();
}

export async function extractEventsFromUrl(apiKey, url) {
  const prompt = `Visit this URL and extract all upcoming MBA admissions events.\n${EVENT_SCHEMA}\n\nURL: ${url}`;
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tools: [{ url_context: {} }],
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new Error('Invalid or expired Gemini API key. Get a free key at https://aistudio.google.com/apikey');
    }
    throw new Error(`Gemini API error: HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function extractEvents(apiKey, html) {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: EXTRACTION_PROMPT + html }] }],
    }),
  });

  if (!res.ok) {
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new Error('Invalid or expired Gemini API key. Get a free key at https://aistudio.google.com/apikey');
    }
    throw new Error(`Gemini API error: HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
