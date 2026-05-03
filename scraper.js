import { extractEventsFromUrl } from './gemini.js';
import { eventsToCSV, mergeEvents, downloadCSV } from './csvexport.js';
import { parseEvents } from './fetcher.js';

const KEY_STORAGE = 'gemini-api-key';

const TABLE_COLS = ['title', 'school', 'date', 'time', 'timezone', 'format', 'description', 'location', 'registrationUrl'];
const TABLE_HEADS = ['Title', 'School', 'Date', 'Time', 'Timezone', 'Format', 'Description', 'Location', 'Registration URL'];

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

function renderResultTable(events) {
  if (events.length === 0) return '';
  const headCells = TABLE_HEADS.map(h => `<th>${h}</th>`).join('') + '<th></th>';
  const rows = events.map(e => {
    const cells = TABLE_COLS.map(k => `<td contenteditable="true">${e[k] ?? ''}</td>`).join('');
    return `<tr>${cells}<td><button class="btn-del-row" aria-label="Delete row">✕</button></td></tr>`;
  }).join('');
  return `
    <table class="result-table">
      <thead><tr>${headCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="export-actions">
      <button id="btn-fresh-csv">Download fresh events.csv</button>
      <button id="btn-merge-csv">Merge with existing events.csv</button>
    </div>`;
}

function readTableEvents() {
  const tbody = document.querySelector('.result-table tbody');
  if (!tbody) return [];
  return Array.from(tbody.querySelectorAll('tr')).map(row => {
    const cells = row.querySelectorAll('td[contenteditable]');
    return Object.fromEntries(TABLE_COLS.map((k, i) => [k, cells[i]?.textContent.trim() ?? '']));
  });
}

function wireExportButtons() {
  document.getElementById('btn-fresh-csv')?.addEventListener('click', () => {
    downloadCSV('events.csv', eventsToCSV(readTableEvents()));
  });

  document.getElementById('btn-merge-csv')?.addEventListener('click', async () => {
    try {
      const res = await fetch('events.csv');
      const existing = res.ok ? parseEvents(await res.text()) : [];
      const scraped = readTableEvents();
      downloadCSV('events.csv', eventsToCSV(mergeEvents(existing, scraped)));
    } catch {
      alert('Could not fetch existing events.csv. Downloading fresh CSV instead.');
      downloadCSV('events.csv', eventsToCSV(readTableEvents()));
    }
  });

  document.querySelector('.result-table tbody')?.addEventListener('click', e => {
    if (e.target.classList.contains('btn-del-row')) {
      e.target.closest('tr').remove();
    }
  });
}

function getSelectedSchools() {
  return M7_SCHOOLS.filter(s =>
    document.querySelector(`input[name="school"][value="${CSS.escape(s.name)}"]`)?.checked
  );
}

async function runScrape() {
  const apiKey = getApiKey();
  if (!apiKey) {
    setResults('<p class="status error">Please enter your Gemini API key above.</p>');
    return;
  }

  const toScrape = getSelectedSchools();
  if (toScrape.length === 0) {
    setResults('<p class="status error">Select at least one school.</p>');
    return;
  }

  const btn = document.getElementById('scrape-btn');
  btn.disabled = true;
  setResults('');

  const results = [];

  for (let i = 0; i < toScrape.length; i++) {
    const school = toScrape[i];
    setProgress(`<p class="status">Scraping ${school.name}… (${i + 1} of ${toScrape.length})</p>`);
    try {
      const events = await extractEventsFromUrl(apiKey, school.url);
      results.push({ school: school.name, events, error: null });
    } catch (err) {
      results.push({ school: school.name, events: [], error: err.message });
      if (err.message.includes('API key')) break;
    }
  }

  setProgress('');
  const { allEvents, summary } = aggregateResults(results);
  setResults(renderSummary(summary, allEvents.length) + renderResultTable(allEvents));
  wireExportButtons();
  btn.disabled = false;
}

function renderSchoolSelect() {
  const section = document.getElementById('school-select');
  const items = M7_SCHOOLS.map(s => `
    <li>
      <label class="filter-label">
        <input type="checkbox" name="school" value="${s.name}" checked />
        <span>${s.name}</span>
      </label>
    </li>`).join('');

  section.innerHTML = `
    <div class="school-select-header">
      <h2>Schools</h2>
      <div class="school-select-toggles">
        <button id="btn-select-all" class="btn-text-link">Select all</button>
        <button id="btn-deselect-all" class="btn-text-link">Deselect all</button>
      </div>
    </div>
    <ul class="school-check-list">${items}</ul>`;

  document.getElementById('btn-select-all').addEventListener('click', () => {
    section.querySelectorAll('input[name="school"]').forEach(cb => { cb.checked = true; });
  });
  document.getElementById('btn-deselect-all').addEventListener('click', () => {
    section.querySelectorAll('input[name="school"]').forEach(cb => { cb.checked = false; });
  });
}

export function init() {
  const input = document.getElementById('api-key');
  const saved = localStorage.getItem(KEY_STORAGE);
  if (saved) input.value = saved;
  input.addEventListener('input', () => localStorage.setItem(KEY_STORAGE, input.value.trim()));
  renderSchoolSelect();
  document.getElementById('scrape-btn').addEventListener('click', runScrape);
}

if (typeof document !== 'undefined') {
  init();
}
