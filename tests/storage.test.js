import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../storage.js';

function mockStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: k => data[k] ?? null,
    setItem: (k, v) => { data[k] = v; },
    removeItem: k => { delete data[k]; },
  };
}

test('isSaved returns false for an unsaved key', () => {
  const store = createStore(mockStorage());
  assert.equal(store.isSaved('hbs|5/15/2026|Info Session'), false);
});

test('save makes isSaved return true', () => {
  const store = createStore(mockStorage());
  store.save('hbs|5/15/2026|Info Session');
  assert.equal(store.isSaved('hbs|5/15/2026|Info Session'), true);
});

test('unsave makes isSaved return false after saving', () => {
  const store = createStore(mockStorage());
  store.save('hbs|5/15/2026|Info Session');
  store.unsave('hbs|5/15/2026|Info Session');
  assert.equal(store.isSaved('hbs|5/15/2026|Info Session'), false);
});

test('getSavedKeys returns all saved keys', () => {
  const store = createStore(mockStorage());
  store.save('key-a');
  store.save('key-b');
  const keys = store.getSavedKeys();
  assert.ok(keys.includes('key-a'));
  assert.ok(keys.includes('key-b'));
  assert.equal(keys.length, 2);
});

test('handles corrupt JSON in storage without throwing', () => {
  const store = createStore(mockStorage({ 'mba-events-saved': 'NOT_JSON{{' }));
  assert.doesNotThrow(() => store.isSaved('anything'));
  assert.doesNotThrow(() => store.getSavedKeys());
});

test('handles missing storage key without throwing', () => {
  const store = createStore(mockStorage());
  assert.doesNotThrow(() => store.isSaved('missing'));
  assert.deepEqual(store.getSavedKeys(), []);
});
