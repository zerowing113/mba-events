import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = () => readFileSync('index.html', 'utf8');

test('index.html has title "MBA Events Tracker"', () => {
  assert.match(html(), /MBA Events Tracker/);
});

test('index.html has h1 with "MBA Events Tracker"', () => {
  assert.match(html(), /<h1[^>]*>.*MBA Events Tracker.*<\/h1>/s);
});

test('index.html links style.css', () => {
  assert.match(html(), /href=["']style\.css["']/);
});

test('index.html links app.js as a module', () => {
  assert.match(html(), /src=["']app\.js["'][^>]*type=["']module["']|type=["']module["'][^>]*src=["']app\.js["']/);
});

test('app.js loads without throwing', async () => {
  await assert.doesNotReject(import('../app.js'));
});
