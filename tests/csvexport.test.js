import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventsToCSV, mergeEvents } from '../csvexport.js';

const SAMPLE = {
  title: 'Info Session', school: 'Harvard Business School', date: '5/15/2026',
  time: '18:00', timezone: 'America/New_York', format: 'Virtual',
  description: 'Overview of HBS MBA program', location: 'Online',
  registrationUrl: 'https://hbs.edu/events',
};

test('eventsToCSV emits the correct CSV header row', () => {
  const csv = eventsToCSV([]);
  const header = csv.split('\n')[0];
  assert.equal(header, 'Name,School,Date,Time,Timezone,Format,Description,Location,Registration URL');
});

test('eventsToCSV maps all event fields including title→Name and registrationUrl→Registration URL', () => {
  const csv = eventsToCSV([SAMPLE]);
  const row = csv.split('\n')[1];
  assert.equal(row, 'Info Session,Harvard Business School,5/15/2026,18:00,America/New_York,Virtual,Overview of HBS MBA program,Online,https://hbs.edu/events');
});

test('eventsToCSV wraps fields containing commas in double quotes', () => {
  const event = { ...SAMPLE, description: 'Classes, tours, and Q&A', location: '655 Knight Way, Stanford, CA' };
  const csv = eventsToCSV([event]);
  const row = csv.split('\n')[1];
  assert.ok(row.includes('"Classes, tours, and Q&A"'));
  assert.ok(row.includes('"655 Knight Way, Stanford, CA"'));
});

test('mergeEvents preserves all existing events', () => {
  const existing = [SAMPLE, { ...SAMPLE, title: 'Campus Visit', date: '6/1/2026' }];
  const merged = mergeEvents(existing, []);
  assert.equal(merged.length, 2);
  assert.deepEqual(merged, existing);
});

test('mergeEvents skips scraped events that duplicate an existing one by school+date+title', () => {
  const existing = [SAMPLE];
  const duplicate = { ...SAMPLE, description: 'Different description but same key' };
  const merged = mergeEvents(existing, [duplicate]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].description, SAMPLE.description);
});

test('mergeEvents appends scraped events that are genuinely new', () => {
  const existing = [SAMPLE];
  const newEvent = { ...SAMPLE, title: 'Campus Visit', date: '6/10/2026' };
  const merged = mergeEvents(existing, [newEvent]);
  assert.equal(merged.length, 2);
  assert.equal(merged[1].title, 'Campus Visit');
});
