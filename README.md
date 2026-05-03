# MBA Events Tracker

A static web app that aggregates upcoming MBA information events across M7 schools into a single, filterable view.

**Live site:** https://zerowing113.github.io/mba-events/

## For Applicants

Browse all upcoming M7 events in one place — no account required.

- Filter by school or format (virtual / in-person)
- Save events to a personal shortlist (persists across sessions)
- Register via direct link to the school's registration page
- Add to Google Calendar or download an .ics file with one click

Past events appear greyed out. All state lives in your browser's localStorage.

## For Curators — Refreshing Event Data

Event data lives in `events.csv` in this repo. To update it:

### Prerequisites

```bash
npm install          # installs Playwright
npx playwright install chromium
```

Set your Gemini API key (get a free one at https://aistudio.google.com/apikey):

```bash
# Option A: environment variable
export GEMINI_KEY=AIza...

# Option B: create gemini_api_key.md (gitignored)
echo "AIza..." > gemini_api_key.md
```

### Run the scraper

```bash
npm run scrape                               # merge new events into events.csv
npm run scrape -- --fresh                    # overwrite events.csv entirely
npm run scrape -- --school=Booth             # scrape one school for testing
npm run scrape -- --model=gemini-2.0-flash-lite  # use a different model/quota bucket
```

The scraper runs headless Chromium on your machine, which bypasses Cloudflare and JavaScript-rendered pages that block server-side proxies.

### Publish the update

```bash
git add events.csv
git commit -m "chore: refresh events"
git push
```

GitHub Pages serves the updated CSV automatically within ~30 seconds.

### Model quota

Each Gemini model has its own free daily quota (~1500 requests/day). If you hit the limit on one model, switch to another:

| Model | Flag |
|---|---|
| gemini-2.0-flash (default) | _(none)_ |
| gemini-2.0-flash-lite | `--model=gemini-2.0-flash-lite` |
| gemini-2.5-flash-preview | `--model=gemini-2.5-flash-preview-04-17` |
| gemini-3-flash-preview | `--model=gemini-3-flash-preview` |

### School status

| School | Scraper status |
|---|---|
| Harvard Business School | Accessible (3s AJAX wait) |
| Wharton | Accessible |
| Booth | Accessible |
| Kellogg | Accessible (4s AJAX wait) |
| Stanford GSB | Blocked — Varnish CDN returns 403 |
| MIT Sloan | No dedicated events URL |
| Columbia Business School | Consistently times out |

## Browser Scraper

`scraper.html` lets any user run their own extraction without installing anything:

1. Open https://zerowing113.github.io/mba-events/scraper.html
2. Enter your free Gemini API key
3. Select schools and click **Scrape Selected Schools**
4. Review and edit the extracted events table
5. Download a fresh CSV or merge with the live `events.csv`

Note: the browser scraper uses Gemini's `url_context` tool (~100k tokens/school). For frequent refreshes, the local Playwright scraper is ~50x more token-efficient.

## Development

```bash
npm test    # runs 53 unit tests via node:test (no framework)
```

No build step — plain HTML, CSS, and ES modules. Open `index.html` directly in a browser or serve with any static file server.

## Tech Stack

- Plain HTML / CSS / ES modules — no bundler, no framework
- GitHub Pages for hosting
- `events.csv` committed to the repo as the data source
- Gemini API for AI-powered event extraction
- Playwright (dev-only) for local headless scraping
- Node.js `node:test` for unit tests
