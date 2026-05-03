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
