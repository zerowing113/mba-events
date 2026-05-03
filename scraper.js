import { fetchViaProxy, extractEvents } from './gemini.js';

const KEY_STORAGE = 'gemini-api-key';
const HBS_URL = 'https://www.hbs.edu/mba/admissions/pages/events.aspx';

function getApiKey() {
  return document.getElementById('api-key').value.trim();
}

function setProgress(html) {
  document.getElementById('progress').innerHTML = html;
}

function setResults(html) {
  document.getElementById('results').innerHTML = html;
}

function renderEventList(events) {
  if (events.length === 0) {
    setResults('<p class="status">No events found. The page structure may have changed — try again or check the HBS events page manually.</p>');
    return;
  }
  setResults(`
    <p class="scrape-count">${events.length} event${events.length !== 1 ? 's' : ''} extracted</p>
    <ul class="scrape-list">
      ${events.map(e => `
        <li class="scrape-item">
          <strong>${e.title}</strong>
          <span class="scrape-meta">${e.school} &middot; ${e.date} ${e.time} &middot; ${e.format}</span>
          <span class="scrape-desc">${e.description}</span>
        </li>`).join('')}
    </ul>
  `);
}

async function runScrape() {
  const apiKey = getApiKey();
  if (!apiKey) {
    setResults('<p class="status error">Please enter your Gemini API key above.</p>');
    return;
  }

  const btn = document.getElementById('scrape-btn');
  btn.disabled = true;
  setResults('');
  setProgress('<p class="status">Fetching HBS events page…</p>');

  try {
    const html = await fetchViaProxy(HBS_URL);
    setProgress('<p class="status">Extracting events with Gemini…</p>');
    const events = await extractEvents(apiKey, html);
    setProgress('');
    renderEventList(events);
  } catch (err) {
    setProgress('');
    const msg = err.message.includes('API key')
      ? err.message
      : `Failed to scrape HBS events: ${err.message}`;
    setResults(`<p class="status error">${msg}</p>`);
  } finally {
    btn.disabled = false;
  }
}

export function init() {
  const input = document.getElementById('api-key');
  const saved = localStorage.getItem(KEY_STORAGE);
  if (saved) input.value = saved;
  input.addEventListener('input', () => localStorage.setItem(KEY_STORAGE, input.value.trim()));
  document.getElementById('scrape-btn').addEventListener('click', runScrape);
}

if (typeof document !== 'undefined') {
  init();
}
