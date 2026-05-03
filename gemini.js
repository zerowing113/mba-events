const PROXY = 'https://corsproxy.io/?';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export const DEFAULT_MODEL = 'gemini-2.0-flash';

function geminiUrl(model) {
  return `${GEMINI_BASE}/${model}:generateContent`;
}

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

const EXTRACTION_PROMPT = `Extract all upcoming MBA information events from the following page content.\n${EVENT_SCHEMA}\n\nContent:\n`;

function geminiError(status) {
  if (status === 400 || status === 401 || status === 403) {
    return new Error('Invalid or expired Gemini API key. Get a free key at https://aistudio.google.com/apikey');
  }
  if (status === 429) {
    return new Error('Rate limit reached — wait a moment and try again, or scrape fewer schools at once.');
  }
  return new Error(`Gemini API error: HTTP ${status}`);
}

export async function testApiKey(apiKey, model = DEFAULT_MODEL) {
  const res = await fetch(`${geminiUrl(model)}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with OK' }] }] }),
  });
  if (!res.ok) throw geminiError(res.status);
}

export async function fetchViaProxy(url) {
  const res = await fetch(PROXY + encodeURIComponent(url));
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  return res.text();
}

export async function extractEventsFromUrl(apiKey, url, model = DEFAULT_MODEL) {
  const prompt = `Visit this URL and extract all upcoming MBA admissions events.\n${EVENT_SCHEMA}\n\nURL: ${url}`;
  const res = await fetch(`${geminiUrl(model)}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tools: [{ url_context: {} }],
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) throw geminiError(res.status);

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

export async function extractEvents(apiKey, html, model = DEFAULT_MODEL) {
  const res = await fetch(`${geminiUrl(model)}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: EXTRACTION_PROMPT + html }] }],
    }),
  });

  if (!res.ok) throw geminiError(res.status);

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
