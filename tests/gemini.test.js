import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchViaProxy, extractEvents, extractEventsFromUrl, testApiKey } from '../gemini.js';

let originalFetch;

beforeEach(() => { originalFetch = globalThis.fetch; });
afterEach(()  => { globalThis.fetch = originalFetch; });

function mockFetch({ body, status = 200 }) {
  globalThis.fetch = async (url, opts) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
    _url: url,
    _opts: opts,
  });
}

test('fetchViaProxy routes through corsproxy.io with encoded URL', async () => {
  let capturedUrl;
  globalThis.fetch = async (url) => { capturedUrl = url; return { ok: true, text: async () => '<html/>' }; };
  await fetchViaProxy('https://hbs.edu/events');
  assert.ok(capturedUrl.startsWith('https://corsproxy.io/?'));
  assert.ok(capturedUrl.includes(encodeURIComponent('https://hbs.edu/events')));
});

test('fetchViaProxy throws on HTTP error', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  await assert.rejects(() => fetchViaProxy('https://hbs.edu/events'), /503/);
});

const GEMINI_RESPONSE = JSON.stringify({
  candidates: [{
    content: { parts: [{ text: JSON.stringify([
      { title: 'Info Session', school: 'Harvard Business School', date: '5/15/2026',
        time: '18:00', timezone: 'America/New_York', format: 'Virtual',
        description: 'Overview of HBS MBA program.', location: 'Online',
        registrationUrl: 'https://hbs.edu/events' }
    ]) }] }
  }]
});

test('extractEvents returns parsed event array from valid Gemini response', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(GEMINI_RESPONSE) });
  const events = await extractEvents('fake-key', '<html>some events page</html>');
  assert.equal(events.length, 1);
  assert.equal(events[0].title, 'Info Session');
  assert.equal(events[0].school, 'Harvard Business School');
});

test('extractEvents returns empty array when Gemini returns non-JSON text', async () => {
  const badResponse = JSON.stringify({
    candidates: [{ content: { parts: [{ text: 'Sorry, I could not find any events.' }] } }]
  });
  globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(badResponse) });
  const events = await extractEvents('fake-key', '<html/>');
  assert.deepEqual(events, []);
});

test('extractEvents throws clear message on 401 bad API key', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 401 });
  await assert.rejects(
    () => extractEvents('bad-key', '<html/>'),
    /API key/
  );
});

test('extractEventsFromUrl sends url_context tool and URL in request body', async () => {
  let capturedBody;
  globalThis.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return { ok: true, json: async () => JSON.parse(GEMINI_RESPONSE) };
  };
  await extractEventsFromUrl('fake-key', 'https://hbs.edu/events');
  assert.ok(capturedBody.tools?.some(t => 'url_context' in t), 'url_context tool missing');
  assert.ok(capturedBody.contents[0].parts[0].text.includes('https://hbs.edu/events'), 'URL not in prompt');
});

test('extractEventsFromUrl returns parsed events from valid Gemini response', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(GEMINI_RESPONSE) });
  const events = await extractEventsFromUrl('fake-key', 'https://hbs.edu/events');
  assert.equal(events.length, 1);
  assert.equal(events[0].title, 'Info Session');
});

test('extractEventsFromUrl throws clear message on 401 bad API key', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 401 });
  await assert.rejects(
    () => extractEventsFromUrl('bad-key', 'https://hbs.edu/events'),
    /API key/
  );
});

const OK_RESPONSE = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] });

test('testApiKey resolves without throwing when Gemini returns 200', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(OK_RESPONSE) });
  await assert.doesNotReject(() => testApiKey('valid-key'));
});

test('testApiKey throws clear message on 401', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 401 });
  await assert.rejects(() => testApiKey('bad-key'), /API key/);
});

test('testApiKey throws rate limit message on 429', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 429 });
  await assert.rejects(() => testApiKey('valid-key'), /rate limit/i);
});
