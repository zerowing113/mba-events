import { test } from 'node:test';
import assert from 'node:assert/strict';
import { googleCalendarUrl, toIcs } from '../calendar.js';

const EVENT = {
  title: 'Virtual Info Session',
  school: 'Harvard Business School',
  date: '5/15/2026',
  time: '18:00',
  timezone: 'America/New_York',
  format: 'Virtual',
  description: 'An overview of the HBS MBA program.',
  location: 'Online',
  registrationUrl: 'https://hbs.edu/events',
};

test('googleCalendarUrl dates param has correct start and 1-hour end', () => {
  const url = googleCalendarUrl(EVENT);
  const dates = new URL(url).searchParams.get('dates');
  assert.equal(dates, '20260515T180000/20260515T190000');
});

test('googleCalendarUrl ctz param contains the event timezone', () => {
  const url = googleCalendarUrl(EVENT);
  assert.equal(new URL(url).searchParams.get('ctz'), 'America/New_York');
});

test('googleCalendarUrl includes location and details with registration URL', () => {
  const url = googleCalendarUrl(EVENT);
  const params = new URL(url).searchParams;
  assert.equal(params.get('location'), 'Online');
  assert.ok(params.get('details').includes('https://hbs.edu/events'));
});

test('toIcs contains VCALENDAR and VEVENT wrappers', () => {
  const ics = toIcs(EVENT);
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('END:VCALENDAR'));
  assert.ok(ics.includes('BEGIN:VEVENT'));
  assert.ok(ics.includes('END:VEVENT'));
});

test('toIcs DTSTART contains correct timezone and datetime', () => {
  const ics = toIcs(EVENT);
  assert.ok(ics.includes('DTSTART;TZID=America/New_York:20260515T180000'));
});

test('toIcs DTEND is 1 hour after start', () => {
  const ics = toIcs(EVENT);
  assert.ok(ics.includes('DTEND;TZID=America/New_York:20260515T190000'));
});

test('googleCalendarUrl starts with Google Calendar base and includes title', () => {
  const url = googleCalendarUrl(EVENT);
  assert.ok(url.startsWith('https://calendar.google.com/calendar/render?'));
  const params = new URL(url).searchParams;
  assert.equal(params.get('action'), 'TEMPLATE');
  assert.equal(params.get('text'), 'Virtual Info Session');
});
