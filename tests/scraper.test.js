import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scraper = () => readFileSync('scraper.html', 'utf8');
const index   = () => readFileSync('index.html', 'utf8');

test('scraper.html has correct title', () => {
  assert.match(scraper(), /MBA Events Tracker/);
});

test('scraper.html has a password input for the API key', () => {
  assert.match(scraper(), /type=["']password["']/);
});

test('scraper.html links style.css', () => {
  assert.match(scraper(), /href=["']style\.css["']/);
});

test('index.html links to scraper.html', () => {
  assert.match(index(), /href=["']scraper\.html["']/);
});

test('scraper.html has a scrape button', () => {
  assert.match(scraper(), /id=["']scrape-btn["']/);
});

test('scraper.js loads without throwing', async () => {
  await assert.doesNotReject(import('../scraper.js'));
});

test('M7_SCHOOLS has exactly 7 entries each with a name and https URL', async () => {
  const { M7_SCHOOLS } = await import('../scraper.js');
  assert.equal(M7_SCHOOLS.length, 7);
  for (const s of M7_SCHOOLS) {
    assert.ok(s.name.length > 0, `missing name: ${JSON.stringify(s)}`);
    assert.ok(s.url.startsWith('https://'), `invalid URL for ${s.name}: ${s.url}`);
  }
});

test('aggregateResults flattens events from all schools into allEvents', async () => {
  const { aggregateResults } = await import('../scraper.js');
  const results = [
    { school: 'Harvard Business School', events: [{ title: 'A' }, { title: 'B' }], error: null },
    { school: 'Stanford GSB',            events: [{ title: 'C' }],                 error: null },
  ];
  const { allEvents } = aggregateResults(results);
  assert.equal(allEvents.length, 3);
  assert.deepEqual(allEvents.map(e => e.title), ['A', 'B', 'C']);
});

test('aggregateResults flags schools with errors or zero events', async () => {
  const { aggregateResults } = await import('../scraper.js');
  const results = [
    { school: 'Harvard Business School', events: [{ title: 'A' }], error: null },
    { school: 'Stanford GSB',            events: [],                error: null },
    { school: 'Wharton',                 events: [],                error: 'timeout' },
  ];
  const { summary } = aggregateResults(results);
  assert.equal(summary[0].flagged, false);
  assert.equal(summary[1].flagged, true);
  assert.equal(summary[2].flagged, true);
  assert.equal(summary[2].error, 'timeout');
});
