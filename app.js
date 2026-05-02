import { fetchEvents } from './fetcher.js';

const SCHOOL_BADGE = {
  'Harvard Business School':   { abbr: 'HBS',    color: '#A51C30' },
  'Stanford GSB':              { abbr: 'GSB',    color: '#8C1515' },
  'Wharton':                   { abbr: 'WH',     color: '#011F5B' },
  'Booth':                     { abbr: 'Booth',  color: '#800000' },
  'Kellogg':                   { abbr: 'KSM',    color: '#4E2A84' },
  'MIT Sloan':                 { abbr: 'Sloan',  color: '#750014' },
  'Columbia Business School':  { abbr: 'CBS',    color: '#003087' },
};

function isPast(dateStr) {
  return new Date(dateStr) < new Date('2026-05-02');
}

function renderCard(e) {
  const badge = SCHOOL_BADGE[e.school] ?? { abbr: e.school, color: '#555' };
  const past = isPast(e.date);
  const registerBtn = e.registrationUrl
    ? `<a class="btn-register" href="${e.registrationUrl}" target="_blank" rel="noopener">Register</a>`
    : '';
  return `
    <li class="event-card${past ? ' past' : ''}">
      <div class="event-meta">
        <span class="event-school-badge" style="background:${badge.color}">${badge.abbr}</span>
        <span class="event-school-name">${e.school}</span>
        <span class="event-format tag-${e.format === 'Virtual' ? 'virtual' : 'in-person'}">${e.format}</span>
      </div>
      <h2 class="event-title">${e.title}</h2>
      <p class="event-datetime">${e.date} &middot; ${e.time} <span class="event-tz">${e.timezone}</span></p>
      <p class="event-description">${e.description}</p>
      <div class="event-actions">
        ${registerBtn}
      </div>
    </li>`;
}

function renderLoading(app) {
  app.innerHTML = '<p class="status">Loading events…</p>';
}

function renderError(app, err) {
  app.innerHTML = `<p class="status error">Failed to load events. Please try again later.</p>`;
  console.error(err);
}

function renderEvents(app, events) {
  const updated = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  if (events.length === 0) {
    app.innerHTML = `<p class="status">No upcoming events found.</p>`;
    return;
  }

  app.innerHTML = `
    <p class="last-updated">Last updated: ${updated}</p>
    <ul class="event-list">
      ${events.map(renderCard).join('')}
    </ul>
  `;
}

export function init() {
  const app = document.getElementById('app');
  renderLoading(app);
  fetchEvents()
    .then(events => renderEvents(app, events))
    .catch(err => renderError(app, err));
}

if (typeof document !== 'undefined') {
  init();
}
