import { fetchEvents } from './fetcher.js';
import { filterEvents } from './filter.js';
import { googleCalendarUrl, downloadIcs } from './calendar.js';
import { createStore } from './storage.js';

const store = typeof localStorage !== 'undefined' ? createStore(localStorage) : createStore({
  getItem: () => null, setItem: () => {}, removeItem: () => {},
});

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

function eventKey(e) {
  return `${e.school}|${e.date}|${e.title}`;
}

function renderCard(e) {
  const badge = SCHOOL_BADGE[e.school] ?? { abbr: e.school, color: '#555' };
  const past = isPast(e.date);
  const saved = store.isSaved(eventKey(e));
  const registerBtn = e.registrationUrl
    ? `<a class="btn-register" href="${e.registrationUrl}" target="_blank" rel="noopener">Register</a>`
    : '';
  return `
    <li class="event-card${past ? ' past' : ''}${saved ? ' saved' : ''}">
      <div class="event-meta">
        <span class="event-school-badge" style="background:${badge.color}">${badge.abbr}</span>
        <span class="event-school-name">${e.school}</span>
        <span class="event-format tag-${e.format === 'Virtual' ? 'virtual' : 'in-person'}">${e.format}</span>
      </div>
      <h2 class="event-title">${e.title}</h2>
      <p class="event-datetime">${e.date} &middot; ${e.time} <span class="event-tz">${e.timezone}</span></p>
      <p class="event-description">${e.description}</p>
      <div class="event-actions">
        <button class="btn-save${saved ? ' is-saved' : ''}" data-key="${eventKey(e)}" title="${saved ? 'Remove from saved' : 'Save event'}">
          ${saved ? '★' : '☆'}
        </button>
        ${registerBtn}
        <div class="cal-dropdown">
          <button class="btn-cal-toggle" aria-haspopup="true">Add to Calendar ▾</button>
          <ul class="cal-menu" hidden>
            <li><a class="cal-option" href="${googleCalendarUrl(e)}" target="_blank" rel="noopener">Google Calendar</a></li>
            <li><button class="cal-option cal-ics" data-key="${e.school}|${e.date}|${e.title}">Download .ics</button></li>
          </ul>
        </div>
      </div>
    </li>`;
}

const M7_SCHOOLS = Object.keys(SCHOOL_BADGE);

let allEvents = [];
let filterState = { schools: [], format: null, savedOnly: false };

function schoolCounts(events) {
  const counts = {};
  for (const e of events) counts[e.school] = (counts[e.school] ?? 0) + 1;
  return counts;
}

function renderFilters(panel) {
  const counts = schoolCounts(allEvents);
  panel.innerHTML = `
    <div class="filters">
      <div class="filter-group">
        <h3 class="filter-heading">School</h3>
        ${M7_SCHOOLS.map(s => `
          <label class="filter-label">
            <input type="checkbox" class="filter-school" value="${s}" ${filterState.schools.includes(s) ? 'checked' : ''}>
            <span>${s}</span>
            <span class="filter-count">${counts[s] ?? 0}</span>
          </label>`).join('')}
      </div>
      <div class="filter-group">
        <h3 class="filter-heading">Format</h3>
        ${['All', 'Virtual', 'In-Person'].map(f => `
          <label class="filter-label">
            <input type="radio" name="format" value="${f}" ${(f === 'All' && filterState.format === null) || filterState.format === f ? 'checked' : ''}>
            <span>${f}</span>
          </label>`).join('')}
      </div>
      <div class="filter-group">
        <label class="filter-label">
          <input type="checkbox" id="saved-only" ${filterState.savedOnly ? 'checked' : ''}>
          <span>★ Saved only</span>
        </label>
      </div>
    </div>`;

  panel.querySelectorAll('.filter-school').forEach(cb =>
    cb.addEventListener('change', () => {
      filterState.schools = [...panel.querySelectorAll('.filter-school:checked')].map(c => c.value);
      renderEventList(document.getElementById('events-panel'));
    })
  );
  panel.querySelectorAll('input[name="format"]').forEach(radio =>
    radio.addEventListener('change', () => {
      filterState.format = radio.value === 'All' ? null : radio.value;
      renderEventList(document.getElementById('events-panel'));
    })
  );

  panel.querySelector('#saved-only').addEventListener('change', e => {
    filterState.savedOnly = e.target.checked;
    renderEventList(document.getElementById('events-panel'));
  });
}

function renderEventList(panel) {
  let filtered = filterEvents(allEvents, filterState);
  if (filterState.savedOnly) filtered = filtered.filter(e => store.isSaved(eventKey(e)));
  const updated = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  if (filtered.length === 0) {
    panel.innerHTML = `<p class="status">No events match your filters.</p>`;
    return;
  }
  panel.innerHTML = `
    <p class="last-updated">Last updated: ${updated}</p>
    <ul class="event-list">${filtered.map(renderCard).join('')}</ul>`;

  panel.querySelectorAll('.btn-save').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      if (store.isSaved(key)) {
        store.unsave(key);
      } else {
        store.save(key);
      }
      renderFilters(document.getElementById('filters-panel'));
      renderEventList(panel);
    });
  });

  panel.querySelectorAll('.btn-cal-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const menu = btn.nextElementSibling;
      menu.hidden = !menu.hidden;
    });
  });

  panel.querySelectorAll('.cal-ics').forEach(btn => {
    btn.addEventListener('click', () => {
      const [school, date, title] = btn.dataset.key.split('|');
      const event = allEvents.find(e => e.school === school && e.date === date && e.title === title);
      if (event) downloadIcs(event);
      btn.closest('.cal-menu').hidden = true;
    });
  });

}

export function init() {
  const filtersPanel = document.getElementById('filters-panel');
  const eventsPanel  = document.getElementById('events-panel');
  eventsPanel.innerHTML = '<p class="status">Loading events…</p>';

  document.addEventListener('click', e => {
    if (!e.target.closest('.cal-dropdown')) {
      document.querySelectorAll('.cal-menu').forEach(m => { m.hidden = true; });
    }
  });

  fetchEvents()
    .then(events => {
      allEvents = events;
      renderFilters(filtersPanel);
      renderEventList(eventsPanel);
    })
    .catch(err => {
      eventsPanel.innerHTML = `<p class="status error">Failed to load events. Please try again later.</p>`;
      console.error(err);
    });
}

if (typeof document !== 'undefined') {
  init();
}
