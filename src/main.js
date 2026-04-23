import { registerSW } from 'virtual:pwa-register';
import { renderAdd } from './views/add.js';
import { renderHistory } from './views/history.js';
import { renderAnalytics } from './views/analytics.js';
import { renderSettings } from './views/settings.js';

registerSW({ immediate: true });

const TAB_KEY = 'tab';
const view = document.getElementById('view');
const tabs = document.querySelectorAll('.tab');

let cleanup = null;
let active = null;

function navigate(tabName) {
  if (active === tabName) return;
  active = tabName;
  tabs.forEach((t) => {
    const on = t.dataset.tab === tabName;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  view.innerHTML = '';
  view.scrollTop = 0;
  const ctx = { onDataChange };

  if (tabName === 'add') renderAdd(view, ctx);
  else if (tabName === 'history') renderHistory(view, ctx);
  else if (tabName === 'analytics') cleanup = renderAnalytics(view);
  else if (tabName === 'settings') renderSettings(view, ctx);

  try {
    localStorage.setItem(TAB_KEY, tabName);
  } catch {}
}

function onDataChange() {
  if (active === 'analytics') navigate('analytics');
}

tabs.forEach((t) => t.addEventListener('click', () => navigate(t.dataset.tab)));

const initial = (() => {
  try {
    const saved = localStorage.getItem(TAB_KEY);
    if (['add', 'history', 'analytics', 'settings'].includes(saved)) return saved;
  } catch {}
  return 'add';
})();
navigate(initial);
