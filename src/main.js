import { registerSW } from 'virtual:pwa-register';
import { renderAdd } from './views/add.js';
import { renderHistory } from './views/history.js';
import { renderAnalytics } from './views/analytics.js';
import { renderSettings } from './views/settings.js';

registerSW({ immediate: true });

const view = document.getElementById('view');
const toastEl = document.getElementById('toast');
const tabs = document.querySelectorAll('.tab');

let cleanup = null;
let active = 'add';

const toast = (msg) => {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), 1800);
};

const onDataChange = () => {
  // Re-render analytics only if it's the active view — others query live.
  if (active === 'analytics') navigate('analytics');
};

function navigate(tabName) {
  active = tabName;
  tabs.forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === tabName ? 'true' : 'false'));
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  view.innerHTML = '';
  const ctx = { onDataChange, toast };
  if (tabName === 'add') renderAdd(view, ctx);
  else if (tabName === 'history') renderHistory(view, ctx);
  else if (tabName === 'analytics') cleanup = renderAnalytics(view);
  else if (tabName === 'settings') renderSettings(view, ctx);
}

tabs.forEach((t) => t.addEventListener('click', () => navigate(t.dataset.tab)));
navigate('add');
