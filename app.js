import { fetchEvents } from './fetcher.js';

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
      ${events.map(e => `
        <li class="event-card">
          <div class="event-meta">
            <span class="event-school">${e.school}</span>
            <span class="event-format ${e.format === 'Virtual' ? 'virtual' : 'in-person'}">${e.format}</span>
          </div>
          <h2 class="event-title">${e.title}</h2>
          <p class="event-datetime">${e.date} at ${e.time} (${e.timezone})</p>
          <p class="event-description">${e.description}</p>
        </li>
      `).join('')}
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
