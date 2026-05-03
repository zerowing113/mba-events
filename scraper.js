import { fetchViaProxy, extractEvents } from './gemini.js';

const KEY_STORAGE = 'gemini-api-key';

export const M7_SCHOOLS = [
  { name: 'Harvard Business School',  url: 'https://www.hbs.edu/mba/admissions/pages/events.aspx' },
  { name: 'Stanford GSB',             url: 'https://www.gsb.stanford.edu/programs/mba/admissions/events' },
  { name: 'Wharton',                  url: 'https://mba.wharton.upenn.edu/mba-admissions/events/' },
  { name: 'Booth',                    url: 'https://www.chicagobooth.edu/mba/full-time/admissions/events' },
  { name: 'Kellogg',                  url: 'https://www.kellogg.northwestern.edu/programs/full-time-mba/admissions/visit.aspx' },
  { name: 'MIT Sloan',                url: 'https://mitsloan.mit.edu/mba/admissions/events' },
  { name: 'Columbia Business School', url: 'https://home.gsb.columbia.edu/mba/admissions/events' },
];

export function aggregateResults(results) {
  const allEvents = results.flatMap(r => r.events);
  const summary = results.map(r => ({
    school: r.school,
    count: r.events.length,
    error: r.error ?? null,
    flagged: r.error !== null || r.events.length === 0,
  }));
  return { allEvents, summary };
}

function getApiKey() {
  return document.getElementById('api-key').value.trim();
}

function setProgress(html) {
  document.getElementById('progress').innerHTML = html;
}

function setResults(html) {
  document.getElementById('results').innerHTML = html;
}

function renderSummary(summary, totalCount) {
  const rows = summary.map(s => {
    const flag = s.flagged ? ' ⚠' : '';
    const detail = s.error ? `<span class="scrape-error">${s.error}</span>`
                           : `${s.count} event${s.count !== 1 ? 's' : ''}`;
    return `<li class="summary-row${s.flagged ? ' flagged' : ''}">${s.school}${flag}: ${detail}</li>`;
  }).join('');

  return `
    <p class="scrape-count">${totalCount} event${totalCount !== 1 ? 's' : ''} extracted across ${summary.filter(s => !s.flagged).length} schools</p>
    <ul class="summary-list">${rows}</ul>`;
}

function renderEventList(events) {
  if (events.length === 0) return '';
  return `
    <ul class="scrape-list">
      ${events.map(e => `
        <li class="scrape-item">
          <strong>${e.title}</strong>
          <span class="scrape-meta">${e.school} &middot; ${e.date} ${e.time} &middot; ${e.format}</span>
          <span class="scrape-desc">${e.description}</span>
        </li>`).join('')}
    </ul>`;
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

  const results = [];

  for (let i = 0; i < M7_SCHOOLS.length; i++) {
    const school = M7_SCHOOLS[i];
    setProgress(`<p class="status">Scraping ${school.name}… (${i + 1} of ${M7_SCHOOLS.length})</p>`);
    try {
      const html = await fetchViaProxy(school.url);
      const events = await extractEvents(apiKey, html);
      results.push({ school: school.name, events, error: null });
    } catch (err) {
      results.push({ school: school.name, events: [], error: err.message });
      if (err.message.includes('API key')) break;
    }
  }

  setProgress('');
  const { allEvents, summary } = aggregateResults(results);
  setResults(renderSummary(summary, allEvents.length) + renderEventList(allEvents));
  btn.disabled = false;
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
