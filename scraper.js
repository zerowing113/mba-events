const KEY_STORAGE = 'gemini-api-key';

export function init() {
  const input = document.getElementById('api-key');
  const saved = localStorage.getItem(KEY_STORAGE);
  if (saved) input.value = saved;
  input.addEventListener('input', () => localStorage.setItem(KEY_STORAGE, input.value.trim()));
}

if (typeof document !== 'undefined') {
  init();
}
