import { addExpense, listExpenses, searchByName } from '../db.js';
import { attachAutocomplete } from '../ui/autocomplete.js';
import { fmtMoney } from '../format.js';
import { CATEGORIES, CAT_COLORS } from '../data.js';
import { entryRow } from '../ui/entry-row.js';
import { escapeHtml } from '../ui/escape.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';

export function renderAdd(root, { onDataChange }) {
  root.innerHTML = `
    <div class="stack">
      <section class="card">
        <form id="entry-form" novalidate autocomplete="off">
          <div class="field">
            <label class="field-label" for="f-name">Название</label>
            <div class="ac-wrap">
              <input id="f-name" class="field-input" type="text" placeholder="Например, Капучино" required />
            </div>
          </div>
          <div class="field">
            <label class="field-label" for="f-category">Категория</label>
            <div class="ac-wrap">
              <input id="f-category" class="field-input" type="text" placeholder="Например, Продукты" required />
            </div>
          </div>
          <div class="field">
            <label class="field-label" for="f-price">Цена, ₸</label>
            <input id="f-price" class="field-input is-numeric" type="text" inputmode="decimal" placeholder="0" required />
          </div>
          <div id="f-error" class="field-error" hidden></div>
          <div style="margin-top: 14px;">
            <button type="submit" class="btn-primary">${icon('plus', { size: 18, strokeWidth: 2.4 })}Добавить</button>
          </div>
        </form>
      </section>

      <section class="card">
        <div class="card-head">
          <div class="card-title">Недавние</div>
          <div class="card-head-meta" id="recent-meta"></div>
        </div>
        <ul id="recent-list" class="entry-list"></ul>
      </section>
    </div>
  `;

  const nameInput = root.querySelector('#f-name');
  const catInput = root.querySelector('#f-category');
  const priceInput = root.querySelector('#f-price');
  const errEl = root.querySelector('#f-error');
  const form = root.querySelector('#entry-form');
  const recentList = root.querySelector('#recent-list');
  const recentMeta = root.querySelector('#recent-meta');

  const setError = (msg) => {
    if (msg) {
      errEl.textContent = msg;
      errEl.hidden = false;
    } else {
      errEl.hidden = true;
      errEl.textContent = '';
    }
  };

  attachAutocomplete(nameInput, {
    fetcher: (q) => searchByName(q, 5),
    renderItem: (it) => `
      <div class="ac-item-name">
        <span class="name">${escapeHtml(it.name)}</span>
        <span class="price">${fmtMoney(it.price)}</span>
      </div>
      <div class="ac-item-cat">${escapeHtml(it.category)}</div>
    `,
    onSelect: (it) => {
      nameInput.value = it.name;
      catInput.value = it.category;
      priceInput.value = String(it.price);
      priceInput.focus();
    },
  });

  attachAutocomplete(catInput, {
    fetcher: async (q) => {
      const needle = q.trim().toLowerCase();
      return CATEGORIES.filter((c) => !needle || c.toLowerCase().includes(needle));
    },
    shouldShow: (value, list) => {
      if (list.length === 0) return false;
      // Hide popover when the input already matches a canonical category exactly.
      return !CATEGORIES.includes(value.trim());
    },
    renderItem: (c) => `
      <div class="ac-cat-row">
        <span class="dot" style="background:${CAT_COLORS[c]}"></span>
        <span class="name">${escapeHtml(c)}</span>
      </div>
    `,
    onSelect: (c) => {
      catInput.value = c;
      priceInput.focus();
    },
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const category = catInput.value.trim();
    const priceRaw = priceInput.value.replace(',', '.');
    const price = parseFloat(priceRaw);
    if (!name) return setError('Укажите название');
    if (!category) return setError('Укажите категорию');
    if (!Number.isFinite(price) || price <= 0) return setError('Укажите цену');
    setError('');
    await addExpense({ name, category, price });
    form.reset();
    nameInput.focus();
    toast('Добавлено.', 'ok');
    await refreshRecent();
    onDataChange?.();
  });

  async function refreshRecent() {
    const rows = (await listExpenses()).slice(0, 6);
    recentMeta.textContent = rows.length ? `последние ${rows.length}` : '';
    if (rows.length === 0) {
      recentList.innerHTML = `<li class="empty">Пока ничего нет</li>`;
      return;
    }
    recentList.innerHTML = rows.map((r) => entryRow(r, { compact: true })).join('');
  }

  refreshRecent();
}
