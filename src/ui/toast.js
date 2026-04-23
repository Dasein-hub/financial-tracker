let toastEl = null;
let timer = 0;

function ensureEl() {
  if (toastEl) return toastEl;
  toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('aria-live', 'polite');
  toastEl.hidden = true;
  document.body.appendChild(toastEl);
  return toastEl;
}

export function toast(msg, kind = 'info') {
  const el = ensureEl();
  const color =
    kind === 'ok' ? 'var(--ok)' :
    kind === 'err' ? 'var(--danger)' :
    'var(--primary)';
  el.style.setProperty('--toast-color', color);
  el.innerHTML = `<span class="toast-dot"></span><span class="toast-msg"></span>`;
  el.querySelector('.toast-msg').textContent = msg;
  el.hidden = false;
  // Restart animation
  el.classList.remove('toast-in');
  void el.offsetWidth;
  el.classList.add('toast-in');
  clearTimeout(timer);
  timer = setTimeout(() => {
    el.hidden = true;
  }, 2000);
}
