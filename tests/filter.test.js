import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterEvents } from '../filter.js';

const EVENTS = [
  { title: 'HBS Info Session',   school: 'Harvard Business School', format: 'Virtual' },
  { title: 'GSB Campus Visit',   school: 'Stanford GSB',            format: 'In-Person' },
  { title: 'Wharton Webinar',    school: 'Wharton',                 format: 'Virtual' },
  { title: 'Kellogg Open House', school: 'Kellogg',                 format: 'In-Person' },
];

test('empty filters return the full event list unchanged', () => {
  assert.deepEqual(filterEvents(EVENTS, {}), EVENTS);
});

test('school filter returns only events matching selected schools', () => {
  const result = filterEvents(EVENTS, { schools: ['Harvard Business School', 'Wharton'] });
  assert.equal(result.length, 2);
  assert.ok(result.every(e => ['Harvard Business School', 'Wharton'].includes(e.school)));
});

test('format filter returns only events matching selected format', () => {
  const result = filterEvents(EVENTS, { format: 'Virtual' });
  assert.equal(result.length, 2);
  assert.ok(result.every(e => e.format === 'Virtual'));
});

test('combined school and format filters apply AND logic', () => {
  const result = filterEvents(EVENTS, { schools: ['Harvard Business School', 'Stanford GSB'], format: 'Virtual' });
  assert.equal(result.length, 1);
  assert.equal(result[0].school, 'Harvard Business School');
});

test('no matches returns empty array without throwing', () => {
  const result = filterEvents(EVENTS, { schools: ['MIT Sloan'] });
  assert.deepEqual(result, []);
});
