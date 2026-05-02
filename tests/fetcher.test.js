import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEvents } from '../fetcher.js';

const CSV_HEADER = 'Name,School,Date,Time,Timezone,Format,Description,Location,Registration URL';
const SAMPLE_ROW = 'Virtual Info Session,Harvard Business School,5/15/2026,18:00,America/New_York,Virtual,An overview of the HBS MBA program.,Online,https://hbs.edu/events';

const ROW_JUNE = 'Campus Open House,Kellogg,6/10/2026,10:00,America/Chicago,In-Person,Open house.,2211 Campus Drive,https://kellogg.edu/events';
const ROW_MAY = 'Virtual Info Session,Harvard Business School,5/15/2026,18:00,America/New_York,Virtual,Info session.,Online,https://hbs.edu/events';

test('returns events sorted by date ascending', () => {
  const events = parseEvents(`${CSV_HEADER}\n${ROW_JUNE}\n${ROW_MAY}`);
  assert.equal(events[0].date, '5/15/2026');
  assert.equal(events[1].date, '6/10/2026');
});

test('handles missing optional fields without throwing', () => {
  const rowNoLocationOrUrl = 'Evening Info Session,Booth,6/3/2026,18:30,America/Chicago,Virtual,Info session.,,';
  const events = parseEvents(`${CSV_HEADER}\n${rowNoLocationOrUrl}`);
  assert.equal(events.length, 1);
  assert.equal(events[0].location, '');
  assert.equal(events[0].registrationUrl, '');
});

test('returns empty array when CSV has header only', () => {
  const events = parseEvents(CSV_HEADER);
  assert.deepEqual(events, []);
});

test('parses a single row into a correctly shaped event object', () => {
  const events = parseEvents(`${CSV_HEADER}\n${SAMPLE_ROW}`);
  assert.equal(events.length, 1);
  const event = events[0];
  assert.equal(event.title, 'Virtual Info Session');
  assert.equal(event.school, 'Harvard Business School');
  assert.equal(event.date, '5/15/2026');
  assert.equal(event.time, '18:00');
  assert.equal(event.timezone, 'America/New_York');
  assert.equal(event.format, 'Virtual');
  assert.equal(event.description, 'An overview of the HBS MBA program.');
  assert.equal(event.location, 'Online');
  assert.equal(event.registrationUrl, 'https://hbs.edu/events');
});
