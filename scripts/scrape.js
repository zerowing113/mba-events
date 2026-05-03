/**
 * Local scraper — runs headless Chrome on your PC to bypass WAF/bot detection.
 *
 * Usage:
 *   npm run scrape                        # merge new events into events.csv
 *   npm run scrape -- --fresh             # overwrite events.csv entirely
 *   npm run scrape -- --school=Booth      # scrape one school only
 *   npm run scrape -- --model=gemini-2.0-flash-lite
 *
 * API key: set GEMINI_KEY env var, or put it in gemini_api_key.md (gitignored).
 */

import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { extractEvents } from '../gemini.js';
import { eventsToCSV, mergeEvents } from '../csvexport.js';
import { parseEvents } from '../fetcher.js';

const SCHOOLS = [
  { name: 'Harvard Business School',  url: 'https://www.hbs.edu/mba/admissions/events' },
  { name: 'Stanford GSB',             url: 'https://www.gsb.stanford.edu/programs/mba/admissions/events' },
  { name: 'Wharton',                  url: 'https://mba.wharton.upenn.edu/mba-admissions/events/' },
  { name: 'Booth',                    url: 'https://www.chicagobooth.edu/mba/full-time/admissions/events' },
  { name: 'Kellogg',                  url: 'https://admissions.kellogg.northwestern.edu/portal/admissions-events' },
  { name: 'MIT Sloan',                url: 'https://mitsloan.mit.edu/mba/admissions/events' },
  { name: 'Columbia Business School', url: 'https://home.gsb.columbia.edu/mba/admissions/events' },
];

function getApiKey() {
  if (process.env.GEMINI_KEY) return process.env.GEMINI_KEY;
  try { return readFileSync('gemini_api_key.md', 'utf8').trim(); } catch {}
  console.error('No API key. Set GEMINI_KEY env var or create gemini_api_key.md');
  process.exit(1);
}

function getArg(name) {
  const a = process.argv.find(a => a.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : null;
}

async function extractPageText(page) {
  return page.evaluate(() => {
    ['script', 'style', 'nav', 'footer', 'header', 'svg', 'noscript', 'iframe']
      .forEach(tag => document.querySelectorAll(tag).forEach(el => el.remove()));
    const container =
      document.querySelector('[class*="event" i], [id*="event" i], main, article') ??
      document.body;
    return (container.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 12000);
  });
}

const apiKey   = getApiKey();
const model    = getArg('model') ?? process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
const fresh    = process.argv.includes('--fresh');
const only     = getArg('school');
const toScrape = only
  ? SCHOOLS.filter(s => s.name.toLowerCase().includes(only.toLowerCase()))
  : SCHOOLS;

if (toScrape.length === 0) {
  console.error(`No school matched "${only}". Names: ${SCHOOLS.map(s => s.name).join(', ')}`);
  process.exit(1);
}

console.log(`Model : ${model}`);
console.log(`Mode  : ${fresh ? 'fresh (overwrite events.csv)' : 'merge with existing events.csv'}`);
console.log(`Schools: ${toScrape.map(s => s.name).join(', ')}\n`);

const browser = await chromium.launch();
const results = [];

for (const school of toScrape) {
  process.stdout.write(`Scraping ${school.name}… `);
  const page = await browser.newPage();
  try {
    await page.goto(school.url, { waitUntil: 'networkidle', timeout: 30000 });
    const text = await extractPageText(page);
    if (!text) throw new Error('Page rendered empty — check URL');

    const events = await extractEvents(apiKey, text, model);
    results.push({ school: school.name, events, error: null });
    console.log(`${events.length} event${events.length !== 1 ? 's' : ''} found`);
  } catch (err) {
    results.push({ school: school.name, events: [], error: err.message });
    console.log(`FAILED — ${err.message.slice(0, 100)}`);
    if (err.message.includes('API key')) { await browser.close(); process.exit(1); }
  } finally {
    await page.close();
  }
}

await browser.close();

const allNew   = results.flatMap(r => r.events);
const existing = (!fresh && existsSync('events.csv'))
  ? parseEvents(readFileSync('events.csv', 'utf8'))
  : [];
const final = fresh ? allNew : mergeEvents(existing, allNew);

writeFileSync('events.csv', eventsToCSV(final), 'utf8');

console.log(`\nDone — wrote ${final.length} event${final.length !== 1 ? 's' : ''} to events.csv`);
console.log('  School summary:');
results.forEach(r => {
  const note = r.error ? `ERROR: ${r.error.slice(0, 60)}` : `${r.events.length} events`;
  console.log(`    ${r.school}: ${note}`);
});
console.log('\nNext: git add events.csv && git commit -m "chore: refresh events" && git push');
