# PRD: MBA Events Tracker

## Problem Statement

MBA applicants must manually visit each business school's website to discover upcoming information events, campus visits, webinars, and workshops. With applications spanning multiple schools — often 5–8 programs — this means checking dozens of different pages repeatedly, with no unified view of what's coming up, no easy way to register, and no streamlined path to adding events to a personal calendar. Applicants miss events due to this fragmentation, which can hurt their chances of demonstrating interest to admissions teams.

## Solution

A static web app that aggregates upcoming MBA information events across M7 schools into a single, filterable view. Users can browse events sorted by date, filter by school or format (virtual/in-person), register via a direct link to the school's own registration page, and add events to their calendar (Google Calendar or .ics download) with one click. No account required — personal tracking state lives in the browser.

Event data is stored in a static `events.csv` file in the repository. The curator refreshes it by running a local Playwright-based scraper that headlessly renders each school's events page, strips noise, and uses the Gemini API to extract structured event data. A browser-based fallback scraper (`scraper.html`) is available for end users who want to run their own extraction.

## User Stories

### Applicant — Browsing & Discovery
1. As an MBA applicant, I want to see all upcoming M7 school events in one place, so that I don't have to visit seven different school websites to stay informed.
2. As an MBA applicant, I want events sorted by date ascending, so that I can see what's coming up soonest without manual effort.
3. As an MBA applicant, I want to filter events by school, so that I can focus only on the schools I'm applying to.
4. As an MBA applicant, I want to filter events by format (virtual / in-person), so that I can plan my schedule and travel accordingly.
5. As an MBA applicant, I want to see each event's name, date, time, school, format, and a short description, so that I can quickly decide whether to attend.
6. As an MBA applicant, I want past events to appear greyed out, so that I'm not confused by events I can no longer attend.
7. As an MBA applicant, I want the app to work on mobile, so that I can check upcoming events on the go.
8. As an MBA applicant, I want events to load instantly without a login step, so that I can immediately start browsing.

### Applicant — Registration & Calendar
9. As an MBA applicant, I want a "Register" button on each event that opens the school's registration page in a new tab, so that I can complete official registration without losing my place in the app.
10. As an MBA applicant, I want to add an event to Google Calendar with one click, so that I get automatic reminders without manual data entry.
11. As an MBA applicant, I want to download an .ics file for an event, so that I can add it to Outlook, Apple Calendar, or any other calendar app.
12. As an MBA applicant, I want the calendar invite to pre-fill the event title, date/time, timezone, location, and registration URL, so that the invite is immediately useful.

### Applicant — Saving & Tracking
13. As an MBA applicant, I want to mark an event as "saved", so that I can quickly find events I'm tracking across multiple visits.
14. As an MBA applicant, I want my saved events to persist across browser sessions, so that I don't lose my list when I close the tab.
15. As an MBA applicant, I want to filter to show only my saved events, so that I can review my personal shortlist quickly.

### Curator — Data Maintenance
16. As a curator, I want to refresh the event database by running a single command on my PC, so that I can update all schools without manually editing CSV files.
17. As a curator, I want the scraper to use a real browser (Playwright) so that school websites protected by Cloudflare or JavaScript rendering are handled correctly.
18. As a curator, I want to scrape a single school at a time for testing, so that I can validate the scraper without consuming unnecessary API quota.
19. As a curator, I want to choose which Gemini model to use, so that I can switch to a fresh quota bucket when a model's daily limit is exhausted.
20. As a curator, I want to merge newly scraped events with the existing CSV, so that manually curated or previously scraped events are preserved unless replaced by a duplicate.
21. As a curator, I want duplicate events (same school + date + title) to be deduplicated on merge with the existing record winning, so that manual corrections in the CSV survive re-scrapes.

### Browser Scraper (End User)
22. As an end user, I want to enter my own Gemini API key and scrape M7 events from my browser, so that I can get fresh data without relying on the curator to update the CSV.
23. As an end user, I want to select which schools to scrape, so that I can limit API usage to the schools I care about.
24. As an end user, I want to review and edit extracted events in a table before exporting, so that I can correct extraction errors.
25. As an end user, I want to download a fresh CSV or merge with the live events.csv, so that I have export options for different use cases.
26. As an end user, I want to test my API key before starting a full scrape, so that I don't waste time on a run that will fail.

## Implementation Decisions

### Modules

**1. CSV Data Fetcher (`fetcher.js`)**
- Fetches `events.csv` from the same origin at page load
- Parses CSV into a consistent event shape: `{ title, school, date, time, timezone, format, description, location, registrationUrl }`
- Returns events sorted by date ascending
- Known limitation: descriptions must not contain commas (naive comma-split parser)

**2. Filter Engine (`filter.js`)**
- Pure function `filterEvents(events, { schools, format, savedOnly })` — no side effects
- Returns a filtered subset without mutating the original list

**3. Calendar Export (`calendar.js`)**
- `googleCalendarUrl(event)` — constructs Google Calendar pre-fill URL
- `toIcs(event)` — generates iCalendar string with `DTSTART;TZID=` for correct timezone encoding
- `downloadIcs(event)` — browser-only Blob download trigger
- Defaults to 1-hour duration when end time is not provided

**4. Storage (`storage.js`)**
- `createStore(storage = localStorage)` — dependency injection for testability in Node
- Exposes `isSaved(key)`, `save(key)`, `unsave(key)`, `getSavedKeys()`
- Handles missing and corrupt JSON gracefully

**5. Gemini Module (`gemini.js`)**
- `extractEvents(apiKey, text, model)` — sends page text to Gemini, parses JSON response
- `extractEventsFromUrl(apiKey, url, model)` — uses Gemini `url_context` tool (browser scraper)
- `testApiKey(apiKey, model)` — cheap validation call before full scrape
- `DEFAULT_MODEL = 'gemini-2.0-flash'`; all functions accept a `model` param
- Shared `geminiError(status)` maps 401 → "invalid key", 429 → "rate limit" with actionable messages

**6. CSV Export (`csvexport.js`)**
- `eventsToCSV(events)` — serialises event array to CSV with correct column order and comma-quoting
- `mergeEvents(existing, scraped)` — deduplicates by `school|date|title`, existing record wins
- `downloadCSV(filename, csvText)` — browser-only Blob download

**7. Scraper UI (`scraper.js` + `scraper.html`)**
- Renders school checkboxes from `M7_SCHOOLS` with Select all / Deselect all
- Model dropdown (gemini-2.0-flash, gemini-2.0-flash-lite, gemini-2.5-flash-preview, gemini-3-flash-preview) — each model has its own daily free quota
- Sequentially scrapes selected schools with a 5s inter-request delay and 20s auto-retry on 429
- Shows extracted events in an editable table; each row deletable before export
- "Download fresh events.csv" and "Merge with existing events.csv" export buttons

**8. Local Playwright Scraper (`scripts/scrape.js`)**
- Runs headless Chromium on the curator's PC — bypasses Cloudflare, AWS WAF, JS rendering
- Extracts `document.body.innerText` after removing noise elements; per-school post-load wait for AJAX-populated pages
- Calls `extractEvents` (cheap text call ~2k tokens vs ~100k for url_context)
- Merges with existing `events.csv` by default; `--fresh` flag overwrites
- `--school=<name>` for single-school testing; `--model=<name>` to override model

### Architecture

- **No build step** — plain HTML, CSS, and ES modules; no bundler
- **Static site on GitHub Pages** — `events.csv` in repo is the data source; update by committing a new CSV
- **localStorage** for all user-specific state — no backend, no accounts
- **Node.js `node:test` runner** — `npm test` runs all tests; no test framework dependency
- **Playwright** as a dev-only dependency for the local scraper

### Scraper Token Economics

| Approach | Tokens/school | Daily free runs (1500 RPD) |
|---|---|---|
| `url_context` (old) | ~100k | ~2 full runs |
| Playwright + `extractEvents` | ~2k | ~100 full runs |

### School Accessibility (as of May 2026)

| School | Status | URL |
|---|---|---|
| Harvard Business School | ✅ Accessible | `/mba/admissions/events` (needs 3s post-load wait) |
| Wharton | ✅ Accessible | `mba.wharton.upenn.edu/mba-admissions/events/` |
| Booth | ✅ Accessible | `chicagobooth.edu/mba/full-time/admissions/events` |
| Kellogg | ✅ Accessible | `admissions.kellogg.northwestern.edu/portal/admissions-events` (needs 4s wait) |
| Stanford GSB | ❌ Blocked | Varnish CDN returns 403 even for real Chrome |
| MIT Sloan | ❌ No events URL | Events page returns 404; general events page requires JS filter interaction |
| Columbia | ❌ Timeout | `www8.gsb.columbia.edu` consistently times out |

## Testing Decisions

**What makes a good test:** Test observable output through public interfaces only — not internal implementation. Tests must survive refactors of internals without changing.

**Modules tested (53 tests):**
- `filter.js` — school filter, format filter, combined AND logic, empty results
- `calendar.js` — Google Calendar URL params, .ics DTSTART/DTEND encoding, 1-hour default duration
- `fetcher.js` — CSV parse, field mapping, date sorting, empty CSV, missing fields
- `gemini.js` — proxy routing, HTTP error handling, JSON parse, 401/429 error messages, `url_context` tool format, `testApiKey` validates and surfaces rate limit errors
- `csvexport.js` — CSV header order, field mapping (title→Name, registrationUrl→Registration URL), comma-quoting, merge dedup logic
- `scraper.js` — M7_SCHOOLS structure, `aggregateResults` flattening and flagging
- `storage.js` — save/unsave/isSaved/getSavedKeys, corrupt storage gracefully handled

**Not unit tested:** `app.js` UI renderer, `scripts/scrape.js` (Playwright), `downloadIcs`/`downloadCSV` (browser-only) — validated manually.

## Out of Scope

- User accounts and cross-device sync
- Email or push notifications
- Schools outside M7
- Event registration automation
- Admin dashboard UI
- Search by keyword
- Mobile app (native iOS/Android)
- Analytics or usage tracking
- Multi-language support
- Automated scheduling of scrape runs (curator runs `npm run scrape` manually)

## Further Notes

- Gemini free tier quotas are **per-model per-day**. When `gemini-2.0-flash` is exhausted, switch to `gemini-2.0-flash-lite` or `gemini-2.5-flash-preview` for a fresh bucket.
- `events.csv` is intentionally committed to the repo — it serves as both the data source for the live site and a human-readable audit log of what events have been tracked.
- The `gemini_api_key.md` file is gitignored; never commit API keys to the repo.
- M7 = Harvard Business School, Stanford GSB, Wharton (UPenn), Booth (Chicago), Kellogg (Northwestern), MIT Sloan, Columbia Business School.
