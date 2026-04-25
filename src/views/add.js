import {
  addExpense,
  colorForCategory,
  listExpenses,
  searchByName,
  searchCategories,
} from '../db.js';
import { attachAutocomplete } from '../ui/autocomplete.js';
import { attachColorPicker } from '../ui/color-picker.js';
import { fmtMoney } from '../format.js';
import { DEFAULT_COLOR, colorFor } from '../data.js';
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
            <div class="cat-row">
              <div class="ac-wrap">
                <input id="f-category" class="field-input" type="text" placeholder="Например, Кофе" required />
              </div>
              <div class="color-picker">
                <button type="button" class="swatch-btn" aria-label="Цвет категории"></button>
              </div>
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
  const colorHost = root.querySelector('.color-picker');

  const picker = attachColorPicker(colorHost, {
    initialColor: DEFAULT_COLOR,
    onChange: () => {
      colorTouched = true;
    },
  });
  let colorTouched = false;

  const setColor = (c, { explicit = false } = {}) => {
    picker.setColor(c);
    if (explicit) colorTouched = true;
  };

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
      <div class="ac-item-cat">
        <span class="ac-cat-dot" style="background:${colorFor(it.category, it.color)}"></span>
        ${escapeHtml(it.category)}
      </div>
    `,
    onSelect: (it) => {
      nameInput.value = it.name;
      catInput.value = it.category;
      priceInput.value = String(it.price);
      setColor(colorFor(it.category, it.color), { explicit: true });
      priceInput.focus();
    },
  });

  attachAutocomplete(catInput, {
    fetcher: (q) => searchCategories(q, 8),
    shouldShow: (_value, items) => items.length > 0,
    renderItem: (it) => `
      <div class="ac-cat-row">
        <span class="dot" style="background:${colorFor(it.category, it.color)}"></span>
        <span class="name">${escapeHtml(it.category)}</span>
      </div>
    `,
    onSelect: (it) => {
      catInput.value = it.category;
      setColor(colorFor(it.category, it.color), { explicit: true });
      priceInput.focus();
    },
  });

  // If the user types a category name that exactly matches an existing one,
  // pull in its colour automatically (unless they've explicitly picked a colour).
  let categoryLookup = 0;
  catInput.addEventListener('input', async () => {
    if (colorTouched) return;
    const value = catInput.value.trim();
    const myId = ++categoryLookup;
    const existing = value ? await colorForCategory(value) : null;
    if (myId !== categoryLookup) return;
    picker.setColor(existing || DEFAULT_COLOR);
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

    let color = picker.getColor();
    if (!colorTouched) {
      const existing = await colorForCategory(category);
      if (existing) color = existing;
    }

    await addExpense({ name, category, price, color });
    form.reset();
    colorTouched = false;
    picker.setColor(DEFAULT_COLOR);
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
