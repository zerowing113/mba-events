# PRD: MBA Events Tracker

## Problem Statement

MBA applicants must manually visit each business school's website to discover upcoming information events, campus visits, webinars, and workshops. With applications spanning multiple schools — often 5–8 programs — this means checking dozens of different pages repeatedly, with no unified view of what's coming up, no easy way to register, and no streamlined path to adding events to a personal calendar. Applicants miss events due to this fragmentation, which can hurt their chances of demonstrating interest to admissions teams.

## Solution

A static web app that aggregates upcoming MBA information events across M7 schools into a single, filterable view. Users can browse events sorted by date, filter by school or format (virtual/in-person), register via a direct link to the school's own registration page, and add events to their calendar (Google Calendar or .ics download) with one click. No account required — personal tracking state lives in the browser. The event database is maintained by the curator via Airtable and served via Airtable's read-only public API to a GitHub Pages-hosted frontend.

## User Stories

1. As an MBA applicant, I want to see all upcoming M7 school events in one place, so that I don't have to visit seven different school websites to stay informed.
2. As an MBA applicant, I want events sorted by date ascending, so that I can see what's coming up soonest without manual effort.
3. As an MBA applicant, I want to filter events by school, so that I can focus only on the schools I'm applying to.
4. As an MBA applicant, I want to filter events by format (virtual / in-person), so that I can plan my schedule and travel accordingly.
5. As an MBA applicant, I want to see each event's name, date, time, school, format, and a short description, so that I can quickly decide whether to attend.
6. As an MBA applicant, I want a "Register" button on each event that opens the school's registration page in a new tab, so that I can complete official registration without losing my place in the app.
7. As an MBA applicant, I want to add an event to Google Calendar with one click, so that I get automatic reminders without manual data entry.
8. As an MBA applicant, I want to download an .ics file for an event, so that I can add it to Outlook, Apple Calendar, or any other calendar app.
9. As an MBA applicant, I want the "Add to Calendar" action to pre-fill the event title, date/time, location, school name, and registration URL, so that the calendar invite is immediately useful.
10. As an MBA applicant, I want to mark an event as "saved" or "interested," so that I can quickly find events I'm tracking across multiple visits.
11. As an MBA applicant, I want my saved events to persist across browser sessions, so that I don't lose my tracking when I close the tab.
12. As an MBA applicant, I want to see a badge or indicator on events I've already saved, so that I can distinguish them at a glance.
13. As an MBA applicant, I want to filter to show only my saved events, so that I can review my personal shortlist quickly.
14. As an MBA applicant, I want to see past events clearly distinguished (e.g., greyed out or excluded), so that I'm not confused by events I can no longer attend.
15. As an MBA applicant, I want the app to work on mobile, so that I can check upcoming events on the go.
16. As an MBA applicant, I want to see which school each event belongs to (with school branding or logo), so that I can identify events quickly while scanning the list.
17. As an MBA applicant, I want to see a count of upcoming events per school, so that I can gauge which schools are most active.
18. As an MBA applicant, I want events to load quickly without a login step, so that I can immediately start browsing.
19. As an MBA applicant, I want a visible "last updated" timestamp, so that I know how fresh the event data is.
20. As a curator, I want to add/edit/remove events via an Airtable spreadsheet interface, so that I can maintain the event database without touching code.
21. As a curator, I want the live site to reflect Airtable changes quickly (within a few minutes), so that time-sensitive new events appear promptly.
22. As a curator, I want to record event name, date, time, timezone, school, format, description, location, and registration URL per event, so that the calendar invite and event card are fully populated.
23. As a curator, I want to mark events as published/unpublished in Airtable, so that I can stage upcoming events before making them visible.

## Implementation Decisions

### Modules

**1. Airtable Data Fetcher**
- Fetches the events table from Airtable's REST API using a read-only public API key
- Normalizes raw Airtable records into a consistent event object shape: `{ id, school, title, date, time, timezone, format, description, location, registrationUrl, published }`
- Filters out unpublished records before returning
- Returns events sorted by date ascending

**2. Filter Engine**
- Accepts the full event list plus active filter state (selected schools, selected format)
- Returns a filtered subset without mutating the original list
- Pure function — no side effects, easily testable in isolation

**3. Calendar Export Module**
- **Google Calendar**: Constructs a `https://calendar.google.com/calendar/render?action=TEMPLATE&...` URL from an event object
- **.ics generator**: Produces a valid iCalendar string from an event object and triggers a browser download
- Encodes event title, start/end datetime (assumes 1-hour duration if end time not provided), location, description, and URL

**4. LocalStorage Persistence Module**
- Stores and retrieves the set of saved event IDs
- Exposes `save(id)`, `unsave(id)`, `isSaved(id)`, `getSavedIds()` interface
- Handles JSON serialization and missing/corrupt localStorage gracefully

**5. UI Renderer**
- Renders the event list from a filtered event array
- Renders filter controls (M7 school checkboxes, virtual/in-person radio/buttons)
- Renders each event card: school badge, title, date/time, format tag, description, Register button, Add to Calendar dropdown, Save toggle
- Applies visual distinction to past events
- Re-renders reactively on filter change or save toggle without full page reload

### Architecture

- **No build step** — plain HTML, CSS, and vanilla JavaScript; no npm, no bundler
- **Single-page static site** — one `index.html` with linked `style.css` and `app.js`
- **Airtable as CMS** — events table read via Airtable REST API at page load; results cached in memory for the session
- **GitHub Pages** for hosting — deploy by pushing to the `main` branch
- **localStorage** for all user-specific state — no backend, no cookies, no accounts
- **No server-side rendering** — all rendering happens in the browser after Airtable fetch

### Data Contract (Airtable → App)

Airtable table name: `Events`

| Field | Type | Notes |
|---|---|---|
| Name | Single line text | Event title |
| School | Single select | One of the M7 names |
| Date | Date | YYYY-MM-DD |
| Time | Single line text | HH:MM in local school timezone |
| Timezone | Single line text | e.g. "America/New_York" |
| Format | Single select | "Virtual" or "In-Person" |
| Description | Long text | Short summary for event card |
| Location | Single line text | Physical address or "Online" |
| Registration URL | URL | Direct link to school registration page |
| Published | Checkbox | Only published records appear in app |

## Testing Decisions

**What makes a good test:** Test observable output given a specific input — not internal implementation. For example, test that the Filter Engine returns the correct subset of events given filter state, not that it calls a specific internal method.

**Modules to test:**

- **Filter Engine** — highest priority; pure function with clear inputs/outputs. Test: all filters cleared returns full list; school filter returns only matching schools; format filter returns only matching format; combined filters AND correctly; empty result set handled gracefully.
- **Calendar Export Module** — test that Google Calendar URL contains correctly encoded title, date, and URL params; test that .ics output contains required VCALENDAR/VEVENT fields and correct DTSTART/DTEND values.
- **LocalStorage Persistence Module** — test save/unsave toggle, isSaved returns correct boolean, getSavedIds returns correct set, handles missing localStorage key without throwing.
- **Airtable Data Fetcher** — test normalization logic against a mock API response; test that unpublished records are excluded; test that records are sorted by date ascending.

**UI Renderer** — not unit tested; validate manually in browser across Chrome, Firefox, Safari, and mobile viewport.

## Out of Scope

- User accounts and cross-device sync
- Email or push notifications / reminders (handled by user's calendar app after adding event)
- Automated web scraping of school websites
- Schools outside the M7 (Harvard, Stanford, Wharton, Booth, Kellogg, MIT Sloan, Columbia)
- Event registration automation (the app links to the school's page; it does not submit forms)
- Admin dashboard UI for curation (Airtable UI serves this purpose)
- Search by keyword
- Mobile app (native iOS/Android)
- Analytics or usage tracking
- Multi-language support

## Further Notes

- The Airtable API key embedded in the frontend is read-only and accesses only public event data — no sensitive user data is ever stored server-side, mitigating the risk of embedding the key in a public GitHub repo.
- The "one-off" deployment model means no CI/CD pipeline is needed; the curator updates Airtable and the live site reflects changes on next page load.
- M7 schools: Harvard Business School, Stanford GSB, Wharton (UPenn), Booth (Chicago), Kellogg (Northwestern), MIT Sloan, Columbia Business School.
- Calendar invites should default to 1-hour duration when an end time is not specified in Airtable.
- Timezone handling is important — school events are in local school timezones (EST/CST/PST); the .ics and Google Calendar URL must encode timezone correctly to avoid showing wrong times for users in different regions.
